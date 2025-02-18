/*
  # Create Lab Results Table

  1. New Table
    - `lab_results` - For storing biomarker data from lab reports
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `provider_id` (uuid, references profiles, optional)
      - `name` (text) - Biomarker name
      - `value` (numeric) - Measured value
      - `unit` (text) - Unit of measurement
      - `reference_range` (text) - Normal range
      - `status` (text) - normal, high, low
      - `category` (text) - CBC, Metabolic, Lipids, etc.
      - `date` (timestamptz) - When the test was performed
      - `metadata` (jsonb) - Additional data like method, performer, etc.

  2. Security
    - Enable RLS
    - Add policies for secure access
    - Add performance indexes
*/

-- Create lab_results table
CREATE TABLE IF NOT EXISTS public.lab_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  reference_range text NOT NULL,
  status text NOT NULL CHECK (status IN ('normal', 'high', 'low')),
  category text NOT NULL,
  date timestamptz NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "lab_results_self_access"
ON public.lab_results
FOR ALL
USING (
  auth.uid() = patient_id
)
WITH CHECK (
  auth.uid() = patient_id
);

CREATE POLICY "lab_results_provider_access"
ON public.lab_results
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = lab_results.patient_id
    AND status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = lab_results.patient_id
    AND status = 'active'
  )
);

-- Add indexes for better query performance
CREATE INDEX idx_lab_results_patient_date ON public.lab_results(patient_id, date DESC);
CREATE INDEX idx_lab_results_provider ON public.lab_results(provider_id);
CREATE INDEX idx_lab_results_category ON public.lab_results(category);
CREATE INDEX idx_lab_results_name ON public.lab_results(name);

-- Add trigger for updated_at
CREATE TRIGGER set_lab_results_timestamp
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.lab_results TO authenticated;

-- Add function to clean up old lab results
CREATE OR REPLACE FUNCTION public.cleanup_old_lab_results(days integer DEFAULT 365)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lab_results
  WHERE date < now() - (days || ' days')::interval;
END;
$$;
