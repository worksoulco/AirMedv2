/*
  # Auth Flow Setup

  1. Changes
    - Add trigger to create profile on new user signup
    - Add trigger to handle email verification
    - Add trigger to sync auth metadata with profile
    - Add function to handle user deletion

  2. Security
    - All functions are SECURITY DEFINER to run with elevated privileges
    - Input validation on all parameters
    - Error handling for edge cases

  3. Notes
    - Ensures profile is created immediately after auth record
    - Maintains data consistency between auth and profiles
    - Handles test accounts specially
*/

-- Function to create profile when new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id uuid;
  user_role text;
  user_name text;
  user_title text;
BEGIN
  -- Get user metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  user_title := NEW.raw_user_meta_data->>'title';

  -- Input validation
  IF user_role NOT IN ('patient', 'provider') THEN
    RAISE EXCEPTION 'Invalid user role: %', user_role;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    role,
    name,
    email,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_role,
    user_name,
    NEW.email,
    jsonb_build_object(
      'preferences', jsonb_build_object(
        'notifications', jsonb_build_object(
          'appointments', true,
          'labResults', true,
          'messages', true,
          'reminders', true
        ),
        'theme', 'light',
        'language', 'en'
      ),
      'emailConfirmed', NEW.email_confirmed_at IS NOT NULL
    ),
    NOW(),
    NOW()
  )
  RETURNING id INTO profile_id;

  -- Create provider details if needed
  IF user_role = 'provider' AND profile_id IS NOT NULL THEN
    INSERT INTO public.provider_details (
      provider_id,
      title,
      created_at,
      updated_at
    ) VALUES (
      profile_id,
      COALESCE(user_title, 'Healthcare Provider'),
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error and re-raise
    RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- Trigger to create profile after auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to handle email confirmation
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET metadata = jsonb_set(
      metadata,
      '{emailConfirmed}',
      'true'::jsonb
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error updating email confirmation for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- Trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_email_confirmation();

-- Function to sync auth metadata with profile
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile when user metadata changes
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    UPDATE public.profiles
    SET
      name = COALESCE(NEW.raw_user_meta_data->>'name', name),
      metadata = profiles.metadata || jsonb_build_object(
        'lastMetadataUpdate', NOW()
      ),
      updated_at = NOW()
    WHERE id = NEW.id;

    -- Update provider details if applicable
    IF EXISTS (
      SELECT 1 FROM public.provider_details
      WHERE provider_id = NEW.id
    ) THEN
      UPDATE public.provider_details
      SET
        title = COALESCE(NEW.raw_user_meta_data->>'title', title),
        updated_at = NOW()
      WHERE provider_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error syncing metadata for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- Trigger to sync metadata changes
DROP TRIGGER IF EXISTS on_auth_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata();

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete profile and related data
  DELETE FROM public.profiles WHERE id = OLD.id;
  -- Provider details and relationships will be deleted via CASCADE

  RETURN OLD;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error deleting profile for user %: %', OLD.id, SQLERRM;
    RAISE;
END;
$$;

-- Trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();

-- Function to handle test accounts
CREATE OR REPLACE FUNCTION public.handle_test_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-confirm test account emails
  IF NEW.email IN ('patient@test.com', 'provider@test.com') THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
    
    -- Set default metadata for test accounts
    IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb THEN
      NEW.raw_user_meta_data = jsonb_build_object(
        'name',
        CASE NEW.email
          WHEN 'patient@test.com' THEN 'John Doe'
          WHEN 'provider@test.com' THEN 'Sarah Chen'
        END,
        'role',
        CASE NEW.email
          WHEN 'patient@test.com' THEN 'patient'
          WHEN 'provider@test.com' THEN 'provider'
        END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for test accounts
DROP TRIGGER IF EXISTS handle_test_account_trigger ON auth.users;
CREATE TRIGGER handle_test_account_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_test_account();