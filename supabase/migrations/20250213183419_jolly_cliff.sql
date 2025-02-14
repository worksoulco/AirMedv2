/*
  # Fix Authentication Flow

  1. Changes
    - Simplify profile access policies to prevent recursion
    - Add direct test account access
    - Fix relationship-based access
    - Add proper error handling to auth functions
    - Add missing indexes for performance

  2. Security
    - Maintain RLS while fixing recursion issues
    - Keep test account special handling
    - Ensure proper access control
*/

-- Drop problematic policies that may cause recursion
DROP POLICY IF EXISTS "profiles_relationship_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_test_access" ON public.profiles;

-- Create simplified profile access policies
CREATE POLICY "profiles_base_access"
  ON public.profiles
  FOR SELECT
  USING (
    -- Direct self access
    id = auth.uid()
    -- Test account access
    OR email IN ('patient@test.com', 'provider@test.com')
    -- Direct relationship access via patient_providers
    OR id IN (
      SELECT patient_id FROM public.patient_providers 
      WHERE provider_id = auth.uid() AND status = 'active'
    )
    OR id IN (
      SELECT provider_id FROM public.patient_providers 
      WHERE patient_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "profiles_self_modify"
  ON public.profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Update provider details policies
DROP POLICY IF EXISTS "provider_details_relationship_access" ON public.provider_details;
DROP POLICY IF EXISTS "provider_details_self_access" ON public.provider_details;

CREATE POLICY "provider_details_access"
  ON public.provider_details
  FOR SELECT
  USING (
    -- Direct self access
    provider_id = auth.uid()
    -- Test account access
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
    -- Direct relationship access
    OR provider_id IN (
      SELECT provider_id FROM public.patient_providers 
      WHERE patient_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "provider_details_modify"
  ON public.provider_details
  FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Update check-ins policies
DROP POLICY IF EXISTS "check_ins_provider_access" ON public.check_ins;
DROP POLICY IF EXISTS "check_ins_self_access" ON public.check_ins;

CREATE POLICY "check_ins_access"
  ON public.check_ins
  FOR SELECT
  USING (
    -- Self access
    patient_id = auth.uid()
    -- Provider access via direct relationship
    OR patient_id IN (
      SELECT patient_id FROM public.patient_providers 
      WHERE provider_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "check_ins_modify"
  ON public.check_ins
  FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth ON public.profiles(id, email);
CREATE INDEX IF NOT EXISTS idx_patient_providers_composite 
  ON public.patient_providers(provider_id, patient_id, status);
CREATE INDEX IF NOT EXISTS idx_check_ins_patient_date 
  ON public.check_ins(patient_id, date);

-- Update user creation function with better error handling
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
  -- Input validation with detailed errors
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'Email cannot be null';
  END IF;

  -- Get user metadata with validation
  BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_title := NEW.raw_user_meta_data->>'title';

    IF user_role NOT IN ('patient', 'provider') THEN
      RAISE EXCEPTION 'Invalid user role: %', user_role;
    END IF;

    -- Special handling for test accounts
    IF NEW.email IN ('patient@test.com', 'provider@test.com') THEN
      user_role := CASE NEW.email
        WHEN 'patient@test.com' THEN 'patient'
        WHEN 'provider@test.com' THEN 'provider'
      END;
      user_name := CASE NEW.email
        WHEN 'patient@test.com' THEN 'John Doe'
        WHEN 'provider@test.com' THEN 'Sarah Chen'
      END;
    END IF;

    -- Create profile with error handling
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
    WHEN unique_violation THEN
      RAISE EXCEPTION 'User with email % already exists', NEW.email;
    WHEN check_violation THEN
      RAISE EXCEPTION 'Invalid data provided for user creation';
    WHEN others THEN
      RAISE EXCEPTION 'Error creating user profile: %', SQLERRM;
  END;
END;
$$;

-- Update email confirmation function with better error handling
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET 
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{emailConfirmed}',
        'true'::jsonb
      ),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error updating email confirmation: %', SQLERRM;
END;
$$;

-- Update test account handling
CREATE OR REPLACE FUNCTION public.handle_test_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('patient@test.com', 'provider@test.com') THEN
    -- Auto-confirm test account emails
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
    
    -- Set metadata for test accounts if not already set
    IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb THEN
      NEW.raw_user_meta_data := jsonb_build_object(
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
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error handling test account: %', SQLERRM;
END;
$$;