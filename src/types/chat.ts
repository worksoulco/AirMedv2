export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface ChatThread {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  photo?: string;
  role: 'patient' | 'provider';
  lastSeen?: string;
  typing?: boolean;
}