import { ChatMessage, ChatThread } from '@/types/chat';

// Load chat threads
export function loadChatThreads(userId: string): ChatThread[] {
  const stored = localStorage.getItem(`chatThreads_${userId}`);
  return stored ? JSON.parse(stored) : [];
}

// Load messages for a thread
export function loadChatMessages(threadId: string): ChatMessage[] {
  const stored = localStorage.getItem(`chatMessages_${threadId}`);
  return stored ? JSON.parse(stored) : [];
}

// Save a new message
export function saveChatMessage(threadId: string, message: ChatMessage) {
  const messages = loadChatMessages(threadId);
  const updatedMessages = [...messages, message];
  localStorage.setItem(`chatMessages_${threadId}`, JSON.stringify(updatedMessages));
  
  // Update thread
  const threads = loadChatThreads(message.senderId);
  const updatedThreads = threads.map(thread => 
    thread.id === threadId
      ? {
          ...thread,
          lastMessage: message,
          updatedAt: message.timestamp,
          unreadCount: thread.unreadCount + 1
        }
      : thread
  );
  localStorage.setItem(`chatThreads_${message.senderId}`, JSON.stringify(updatedThreads));
  
  // Notify components
  window.dispatchEvent(new Event('chatUpdate'));
  return message;
}

// Mark messages as read
export function markMessagesAsRead(threadId: string, userId: string) {
  const messages = loadChatMessages(threadId);
  const updatedMessages = messages.map(msg => 
    msg.receiverId === userId && !msg.read
      ? { ...msg, read: true }
      : msg
  );
  localStorage.setItem(`chatMessages_${threadId}`, JSON.stringify(updatedMessages));
  
  // Update thread unread count
  const threads = loadChatThreads(userId);
  const updatedThreads = threads.map(thread =>
    thread.id === threadId
      ? { ...thread, unreadCount: 0 }
      : thread
  );
  localStorage.setItem(`chatThreads_${userId}`, JSON.stringify(updatedThreads));
  
  window.dispatchEvent(new Event('chatUpdate'));
}