/*
  # Add Habits Table and Functions

  1. New Tables
    - `habits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text)
      - `icon` (text)
      - `frequency` (integer)
      - `days` (jsonb array of completion records)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on habits table
    - Add policy for user access
    - Add policy for provider access

  3. Functions
    - Add function to toggle habit completion
    - Add function to get habit stats
*/

-- Drop existing objects if they exist
DO $$ 
BEGIN
  -- Drop existing indexes
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_habits_user_id') THEN
    DROP INDEX idx_habits_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_habits_updated_at') THEN
    DROP INDEX idx_habits_updated_at;
  END IF;

  -- Drop existing functions
  DROP FUNCTION IF EXISTS toggle_habit_completion;
  DROP FUNCTION IF EXISTS get_habit_stats;

  -- Drop existing table
  DROP TABLE IF EXISTS habits;
END $$;

-- Create habits table
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  frequency integer NOT NULL CHECK (frequency BETWEEN 1 AND 7),
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "habits_user_access"
ON public.habits
FOR ALL
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Add function to toggle habit completion
CREATE OR REPLACE FUNCTION toggle_habit_completion(
  p_habit_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_habit habits;
  v_days jsonb;
  v_day_index integer := -1;
  v_completed boolean;
BEGIN
  -- Get habit and validate ownership
  SELECT * INTO v_habit
  FROM habits
  WHERE id = p_habit_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found or access denied';
  END IF;

  -- Get current days array
  v_days := v_habit.days;

  -- Find existing day entry
  FOR i IN 0..jsonb_array_length(v_days) - 1 LOOP
    IF (v_days->i->>'date')::date = p_date THEN
      v_day_index := i;
      v_completed := (v_days->i->>'completed')::boolean;
      EXIT;
    END IF;
  END LOOP;

  -- Update or add day entry
  IF v_day_index >= 0 THEN
    -- Update existing entry
    v_days := jsonb_set(
      v_days,
      array[v_day_index::text],
      jsonb_build_object(
        'date', p_date,
        'completed', NOT v_completed
      )
    );
  ELSE
    -- Add new entry
    v_days := v_days || jsonb_build_object(
      'date', p_date,
      'completed', true
    );
  END IF;

  -- Update habit
  UPDATE habits
  SET 
    days = v_days,
    updated_at = now()
  WHERE id = p_habit_id
  RETURNING days INTO v_days;

  RETURN v_days;
END;
$$;

-- Add function to get habit stats
CREATE OR REPLACE FUNCTION get_habit_stats(
  p_habit_id uuid,
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_habit habits;
  v_stats jsonb;
  v_completed_days integer := 0;
  v_streak integer := 0;
  v_best_streak integer := 0;
  v_current_streak integer := 0;
BEGIN
  -- Get habit and validate ownership
  SELECT * INTO v_habit
  FROM habits
  WHERE id = p_habit_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found or access denied';
  END IF;

  -- Calculate stats
  WITH days AS (
    SELECT 
      (d->>'date')::date as completion_date,
      (d->>'completed')::boolean as completed
    FROM jsonb_array_elements(v_habit.days) d
    WHERE (d->>'date')::date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    COUNT(*) FILTER (WHERE completed) as completed_days,
    MAX(streak) as best_streak,
    FIRST_VALUE(streak) OVER (ORDER BY completion_date DESC) as current_streak
  INTO v_completed_days, v_best_streak, v_current_streak
  FROM (
    SELECT
      completion_date,
      completed,
      COUNT(*) FILTER (WHERE completed) OVER (
        ORDER BY completion_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) as streak
    FROM days
    WHERE completed
  ) s;

  -- Build stats object
  v_stats := jsonb_build_object(
    'completed_days', v_completed_days,
    'total_days', p_end_date - p_start_date + 1,
    'completion_rate', ROUND((v_completed_days::numeric / (p_end_date - p_start_date + 1)) * 100, 2),
    'current_streak', COALESCE(v_current_streak, 0),
    'best_streak', COALESCE(v_best_streak, 0)
  );

  RETURN v_stats;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id_new ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_updated_at_new ON habits(updated_at DESC);

-- Grant permissions
GRANT ALL ON public.habits TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_habit_completion TO authenticated;
GRANT EXECUTE ON FUNCTION get_habit_stats TO authenticated;