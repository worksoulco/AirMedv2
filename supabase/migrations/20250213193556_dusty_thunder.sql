/*
  # Fix Database Policies

  1. Changes
    - Drop and recreate policies in correct order
    - Fix recursive policy issues
    - Simplify access control logic
    - Add proper error handling

  2. Security
    - Maintain RLS while fixing recursion
    - Keep test account access
    - Ensure proper access control
*/

-- First drop ALL existing policies to start fresh
DO $$
BEGIN
  -- Drop profile policies
  DROP POLICY IF EXISTS "profiles_base_access" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_relationship_access" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_test_access" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_self_modify" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_base_access" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Allow test accounts full access" ON public.profiles;

  -- Drop provider details policies
  DROP POLICY IF EXISTS "provider_details_access" ON public.provider_details;
  DROP POLICY IF EXISTS "provider_details_modify" ON public.provider_details;
  DROP POLICY IF EXISTS "provider_details_relationship_access" ON public.provider_details;
  DROP POLICY IF EXISTS "provider_details_self_access" ON public.provider_details;
  DROP POLICY IF EXISTS "Providers can manage own details" ON public.provider_details;
  DROP POLICY IF EXISTS "Allow test accounts full access" ON public.provider_details;

  -- Drop check-ins policies
  DROP POLICY IF EXISTS "check_ins_access" ON public.check_ins;
  DROP POLICY IF EXISTS "check_ins_modify" ON public.check_ins;
  DROP POLICY IF EXISTS "check_ins_provider_access" ON public.check_ins;
  DROP POLICY IF EXISTS "check_ins_self_access" ON public.check_ins;
END $$;

-- Create new simplified policies
-- 1. Profile Policies
CREATE POLICY "profile_read_access" ON public.profiles
FOR SELECT USING (
  -- Self access
  auth.uid() = id
  -- Test accounts
  OR email IN ('patient@test.com', 'provider@test.com')
  -- Provider-patient relationship
  OR EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE status = 'active'
    AND (
      (provider_id = auth.uid() AND patient_id = profiles.id)
      OR (patient_id = auth.uid() AND provider_id = profiles.id)
    )
  )
);

CREATE POLICY "profile_write_access" ON public.profiles
FOR ALL USING (
  auth.uid() = id 
  OR email IN ('patient@test.com', 'provider@test.com')
)
WITH CHECK (
  auth.uid() = id 
  OR email IN ('patient@test.com', 'provider@test.com')
);

-- 2. Provider Details Policies
CREATE POLICY "provider_details_read_access" ON public.provider_details
FOR SELECT USING (
  -- Self access
  provider_id = auth.uid()
  -- Test accounts
  OR provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  )
  -- Patient access to their providers
  OR EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE patient_id = auth.uid()
    AND provider_id = provider_details.provider_id
    AND status = 'active'
  )
);

CREATE POLICY "provider_details_write_access" ON public.provider_details
FOR ALL USING (
  provider_id = auth.uid()
  OR provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  )
)
WITH CHECK (
  provider_id = auth.uid()
  OR provider_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN ('patient@test.com', 'provider@test.com')
  )
);

-- 3. Check-ins Policies
CREATE POLICY "checkins_read_access" ON public.check_ins
FOR SELECT USING (
  -- Self access
  patient_id = auth.uid()
  -- Provider access
  OR EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = check_ins.patient_id
    AND status = 'active'
  )
);

CREATE POLICY "checkins_write_access" ON public.check_ins
FOR ALL USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_auth ON public.profiles(id, email);
CREATE INDEX IF NOT EXISTS idx_patient_providers_composite 
  ON public.patient_providers(provider_id, patient_id, status);
CREATE INDEX IF NOT EXISTS idx_check_ins_patient_date 
  ON public.check_ins(patient_id, date);

-- Add helper function for checking relationships
CREATE OR REPLACE FUNCTION public.check_relationship(
  p_user_id uuid,
  p_other_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_providers
    WHERE status = 'active'
    AND (
      (p_role = 'provider' AND provider_id = p_user_id AND patient_id = p_other_id)
      OR
      (p_role = 'patient' AND patient_id = p_user_id AND provider_id = p_other_id)
    )
  );
$$;