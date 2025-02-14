/*
  # Check-in Schema Updates

  1. Updates
    - Add indexes for check-in queries
    - Add metadata fields for device info and location
    - Add constraints for data validation

  2. Security
    - Update RLS policies for check-ins
    - Add policies for aggregated data access
*/

-- Add additional metadata fields to check_ins
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS device_info jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS location jsonb DEFAULT '{}'::jsonb;

-- Add validation constraints
ALTER TABLE public.check_ins
ADD CONSTRAINT check_mood_values CHECK (
  mood IN ('😊', '🙂', '😐', '😕')
),
ADD CONSTRAINT check_sleep_values CHECK (sleep >= 1 AND sleep <= 5),
ADD CONSTRAINT check_stress_values CHECK (stress >= 1 AND stress <= 5),
ADD CONSTRAINT check_energy_values CHECK (energy >= 1 AND energy <= 5);

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_check_ins_date_range 
ON public.check_ins (patient_id, date DESC);

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_check_ins_metrics 
ON public.check_ins (patient_id, date, mood, sleep, stress, energy);

-- Function to calculate average metrics
CREATE OR REPLACE FUNCTION get_patient_metrics(
  p_patient_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  avg_sleep numeric,
  avg_stress numeric,
  avg_energy numeric,
  mood_distribution jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH mood_counts AS (
    SELECT 
      mood,
      COUNT(*) as count
    FROM check_ins
    WHERE patient_id = p_patient_id
    AND date BETWEEN p_start_date AND p_end_date
    GROUP BY mood
  )
  SELECT
    ROUND(AVG(sleep)::numeric, 2) as avg_sleep,
    ROUND(AVG(stress)::numeric, 2) as avg_stress,
    ROUND(AVG(energy)::numeric, 2) as avg_energy,
    jsonb_object_agg(mood, count) as mood_distribution
  FROM check_ins, mood_counts
  WHERE patient_id = p_patient_id
  AND date BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Update RLS policies
DROP POLICY IF EXISTS "Providers can view aggregated check-in data" ON check_ins;
CREATE POLICY "Providers can view aggregated check-in data"
ON check_ins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = check_ins.patient_id
    AND status = 'active'
  )
);

-- Add policy for inserting check-ins
DROP POLICY IF EXISTS "Patients can insert own check-ins" ON check_ins;
CREATE POLICY "Patients can insert own check-ins"
ON check_ins
FOR INSERT
WITH CHECK (
  auth.uid() = patient_id
);

-- Add policy for updating check-ins
DROP POLICY IF EXISTS "Patients can update own check-ins" ON check_ins;
CREATE POLICY "Patients can update own check-ins"
ON check_ins
FOR UPDATE
USING (
  auth.uid() = patient_id
  AND date >= CURRENT_DATE - INTERVAL '7 days'
);