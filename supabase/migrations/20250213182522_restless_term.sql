/*
  # Fix RLS Policies

  1. Changes
    - Fix infinite recursion in profile policies
    - Simplify RLS policies to avoid circular references
    - Add proper test account access
    - Add proper provider-patient relationship access

  2. Security
    - Maintain proper access control
    - Fix policy recursion issues
    - Ensure test accounts work properly
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Provider details access" ON public.provider_details;
DROP POLICY IF EXISTS "Patient-provider relationship access" ON public.patient_providers;
DROP POLICY IF EXISTS "Check-ins access" ON public.check_ins;

-- Create base profile access policy
CREATE POLICY "Base profile access"
  ON public.profiles
  FOR SELECT
  USING (
    -- Direct access for own profile
    auth.uid() = id
    -- Test account access
    OR email IN ('patient@test.com', 'provider@test.com')
  );

-- Create separate policy for provider-patient relationship
CREATE POLICY "Provider-patient profile access"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE (provider_id = auth.uid() AND patient_id = profiles.id)
      OR (patient_id = auth.uid() AND provider_id = profiles.id)
      AND status = 'active'
    )
  );

-- Profile modification policies
CREATE POLICY "Profile self update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profile self insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Provider details policies
CREATE POLICY "Provider details self access"
  ON public.provider_details
  FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Provider details relationship access"
  ON public.provider_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE patient_id = auth.uid()
      AND provider_id = provider_details.provider_id
      AND status = 'active'
    )
  );

CREATE POLICY "Provider details test access"
  ON public.provider_details
  FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  );

-- Patient-provider relationship policies
CREATE POLICY "Patient-provider self access"
  ON public.patient_providers
  FOR ALL
  USING (auth.uid() IN (patient_id, provider_id))
  WITH CHECK (auth.uid() IN (patient_id, provider_id));

CREATE POLICY "Patient-provider test access"
  ON public.patient_providers
  FOR ALL
  USING (
    patient_id IN (SELECT id FROM public.profiles WHERE email IN ('patient@test.com', 'provider@test.com'))
    OR provider_id IN (SELECT id FROM public.profiles WHERE email IN ('patient@test.com', 'provider@test.com'))
  )
  WITH CHECK (
    patient_id IN (SELECT id FROM public.profiles WHERE email IN ('patient@test.com', 'provider@test.com'))
    OR provider_id IN (SELECT id FROM public.profiles WHERE email IN ('patient@test.com', 'provider@test.com'))
  );

-- Check-ins policies
CREATE POLICY "Check-ins self access"
  ON public.check_ins
  FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Check-ins provider access"
  ON public.check_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id = check_ins.patient_id
      AND status = 'active'
    )
  );

-- Add indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_patient_providers_status ON public.patient_providers(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_check_ins_patient_id ON public.check_ins(patient_id);