/*
  # Initialize test accounts and schema

  1. Schema Changes
    - Delete existing test data in correct order
    - Create test users in auth schema
    - Create profiles for test users
    - Add provider details

  2. Security
    - Ensure proper foreign key relationships
    - Handle deletion order to avoid constraint violations
*/

-- Create test accounts with proper auth schema access
BEGIN;

-- First delete data in the correct order to avoid foreign key violations
DO $$
BEGIN
  -- Delete provider details first
  DELETE FROM public.provider_details 
  WHERE provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  );
  
  -- Delete patient-provider relationships
  DELETE FROM public.patient_providers 
  WHERE patient_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  ) 
  OR provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  );
  
  -- Delete profiles
  DELETE FROM public.profiles 
  WHERE email IN ('patient@test.com', 'provider@test.com');
  
  -- Finally delete auth users
  DELETE FROM auth.users 
  WHERE email IN ('patient@test.com', 'provider@test.com');
END $$;

-- Create test users in auth schema
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
  now()
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
  now()
);

-- Now add the profiles
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
) VALUES (
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
);

INSERT INTO public.profiles (
  id,
  role,
  name,
  email,
  phone,
  photo_url,
  created_at,
  updated_at
) VALUES (
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'provider',
  'Sarah Chen',
  'provider@test.com',
  '(555) 234-5678',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
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
  patient_id,
  provider_id,
  status,
  connected_at,
  created_at,
  updated_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'active',
  now(),
  now(),
  now()
);

COMMIT;