export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: ChatAttachment[];
  metadata?: {
    type?: 'text' | 'image' | 'file';
    replyTo?: string;
    edited?: boolean;
    editedAt?: string;
  };
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
  };
}

export interface ChatThread {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
  metadata?: {
    name?: string;
    avatar?: string;
    muted?: boolean;
    pinned?: boolean;
  };
}

export interface ChatParticipant {
  id: string;
  name: string;
  role: 'patient' | 'provider';
  photo?: string;
  lastSeen?: string;
  typing?: boolean;
  status?: 'online' | 'offline' | 'away';
}

export interface ChatNotification {
  id: string;
  threadId: string;
  messageId: string;
  type: 'message' | 'mention' | 'reaction';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}