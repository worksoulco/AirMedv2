-- Drop existing foreign key constraints
ALTER TABLE patient_providers
DROP CONSTRAINT IF EXISTS patient_providers_patient_id_fkey,
DROP CONSTRAINT IF EXISTS patient_providers_provider_id_fkey;

-- Add new foreign key constraints to profiles table
ALTER TABLE patient_providers
ADD CONSTRAINT patient_providers_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT patient_providers_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update RLS policies to use profiles
DROP POLICY IF EXISTS "Providers can view their patient connections" ON patient_providers;
DROP POLICY IF EXISTS "Patients can view their provider connections" ON patient_providers;

CREATE POLICY "Providers can view their patient connections"
  ON patient_providers FOR SELECT
  USING (provider_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Patients can view their provider connections"
  ON patient_providers FOR SELECT
  USING (patient_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ));
