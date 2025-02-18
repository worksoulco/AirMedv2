export interface ChatThread {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
}

export interface ChatParticipantInfo {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'patient' | 'provider';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  photo?: string;
  role: 'patient' | 'provider';
}
