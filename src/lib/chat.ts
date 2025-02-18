import { supabase } from './supabase/client';
import type { ChatMessage, ChatThread, ChatAttachment } from '@/types/chat';

export async function getOrCreateChatThread(patientId: string, providerId: string): Promise<string | null> {
  try {
    const { data: threadId, error } = await supabase
      .rpc('get_or_create_chat_thread', {
        p_patient_id: patientId,
        p_provider_id: providerId
      });

    if (error) throw error;
    return threadId;
  } catch (err) {
    console.error('Error getting/creating chat thread:', err);
    return null;
  }
}

export async function loadMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        thread_id,
        sender_id,
        content,
        created_at,
        read_at,
        attachments (
          id,
          message_id,
          name,
          type,
          url,
          size,
          created_at
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error loading messages:', err);
    return [];
  }
}

export async function sendMessage(
  threadId: string, 
  senderId: string, 
  content: string
): Promise<ChatMessage | null> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error sending message:', err);
    return null;
  }
}

export async function uploadAttachment(
  threadId: string,
  messageId: string,
  file: File
): Promise<ChatAttachment | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${threadId}/${messageId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    const { data, error: attachmentError } = await supabase
      .from('chat_attachments')
      .insert({
        message_id: messageId,
        name: file.name,
        type: file.type,
        url: publicUrl,
        size: file.size
      })
      .select()
      .single();

    if (attachmentError) throw attachmentError;
    return data;
  } catch (err) {
    console.error('Error uploading attachment:', err);
    return null;
  }
}

export async function markMessagesAsRead(threadId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('mark_messages_read', {
      p_thread_id: threadId,
      p_user_id: userId
    });

    if (error) throw error;
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
}

export function subscribeToMessages(
  threadId: string,
  onMessage: (message: ChatMessage) => void,
  onError: (error: Error) => void
) {
  return supabase
    .channel(`chat:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      }
    )
    .subscribe((status, err) => {
      if (status !== 'SUBSCRIBED') {
        onError(err || new Error(`Subscription status: ${status}`));
      }
    });
}
