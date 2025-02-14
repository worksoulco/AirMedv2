/*
  # Create test accounts

  1. New Data
    - Create test auth users with proper permissions
    - Add test patient and provider profiles
    - Add provider details
  
  2. Security
    - Uses proper foreign key relationships
    - Handles conflicts gracefully
    - Ensures proper auth schema access
*/

-- First check if users exist and delete them if they do
DO $$
BEGIN
  -- Delete existing test accounts to avoid conflicts
  DELETE FROM auth.users WHERE email IN ('patient@test.com', 'provider@test.com');
  DELETE FROM public.profiles WHERE email IN ('patient@test.com', 'provider@test.com');
END $$;

-- Create test accounts with proper auth schema access
BEGIN;

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
  metadata
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
  )
);

INSERT INTO public.profiles (
  id,
  role,
  name,
  email,
  phone,
  photo_url
) VALUES (
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'provider',
  'Sarah Chen',
  'provider@test.com',
  '(555) 234-5678',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300'
);

-- Add provider details
INSERT INTO public.provider_details (
  provider_id,
  title,
  specialties,
  npi,
  facility_name,
  facility_address,
  facility_phone
) VALUES (
  '987fcdeb-51a2-43d7-9b56-871cd1234567'::uuid,
  'Primary Care Physician',
  ARRAY['Internal Medicine', 'Preventive Care'],
  '1234567890',
  'HealthCare Medical Center',
  '123 Medical Dr, Healthcare City, HC 12345',
  '(555) 987-6543'
);

COMMIT;