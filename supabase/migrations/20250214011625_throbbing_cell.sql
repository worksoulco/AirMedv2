/*
  # Protocol System Migration

  1. Tables
    - Creates protocol tables with proper relationships and constraints
    - Enables RLS for all tables
  
  2. Security
    - Drops any existing policies to avoid conflicts
    - Creates new policies with unique names
    - Adds proper access control for providers and patients
  
  3. Functions
    - Adds helper functions for protocol management
    - Includes proper error handling and validation
*/

-- First check and drop any existing policies
DO $$ 
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('protocols', 'protocol_tasks', 'protocol_attachments')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
      v_policy.policyname, 
      v_policy.tablename
    );
  END LOOP;
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.protocols (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('treatment', 'recovery', 'maintenance', 'preventive')),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
  provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protocol_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id uuid REFERENCES public.protocols(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'as_needed')),
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date date,
  completed_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protocol_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id uuid REFERENCES public.protocols(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  size integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_attachments ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "protocol_provider_manage_20250214"
ON public.protocols
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "protocol_patient_view_20250214"
ON public.protocols
FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "protocol_task_access_20250214"
ON public.protocol_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.protocols
    WHERE id = protocol_tasks.protocol_id
    AND (provider_id = auth.uid() OR patient_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.protocols
    WHERE id = protocol_tasks.protocol_id
    AND (provider_id = auth.uid() OR patient_id = auth.uid())
  )
);

CREATE POLICY "protocol_attachment_access_20250214"
ON public.protocol_attachments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.protocols
    WHERE id = protocol_attachments.protocol_id
    AND (provider_id = auth.uid() OR patient_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.protocols
    WHERE id = protocol_attachments.protocol_id
    AND (provider_id = auth.uid() OR patient_id = auth.uid())
  )
);

-- Add function to get patient protocols
CREATE OR REPLACE FUNCTION get_patient_protocols(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_protocols jsonb;
BEGIN
  WITH protocol_data AS (
    SELECT 
      p.id,
      p.title,
      p.description,
      p.type,
      p.status,
      p.provider_id,
      pr.name as provider_name,
      p.start_date,
      p.end_date,
      p.notes,
      p.created_at,
      p.updated_at,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'title', t.title,
            'description', t.description,
            'frequency', t.frequency,
            'status', t.status,
            'due_date', t.due_date,
            'completed_date', t.completed_date
          )
        )
        FROM protocol_tasks t
        WHERE t.protocol_id = p.id
      ) as tasks,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'url', a.url,
            'type', a.type
          )
        )
        FROM protocol_attachments a
        WHERE a.protocol_id = p.id
      ) as attachments
    FROM protocols p
    JOIN profiles pr ON pr.id = p.provider_id
    WHERE p.patient_id = p_patient_id
    GROUP BY 
      p.id, 
      p.title, 
      p.description, 
      p.type, 
      p.status, 
      p.provider_id, 
      pr.name, 
      p.start_date, 
      p.end_date, 
      p.notes, 
      p.created_at, 
      p.updated_at
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pd.id,
      'title', pd.title,
      'description', pd.description,
      'type', pd.type,
      'status', pd.status,
      'provider_id', pd.provider_id,
      'provider_name', pd.provider_name,
      'start_date', pd.start_date,
      'end_date', pd.end_date,
      'notes', pd.notes,
      'tasks', COALESCE(pd.tasks, '[]'::jsonb),
      'attachments', COALESCE(pd.attachments, '[]'::jsonb),
      'created_at', pd.created_at,
      'updated_at', pd.updated_at
    )
    ORDER BY 
      CASE pd.status 
        WHEN 'active' THEN 1
        WHEN 'completed' THEN 2
        ELSE 3
      END,
      pd.created_at DESC
  )
  INTO v_protocols
  FROM protocol_data pd;

  RETURN COALESCE(v_protocols, '[]'::jsonb);
END;
$$;

-- Add function to update protocol task status
CREATE OR REPLACE FUNCTION update_protocol_task_status(
  p_task_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task protocol_tasks;
BEGIN
  -- Validate status
  IF p_status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid task status';
  END IF;

  -- Get task and validate access
  SELECT t.* INTO v_task
  FROM protocol_tasks t
  JOIN protocols p ON p.id = t.protocol_id
  WHERE t.id = p_task_id
  AND (p.provider_id = auth.uid() OR p.patient_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or access denied';
  END IF;

  -- Update task
  UPDATE protocol_tasks
  SET
    status = p_status,
    completed_date = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  RETURN row_to_json(v_task)::jsonb;
END;
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_protocols_patient_id 
ON protocols(patient_id);

CREATE INDEX IF NOT EXISTS idx_protocols_provider_id 
ON protocols(provider_id);

CREATE INDEX IF NOT EXISTS idx_protocol_tasks_protocol_id 
ON protocol_tasks(protocol_id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;