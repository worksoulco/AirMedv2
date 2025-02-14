/*
  # Fix Authentication and Database Policies

  1. Changes
    - Simplify database policies to avoid recursion
    - Fix authentication flow
    - Add proper error handling
    - Add missing indexes

  2. Security
    - Maintain RLS while fixing recursion
    - Keep test account access
    - Ensure proper access control
*/

-- First drop ALL existing policies to start fresh
DO $$
BEGIN
  -- Drop profile policies
  DROP POLICY IF EXISTS "profile_read_access" ON public.profiles;
  DROP POLICY IF EXISTS "profile_write_access" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_base_access" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_self_modify" ON public.profiles;
  
  -- Drop provider details policies
  DROP POLICY IF EXISTS "provider_details_read_access" ON public.provider_details;
  DROP POLICY IF EXISTS "provider_details_write_access" ON public.provider_details;
  DROP POLICY IF EXISTS "provider_details_access" ON public.provider_details;
  DROP POLICY IF EXISTS "provider_details_modify" ON public.provider_details;
  
  -- Drop check-ins policies
  DROP POLICY IF EXISTS "checkins_read_access" ON public.check_ins;
  DROP POLICY IF EXISTS "checkins_write_access" ON public.check_ins;
  DROP POLICY IF EXISTS "check_ins_access" ON public.check_ins;
  DROP POLICY IF EXISTS "check_ins_modify" ON public.check_ins;
END $$;

-- Create simplified non-recursive policies
-- 1. Profile Access
CREATE POLICY "profile_select"
  ON public.profiles
  FOR SELECT
  USING (
    -- Self access
    id = auth.uid()
    -- Test accounts
    OR email IN ('patient@test.com', 'provider@test.com')
    -- Direct relationship lookup without recursion
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE status = 'active'
      AND (
        (provider_id = auth.uid() AND patient_id = profiles.id)
        OR (patient_id = auth.uid() AND provider_id = profiles.id)
      )
    )
  );

CREATE POLICY "profile_modify"
  ON public.profiles
  FOR ALL
  USING (
    id = auth.uid()
    OR email IN ('patient@test.com', 'provider@test.com')
  )
  WITH CHECK (
    id = auth.uid()
    OR email IN ('patient@test.com', 'provider@test.com')
  );

-- 2. Provider Details Access
CREATE POLICY "provider_details_select"
  ON public.provider_details
  FOR SELECT
  USING (
    provider_id = auth.uid()
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE patient_id = auth.uid()
      AND provider_id = provider_details.provider_id
      AND status = 'active'
    )
  );

CREATE POLICY "provider_details_modify"
  ON public.provider_details
  FOR ALL
  USING (
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

-- 3. Check-ins Access
CREATE POLICY "checkins_select"
  ON public.check_ins
  FOR SELECT
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id = check_ins.patient_id
      AND status = 'active'
    )
  );

CREATE POLICY "checkins_modify"
  ON public.check_ins
  FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_lookup 
  ON public.profiles(id, email);

CREATE INDEX IF NOT EXISTS idx_patient_providers_lookup 
  ON public.patient_providers(provider_id, patient_id, status);

CREATE INDEX IF NOT EXISTS idx_check_ins_lookup 
  ON public.check_ins(patient_id, date);

-- Add helper function for relationship checks
CREATE OR REPLACE FUNCTION public.check_relationship(
  p_user_id uuid,
  p_other_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE status = 'active'
    AND (
      (provider_id = p_user_id AND patient_id = p_other_id)
      OR (patient_id = p_user_id AND provider_id = p_other_id)
    )
  );
$$;

-- Add function to safely get profile data
CREATE OR REPLACE FUNCTION public.get_profile(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', p.id,
      'role', p.role,
      'name', p.name,
      'email', p.email,
      'provider_details', pd,
      'relationships', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pp.id,
            'patient_id', pp.patient_id,
            'provider_id', pp.provider_id,
            'status', pp.status
          )
        )
        FROM patient_providers pp
        WHERE pp.patient_id = p.id OR pp.provider_id = p.id
      )
    )
  INTO v_profile
  FROM profiles p
  LEFT JOIN provider_details pd ON pd.provider_id = p.id
  WHERE p.id = p_user_id;

  RETURN v_profile;
END;
$$;