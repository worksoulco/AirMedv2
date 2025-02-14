-- Create habits and goals tables
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  frequency integer NOT NULL CHECK (frequency BETWEEN 1 AND 7),
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  deadline date,
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create policies for habits
CREATE POLICY "Users can manage own habits"
  ON public.habits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for goals
CREATE POLICY "Users can manage own goals"
  ON public.goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add validation functions
CREATE OR REPLACE FUNCTION validate_habit_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure days is a valid array
  IF NOT jsonb_typeof(NEW.days) = 'array' THEN
    RAISE EXCEPTION 'days must be an array';
  END IF;

  -- Validate each day entry
  IF NOT (
    SELECT bool_and(
      jsonb_typeof(day->'date') = 'string'
      AND (
        jsonb_typeof(day->'completed') = 'boolean'
        OR day->'completed' IS NULL
      )
      AND (
        jsonb_typeof(day->'value') = 'number'
        OR day->'value' IS NULL
      )
    )
    FROM jsonb_array_elements(NEW.days) day
  ) THEN
    RAISE EXCEPTION 'Invalid day entry format';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_habit_days_trigger
  BEFORE INSERT OR UPDATE OF days ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION validate_habit_days();

CREATE OR REPLACE FUNCTION validate_goal_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure days is a valid array
  IF NOT jsonb_typeof(NEW.days) = 'array' THEN
    RAISE EXCEPTION 'days must be an array';
  END IF;

  -- Validate each day entry
  IF NOT (
    SELECT bool_and(
      jsonb_typeof(day->'date') = 'string'
      AND (
        jsonb_typeof(day->'completed') = 'boolean'
        OR day->'completed' IS NULL
      )
      AND (
        jsonb_typeof(day->'value') = 'number'
        OR day->'value' IS NULL
      )
    )
    FROM jsonb_array_elements(NEW.days) day
  ) THEN
    RAISE EXCEPTION 'Invalid day entry format';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_goal_days_trigger
  BEFORE INSERT OR UPDATE OF days ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_days();

-- Add function to get user's habits and goals
CREATE OR REPLACE FUNCTION get_user_tracking_items(
  p_user_id uuid,
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id uuid,
  type text,
  name text,
  description text,
  icon text,
  frequency integer,
  target_value numeric,
  current_value numeric,
  unit text,
  deadline date,
  days jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  RETURN QUERY
    -- Get habits
    SELECT 
      h.id,
      'habit'::text as type,
      h.name,
      h.description,
      h.icon,
      h.frequency,
      NULL::numeric as target_value,
      NULL::numeric as current_value,
      NULL::text as unit,
      NULL::date as deadline,
      h.days,
      h.created_at,
      h.updated_at
    FROM habits h
    WHERE h.user_id = p_user_id
    
    UNION ALL
    
    -- Get goals
    SELECT 
      g.id,
      'goal'::text as type,
      g.name,
      g.description,
      g.icon,
      NULL::integer as frequency,
      g.target_value,
      g.current_value,
      g.unit,
      g.deadline,
      g.days,
      g.created_at,
      g.updated_at
    FROM goals g
    WHERE g.user_id = p_user_id
    
    -- Order by creation date, most recent first
    ORDER BY created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON TABLE public.habits TO authenticated;
GRANT ALL ON TABLE public.goals TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tracking_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;