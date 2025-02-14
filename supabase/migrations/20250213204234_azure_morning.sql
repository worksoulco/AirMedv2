/*
  # Chat System Migration

  1. Tables
    - chat_threads: Stores chat conversations
    - chat_participants: Tracks thread participants
    - chat_messages: Stores individual messages
    - chat_attachments: Stores message attachments

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Add performance indexes
*/

-- Create chat tables
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  thread_id uuid REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  unread_count integer DEFAULT 0,
  last_read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  size integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "threads_participant_access"
  ON public.chat_threads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE thread_id = id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE thread_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "participants_self_access"
  ON public.chat_participants
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "messages_participant_access"
  ON public.chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE thread_id = chat_messages.thread_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE thread_id = chat_messages.thread_id
      AND user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "attachments_participant_access"
  ON public.chat_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.chat_participants p ON p.thread_id = m.thread_id
      WHERE m.id = chat_attachments.message_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.chat_participants p ON p.thread_id = m.thread_id
      WHERE m.id = chat_attachments.message_id
      AND p.user_id = auth.uid()
    )
  );

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user 
  ON public.chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_thread 
  ON public.chat_participants(thread_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread 
  ON public.chat_messages(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
  ON public.chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message 
  ON public.chat_attachments(message_id);

-- Add function to create or get chat thread
CREATE OR REPLACE FUNCTION public.get_or_create_chat_thread(
  p_patient_id uuid,
  p_provider_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid;
  v_relationship_exists boolean;
BEGIN
  -- Validate relationship exists
  SELECT EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE patient_id = p_patient_id
    AND provider_id = p_provider_id
    AND status = 'active'
  ) INTO v_relationship_exists;

  IF NOT v_relationship_exists THEN
    RAISE EXCEPTION 'No active patient-provider relationship exists';
  END IF;

  -- Get existing thread
  SELECT t.id INTO v_thread_id
  FROM public.chat_threads t
  JOIN public.chat_participants p1 ON p1.thread_id = t.id AND p1.user_id = p_patient_id
  JOIN public.chat_participants p2 ON p2.thread_id = t.id AND p2.user_id = p_provider_id
  WHERE t.type = 'direct'
  LIMIT 1;

  -- Create new thread if none exists
  IF v_thread_id IS NULL THEN
    -- Create thread
    INSERT INTO public.chat_threads (
      type,
      metadata
    ) VALUES (
      'direct',
      jsonb_build_object(
        'created_by', auth.uid(),
        'patient_id', p_patient_id,
        'provider_id', p_provider_id
      )
    )
    RETURNING id INTO v_thread_id;

    -- Add participants
    INSERT INTO public.chat_participants (thread_id, user_id)
    VALUES
      (v_thread_id, p_patient_id),
      (v_thread_id, p_provider_id);
  END IF;

  RETURN v_thread_id;
END;
$$;

-- Add function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_thread_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate user has access to thread
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE thread_id = p_thread_id
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this chat thread';
  END IF;

  -- Mark messages as read and update participant
  UPDATE public.chat_messages
  SET read_at = now()
  WHERE thread_id = p_thread_id
  AND sender_id != p_user_id
  AND read_at IS NULL;

  UPDATE public.chat_participants
  SET 
    unread_count = 0,
    last_read_at = now()
  WHERE thread_id = p_thread_id
  AND user_id = p_user_id;
END;
$$;

-- Add function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::integer
  FROM public.chat_participants
  WHERE user_id = p_user_id;
$$;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;