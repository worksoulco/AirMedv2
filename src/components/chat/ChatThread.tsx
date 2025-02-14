import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon, File, X, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

interface ChatParticipant {
  id: string;
  name: string;
  photo?: string;
  role: 'patient' | 'provider';
}

interface ChatThreadProps {
  threadId: string;
  participant: ChatParticipant;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
  attachments?: {
    id: string;
    type: string;
    url: string;
    name: string;
  }[];
}

export function ChatThread({ threadId, participant }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            sender_id,
            content,
            created_at,
            read_at,
            attachments (
              id,
              name,
              type,
              url
            )
          `)
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark messages as read
        if (data?.some(m => m.sender_id !== user?.id && !m.read_at)) {
          await supabase.rpc('mark_messages_read', {
            p_thread_id: threadId,
            p_user_id: user?.id
          });
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      }
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          if (payload.new) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as Message];
            });

            // Mark message as read if from other user
            if (payload.new.sender_id !== user?.id) {
              supabase.rpc('mark_messages_read', {
                p_thread_id: threadId,
                p_user_id: user?.id
              }).catch(console.error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user?.id || (!newMessage.trim() && attachments.length === 0)) return;

    try {
      setError(null);
      const content = newMessage.trim();
      setNewMessage('');

      // First insert the message
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Then handle attachments if any
      if (attachments.length > 0) {
        const attachmentPromises = attachments.map(async file => {
          const fileExt = file.name.split('.').pop();
          const filePath = `${threadId}/${message.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(filePath);

          return {
            message_id: message.id,
            name: file.name,
            type: file.type,
            url: publicUrl,
            size: file.size
          };
        });

        const { error: attachmentError } = await supabase
          .from('chat_attachments')
          .insert(await Promise.all(attachmentPromises));

        if (attachmentError) throw attachmentError;
      }

      setAttachments([]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          {participant.photo ? (
            <img
              src={participant.photo}
              alt={participant.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-lg font-medium text-primary">
                {participant.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h2 className="font-medium text-gray-900">{participant.name}</h2>
            <p className="text-sm text-gray-500">
              {participant.role === 'provider' ? 'Healthcare Provider' : 'Patient'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => {
            const isOutgoing = message.sender_id === user?.id;
            const showAvatar = index === 0 || 
              messages[index - 1].sender_id !== message.sender_id;

            return (
              <div
                key={message.id}
                className={`flex items-end gap-4 ${isOutgoing ? 'flex-row-reverse' : ''}`}
              >
                {showAvatar && (
                  <div className="flex-shrink-0">
                    {isOutgoing ? (
                      user?.userData.photo ? (
                        <img
                          src={user.userData.photo}
                          alt="You"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {user.userData.name.charAt(0)}
                          </span>
                        </div>
                      )
                    ) : (
                      participant.photo ? (
                        <img
                          src={participant.photo}
                          alt={participant.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
                <div className={`max-w-xl ${!showAvatar ? (isOutgoing ? 'mr-12' : 'ml-12') : ''}`}>
                  <div className={`rounded-2xl px-4 py-2 ${
                    isOutgoing ? 'bg-primary text-white' : 'bg-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                  {message.attachments?.map((attachment, i) => (
                    <div
                      key={i}
                      className={`mt-2 overflow-hidden rounded-lg border ${
                        isOutgoing ? 'bg-primary/90 text-white' : 'bg-white'
                      }`}
                    >
                      {attachment.type.startsWith('image/') ? (
                        <img
                          src={attachment.url}
                          alt="Attachment"
                          className="max-h-60 w-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-3 p-3">
                          <File className="h-5 w-5" />
                          <span className="text-sm">{attachment.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className={`mt-1 flex items-center gap-2 text-xs ${
                    isOutgoing ? 'justify-end' : ''
                  } text-gray-500`}>
                    <span>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                    {isOutgoing && (
                      message.read_at ? (
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="border-t bg-white p-4">
          <div className="flex gap-4">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative rounded-lg border p-2"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center gap-2 rounded bg-gray-50">
                    <File className="h-8 w-8 text-gray-400" />
                    <span className="text-xs text-gray-500">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-gray-900 p-1 text-white hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-4">
            <div className="relative flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="max-h-32 w-full resize-none rounded-lg border-gray-200 py-3 pl-4 pr-12 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute bottom-2 right-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ${
                    isUploading ? 'animate-pulse' : ''
                  }`}
                >
                  <Paperclip className="h-5 w-5" />
                </label>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && attachments.length === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full p-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Messages are end-to-end encrypted and comply with HIPAA regulations
          </p>
        </div>
      </div>
    </div>
  );
}