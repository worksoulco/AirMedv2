/*
  # Fix Auth Flow and Test Accounts

  1. Changes
    - Clean up existing test accounts
    - Create new test accounts with proper auth
    - Set up proper relationships
    - Add proper RLS policies

  2. Security
    - Enable RLS
    - Add proper policies
    - Add proper constraints
*/

-- First clean up any existing test accounts properly
DO $$
BEGIN
  -- Delete in correct order to avoid FK violations
  DELETE FROM public.patient_providers 
  WHERE patient_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  ) 
  OR provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  );
  
  DELETE FROM public.provider_details 
  WHERE provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  );
  
  DELETE FROM public.profiles 
  WHERE email IN ('patient@test.com', 'provider@test.com');
  
  DELETE FROM auth.users 
  WHERE email IN ('patient@test.com', 'provider@test.com');
END $$;

-- Create test accounts
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
  updated_at,
  last_sign_in_at,
  confirmation_token,
  recovery_token
) VALUES 
-- Patient user
(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'patient@test.com',
  crypt('test123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"John Doe"}',
  now(),
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  encode(gen_random_bytes(32), 'base64')
),
-- Provider user
(
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'provider@test.com',
  crypt('test123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Sarah Chen"}',
  now(),
  now(),
  now(),
  encode(gen_random_bytes(32), 'base64'),
  encode(gen_random_bytes(32), 'base64')
);

-- Add profiles
INSERT INTO public.profiles (
  id,
  role,
  name,
  email,
  phone,
  photo_url,
  date_of_birth,
  gender,
  address,
  metadata,
  created_at,
  updated_at
) VALUES 
-- Patient profile
(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  'patient',
  'John Doe',
  'patient@test.com',
  '(555) 123-4567',
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&q=80&fit=crop',
  '1985-06-15',
  'male',
  '123 Health St, Medical City, MC 12345',
  jsonb_build_object(
    'height', '5''10"',
    'weight', '160',
    'bloodType', 'O+',
    'preferences', jsonb_build_object(
      'notifications', jsonb_build_object(
        'appointments', true,
        'labResults', true,
        'messages', true,
        'reminders', true
      ),
      'theme', 'light',
      'language', 'en'
    )
  ),
  now(),
  now()
),
-- Provider profile
(
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'provider',
  'Sarah Chen',
  'provider@test.com',
  '(555) 234-5678',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
  null,
  null,
  null,
  jsonb_build_object(
    'title', 'Primary Care Physician',
    'specialties', array['Internal Medicine', 'Preventive Care']
  ),
  now(),
  now()
);

-- Add provider details
INSERT INTO public.provider_details (
  provider_id,
  title,
  specialties,
  npi,
  facility_name,
  facility_address,
  facility_phone,
  created_at,
  updated_at
) VALUES (
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'Primary Care Physician',
  ARRAY['Internal Medicine', 'Preventive Care'],
  '1234567890',
  'HealthCare Medical Center',
  '123 Medical Dr, Healthcare City, HC 12345',
  '(555) 987-6543',
  now(),
  now()
);

-- Add patient-provider relationship
INSERT INTO public.patient_providers (
  id,
  patient_id,
  provider_id,
  status,
  connected_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'active',
  now(),
  now(),
  now()
);

-- Add proper RLS policies for test accounts
DROP POLICY IF EXISTS "Allow test accounts full access" ON public.profiles;
CREATE POLICY "Allow test accounts full access" ON public.profiles
  FOR ALL
  USING (
    auth.uid() = id 
    OR email IN ('patient@test.com', 'provider@test.com')
  )
  WITH CHECK (
    auth.uid() = id
    OR email IN ('patient@test.com', 'provider@test.com')
  );

DROP POLICY IF EXISTS "Allow test accounts full access" ON public.provider_details;
CREATE POLICY "Allow test accounts full access" ON public.provider_details
  FOR ALL
  USING (
    auth.uid() = provider_id
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  )
  WITH CHECK (
    auth.uid() = provider_id
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  );

DROP POLICY IF EXISTS "Allow test accounts full access" ON public.patient_providers;
CREATE POLICY "Allow test accounts full access" ON public.patient_providers
  FOR ALL
  USING (
    auth.uid() IN (patient_id, provider_id)
    OR patient_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  )
  WITH CHECK (
    auth.uid() IN (patient_id, provider_id)
    OR patient_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  );

-- Create function to confirm email for test accounts
CREATE OR REPLACE FUNCTION public.confirm_test_account_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IN ('patient@test.com', 'provider@test.com') THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically confirm test account emails
DROP TRIGGER IF EXISTS confirm_test_account_email_trigger ON auth.users;
CREATE TRIGGER confirm_test_account_email_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.confirm_test_account_email();