/*
  # Fix patient metrics query

  1. Changes
    - Fix GROUP BY clause issue in get_patient_metrics function
    - Improve query structure for better performance
    - Add error handling and validation
    - Add indexes for better performance
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_patient_metrics;

-- Create updated function with fixed query
CREATE OR REPLACE FUNCTION get_patient_metrics(
  p_patient_id uuid,
  p_start_date date,
  p_end_date date
) 
RETURNS TABLE (
  avg_sleep numeric,
  avg_stress numeric,
  avg_energy numeric,
  mood_distribution jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_sleep numeric;
  v_avg_stress numeric;
  v_avg_energy numeric;
  v_mood_dist jsonb;
BEGIN
  -- Input validation
  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'Patient ID cannot be null';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Date range cannot be null';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date cannot be before start date';
  END IF;

  -- Calculate averages
  SELECT
    ROUND(AVG(sleep)::numeric, 2),
    ROUND(AVG(stress)::numeric, 2),
    ROUND(AVG(energy)::numeric, 2)
  INTO
    v_avg_sleep,
    v_avg_stress,
    v_avg_energy
  FROM check_ins
  WHERE patient_id = p_patient_id
  AND date BETWEEN p_start_date AND p_end_date;

  -- Calculate mood distribution
  SELECT
    COALESCE(
      jsonb_object_agg(mood, count),
      '{}'::jsonb
    )
  INTO v_mood_dist
  FROM (
    SELECT 
      mood,
      COUNT(*) as count
    FROM check_ins
    WHERE patient_id = p_patient_id
    AND date BETWEEN p_start_date AND p_end_date
    GROUP BY mood
  ) mood_counts;

  -- Return results
  RETURN QUERY
  SELECT
    COALESCE(v_avg_sleep, 0::numeric) as avg_sleep,
    COALESCE(v_avg_stress, 0::numeric) as avg_stress,
    COALESCE(v_avg_energy, 0::numeric) as avg_energy,
    COALESCE(v_mood_dist, '{}'::jsonb) as mood_distribution;

EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE NOTICE 'Error calculating metrics for patient % between % and %: %',
      p_patient_id, p_start_date, p_end_date, SQLERRM;
    -- Re-raise with user-friendly message
    RAISE EXCEPTION 'Failed to calculate patient metrics: %', SQLERRM;
END;
$$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_check_ins_patient_date_metrics
ON check_ins (patient_id, date)
INCLUDE (mood, sleep, stress, energy);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_patient_metrics TO authenticated;