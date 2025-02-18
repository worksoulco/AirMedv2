-- Create storage bucket for chat attachments first
INSERT INTO storage.buckets (id, name)
VALUES ('chat-attachments', 'chat-attachments')
ON CONFLICT (id) DO NOTHING;

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS public.chat_attachments CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chat_threads CASCADE;

-- Create tables in order of dependencies
CREATE TABLE public.chat_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('patient', 'provider')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(thread_id, user_id)
);


CREATE TABLE public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id),
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Create trigger function to validate sender
CREATE OR REPLACE FUNCTION public.validate_message_sender()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chat_participants
        WHERE thread_id = NEW.thread_id
        AND user_id = NEW.sender_id
    ) THEN
        RAISE EXCEPTION 'Sender must be a participant in the chat thread';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_message_sender_trigger
    BEFORE INSERT OR UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_message_sender();

CREATE TABLE public.chat_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_or_create_chat_thread;
DROP FUNCTION IF EXISTS public.mark_messages_read;

-- Create functions after tables exist
CREATE FUNCTION public.get_or_create_chat_thread(
    p_patient_id UUID,
    p_provider_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    -- Check if thread exists through participants
    SELECT t.id INTO v_thread_id
    FROM chat_threads t
    JOIN chat_participants p1 ON p1.thread_id = t.id AND p1.user_id = p_patient_id AND p1.role = 'patient'
    JOIN chat_participants p2 ON p2.thread_id = t.id AND p2.user_id = p_provider_id AND p2.role = 'provider';
    
    -- If not, create it
    IF v_thread_id IS NULL THEN
        -- Create thread
        INSERT INTO chat_threads DEFAULT VALUES
        RETURNING id INTO v_thread_id;
        
        -- Add participants
        INSERT INTO chat_participants (thread_id, user_id, role)
        VALUES 
            (v_thread_id, p_patient_id, 'patient'),
            (v_thread_id, p_provider_id, 'provider');
    END IF;
    
    RETURN v_thread_id;
END;
$$;

CREATE FUNCTION public.mark_messages_read(
    p_thread_id UUID,
    p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE chat_messages
    SET read_at = NOW()
    WHERE thread_id = p_thread_id
    AND sender_id != p_user_id
    AND read_at IS NULL;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "System can create chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view attachments in their threads" ON public.chat_attachments;
DROP POLICY IF EXISTS "Users can insert attachments in their threads" ON public.chat_attachments;
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

-- Enable RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies after tables exist
CREATE POLICY "Users can view their own chat threads"
    ON public.chat_threads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE thread_id = id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "System can create chat threads"
    ON public.chat_threads
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their participations"
    ON public.chat_participants
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create participations"
    ON public.chat_participants
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view messages in their threads"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE thread_id = chat_messages.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their threads"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE thread_id = chat_messages.thread_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view attachments in their threads"
    ON public.chat_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_messages m
            JOIN chat_participants p ON p.thread_id = m.thread_id
            WHERE m.id = message_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert attachments in their threads"
    ON public.chat_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_messages m
            JOIN chat_participants p ON p.thread_id = m.thread_id
            WHERE m.id = message_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload chat attachments"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-attachments' AND
        (
            EXISTS (
                SELECT 1 FROM chat_threads t
                JOIN chat_participants p ON p.thread_id = t.id
                WHERE t.id::text = (regexp_match(name, '^([^/]+)/'))[1]
                AND p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view chat attachments"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'chat-attachments' AND
        (
            EXISTS (
                SELECT 1 FROM chat_threads t
                JOIN chat_participants p ON p.thread_id = t.id
                WHERE t.id::text = (regexp_match(name, '^([^/]+)/'))[1]
                AND p.user_id = auth.uid()
            )
        )
    );
