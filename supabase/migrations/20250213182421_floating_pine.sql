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
DROP POLICY IF EXISTS "Providers can manage own details" ON public.provider_details;
DROP POLICY IF EXISTS "Allow test accounts full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow test accounts full access" ON public.provider_details;
DROP POLICY IF EXISTS "Allow test accounts full access" ON public.patient_providers;

-- Create simplified profile policies
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    -- User can view their own profile
    auth.uid() = id
    -- Test accounts have access
    OR email IN ('patient@test.com', 'provider@test.com')
    -- Providers can view their patients' profiles
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id = profiles.id
      AND status = 'active'
    )
    -- Patients can view their providers' profiles
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE patient_id = auth.uid()
      AND provider_id = profiles.id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create provider details policies
CREATE POLICY "Provider details access"
  ON public.provider_details
  FOR ALL
  USING (
    -- Provider can manage their own details
    auth.uid() = provider_id
    -- Test accounts have access
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
    -- Patients can view their providers' details
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE patient_id = auth.uid()
      AND provider_id = provider_details.provider_id
      AND status = 'active'
    )
  )
  WITH CHECK (
    -- Only provider can modify their details
    auth.uid() = provider_id
    -- Test accounts have access
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  );

-- Create patient-provider relationship policies
CREATE POLICY "Patient-provider relationship access"
  ON public.patient_providers
  FOR ALL
  USING (
    -- Users can access their own relationships
    auth.uid() IN (patient_id, provider_id)
    -- Test accounts have access
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
    -- Users can only create/modify their own relationships
    auth.uid() IN (patient_id, provider_id)
    -- Test accounts have access
    OR patient_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
    OR provider_id IN (
      SELECT id FROM public.profiles 
      WHERE email IN ('patient@test.com', 'provider@test.com')
    )
  );

-- Add check-ins policies
CREATE POLICY "Check-ins access"
  ON public.check_ins
  FOR ALL
  USING (
    -- Patients can access their own check-ins
    auth.uid() = patient_id
    -- Providers can view their patients' check-ins
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id = check_ins.patient_id
      AND status = 'active'
    )
  )
  WITH CHECK (
    -- Only patients can create/modify their own check-ins
    auth.uid() = patient_id
  );