/*
  # Fix Auth Synchronization

  1. Changes
    - Add trigger to ensure auth user exists before profile creation
    - Add function to sync auth user with profile
    - Add function to handle test accounts properly
    - Add indexes for better performance

  2. Security
    - All functions are SECURITY DEFINER
    - Proper error handling and validation
    - Secure search path settings
*/

-- First ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to ensure auth user exists
CREATE OR REPLACE FUNCTION public.ensure_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user auth.users%ROWTYPE;
BEGIN
  -- Check if auth user exists
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE id = NEW.id;

  -- If no auth user exists and this is a test account, create one
  IF v_auth_user IS NULL AND NEW.email IN ('patient@test.com', 'provider@test.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      NEW.email,
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'name', NEW.name,
        'role', NEW.role
      ),
      NOW(),
      NOW()
    );
    
    -- Re-fetch the auth user
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = NEW.id;
  END IF;

  -- If still no auth user, raise an error
  IF v_auth_user IS NULL THEN
    RAISE EXCEPTION 'No corresponding auth.users record found for profile with ID %', NEW.id;
  END IF;

  -- Sync metadata if needed
  IF v_auth_user.raw_user_meta_data IS NULL OR v_auth_user.raw_user_meta_data = '{}'::jsonb THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'name', NEW.name,
      'role', NEW.role
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error ensuring auth user exists: %', SQLERRM;
END;
$$;

-- Trigger to ensure auth user exists before profile creation
DROP TRIGGER IF EXISTS ensure_auth_user_trigger ON public.profiles;
CREATE TRIGGER ensure_auth_user_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_auth_user();

-- Function to sync profile changes to auth
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync profile changes to auth user metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'name', NEW.name,
    'role', NEW.role,
    'lastSync', extract(epoch from now())
  )
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error syncing profile to auth: %', SQLERRM;
END;
$$;

-- Trigger to sync profile changes to auth
DROP TRIGGER IF EXISTS sync_profile_to_auth_trigger ON public.profiles;
CREATE TRIGGER sync_profile_to_auth_trigger
  AFTER UPDATE OF name, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth();

-- Add helper function to check auth status
CREATE OR REPLACE FUNCTION public.check_auth_status(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_auth', EXISTS (SELECT 1 FROM auth.users WHERE id = user_id),
    'has_profile', EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id),
    'email_confirmed', EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = user_id AND email_confirmed_at IS NOT NULL
    ),
    'last_sign_in', (
      SELECT last_sign_in_at 
      FROM auth.users 
      WHERE id = user_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup 
  ON public.profiles(id, email, role);

CREATE INDEX IF NOT EXISTS idx_auth_users_lookup 
  ON auth.users(id, email, email_confirmed_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;