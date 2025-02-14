/*
  # Fix patient metrics query

  1. Changes
    - Fix ambiguous column reference in get_patient_metrics function
    - Add table aliases to clarify column references
    - Improve query performance with proper joins
    - Add error handling
*/

-- Drop existing function if it exists
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
BEGIN
  RETURN QUERY
  WITH mood_counts AS (
    SELECT 
      ci.mood,
      COUNT(*) as count
    FROM check_ins ci
    WHERE ci.patient_id = p_patient_id
    AND ci.date BETWEEN p_start_date AND p_end_date
    GROUP BY ci.mood
  ),
  averages AS (
    SELECT
      ROUND(AVG(ci.sleep)::numeric, 2) as avg_sleep,
      ROUND(AVG(ci.stress)::numeric, 2) as avg_stress,
      ROUND(AVG(ci.energy)::numeric, 2) as avg_energy
    FROM check_ins ci
    WHERE ci.patient_id = p_patient_id
    AND ci.date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    a.avg_sleep,
    a.avg_stress,
    a.avg_energy,
    COALESCE(
      jsonb_object_agg(mc.mood, mc.count),
      '{}'::jsonb
    ) as mood_distribution
  FROM averages a
  LEFT JOIN mood_counts mc ON true;

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error calculating patient metrics: %', SQLERRM;
END;
$$;