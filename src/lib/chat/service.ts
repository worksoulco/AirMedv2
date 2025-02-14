import { eventService, EVENTS } from '../events';
import { errorService } from '../errors/service';
import { storage } from '../storage';
import { wsService } from '../websocket/service';
import { notificationService } from '../notifications/service';
import { authService } from '../auth/service';
import type { ChatMessage, ChatThread, ChatParticipant, ChatNotification } from './types';

class ChatService {
  private threads: Map<string, ChatThread> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private participants: Map<string, ChatParticipant> = new Map();
  private notifications: Map<string, ChatNotification[]> = new Map();

  constructor() {
    this.loadStoredData();
    this.setupWebSocket();
  }

  private loadStoredData() {
    try {
      // Load threads
      const storedThreads = storage.get<ChatThread[]>('chatThreads');
      if (storedThreads) {
        storedThreads.forEach(thread => this.threads.set(thread.id, thread));
      }

      // Load messages
      const storedMessages = storage.get<Record<string, ChatMessage[]>>('chatMessages');
      if (storedMessages) {
        Object.entries(storedMessages).forEach(([threadId, messages]) => {
          this.messages.set(threadId, messages);
        });
      }

      // Load participants
      const storedParticipants = storage.get<ChatParticipant[]>('chatParticipants');
      if (storedParticipants) {
        storedParticipants.forEach(participant => {
          this.participants.set(participant.id, participant);
        });
      }
    } catch (error) {
      errorService.handleError({
        name: 'ChatError',
        message: 'Failed to load chat data',
        code: 'CHAT_LOAD_ERROR',
        context: { error },
        timestamp: new Date().toISOString(),
        handled: true
      });
    }
  }

  private setupWebSocket() {
    // Subscribe to chat events
    wsService.subscribe('chat:message', this.handleIncomingMessage);
    wsService.subscribe('chat:typing', this.handleTypingStatus);
    wsService.subscribe('chat:presence', this.handlePresenceUpdate);
  }

  private handleIncomingMessage = (message: ChatMessage) => {
    this.addMessage(message);
    this.updateThread(message.threadId);
    this.showNotification(message);
  };

  private handleTypingStatus = (data: { threadId: string; userId: string; typing: boolean }) => {
    const participant = this.participants.get(data.userId);
    if (participant) {
      participant.typing = data.typing;
      this.participants.set(data.userId, participant);
      eventService.emit(EVENTS.CHAT.TYPING, data);
    }
  };

  private handlePresenceUpdate = (data: { userId: string; status: ChatParticipant['status'] }) => {
    const participant = this.participants.get(data.userId);
    if (participant) {
      participant.status = data.status;
      participant.lastSeen = new Date().toISOString();
      this.participants.set(data.userId, participant);
      eventService.emit(EVENTS.CHAT.PRESENCE, data);
    }
  };

  private showNotification(message: ChatMessage) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || message.senderId === currentUser.id) return;

    const sender = this.participants.get(message.senderId);
    if (!sender) return;

    notificationService.show('messages', {
      title: sender.name,
      body: message.content,
      data: {
        threadId: message.threadId,
        messageId: message.id
      },
      onClick: () => {
        this.markThreadAsRead(message.threadId);
        // Navigate to thread (handled by UI)
        eventService.emit(EVENTS.CHAT.NOTIFICATION_CLICKED, {
          threadId: message.threadId,
          messageId: message.id
        });
      }
    });
  }

  async sendMessage(threadId: string, content: string, attachments?: File[]): Promise<ChatMessage> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const thread = this.threads.get(threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }

      // Handle file uploads
      const messageAttachments = attachments ? await this.uploadAttachments(attachments) : undefined;

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        threadId,
        senderId: currentUser.id,
        receiverId: thread.participants.find(id => id !== currentUser.id) || '',
        content,
        timestamp: new Date().toISOString(),
        read: false,
        attachments: messageAttachments
      };

      // Send via WebSocket
      wsService.send({
        type: 'chat:message',
        payload: message,
        timestamp: message.timestamp,
        id: message.id
      });

      // Add to local storage
      this.addMessage(message);
      this.updateThread(threadId);

      return message;
    } catch (error) {
      errorService.handleError({
        name: 'ChatError',
        message: 'Failed to send message',
        code: 'CHAT_SEND_ERROR',
        context: { threadId, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      throw error;
    }
  }

  private async uploadAttachments(files: File[]) {
    // Mock file upload - in real app, upload to storage service
    return Promise.all(files.map(async file => ({
      id: crypto.randomUUID(),
      type: file.type.startsWith('image/') ? 'image' : 'document',
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      mimeType: file.type,
      metadata: file.type.startsWith('image/') ? {
        width: 800,
        height: 600,
        thumbnail: URL.createObjectURL(file)
      } : undefined
    })));
  }

  private addMessage(message: ChatMessage) {
    const threadMessages = this.messages.get(message.threadId) || [];
    threadMessages.push(message);
    this.messages.set(message.threadId, threadMessages);
    this.saveMessages();

    eventService.emit(EVENTS.CHAT.MESSAGE_RECEIVED, { message });
  }

  private updateThread(threadId: string) {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    const messages = this.messages.get(threadId) || [];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage) {
      thread.lastMessage = lastMessage;
      thread.updatedAt = lastMessage.timestamp;
      
      const currentUser = authService.getCurrentUser();
      if (currentUser && lastMessage.senderId !== currentUser.id) {
        thread.unreadCount++;
      }
    }

    this.threads.set(threadId, thread);
    this.saveThreads();

    eventService.emit(EVENTS.CHAT.THREAD_UPDATE, { thread });
  }

  getThreads(): ChatThread[] {
    return Array.from(this.threads.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getMessages(threadId: string): ChatMessage[] {
    return this.messages.get(threadId) || [];
  }

  getParticipant(userId: string): ChatParticipant | undefined {
    return this.participants.get(userId);
  }

  async createThread(participantId: string): Promise<ChatThread> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const threadId = crypto.randomUUID();
    const thread: ChatThread = {
      id: threadId,
      participants: [currentUser.id, participantId],
      type: 'direct',
      unreadCount: 0,
      updatedAt: new Date().toISOString()
    };

    this.threads.set(threadId, thread);
    this.saveThreads();

    return thread;
  }

  markThreadAsRead(threadId: string) {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    thread.unreadCount = 0;
    this.threads.set(threadId, thread);
    this.saveThreads();

    const messages = this.messages.get(threadId) || [];
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    messages.forEach(message => {
      if (message.receiverId === currentUser.id && !message.read) {
        message.read = true;
      }
    });
    this.messages.set(threadId, messages);
    this.saveMessages();

    // Notify sender that messages were read
    wsService.send({
      type: 'chat:read',
      payload: {
        threadId,
        userId: currentUser.id
      },
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    });
  }

  setTypingStatus(threadId: string, typing: boolean) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    wsService.send({
      type: 'chat:typing',
      payload: {
        threadId,
        userId: currentUser.id,
        typing
      },
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    });
  }

  private saveThreads() {
    storage.set('chatThreads', Array.from(this.threads.values()));
  }

  private saveMessages() {
    const messagesObj = Object.fromEntries(this.messages);
    storage.set('chatMessages', messagesObj);
  }

  private saveParticipants() {
    storage.set('chatParticipants', Array.from(this.participants.values()));
  }
}

export const chatService = new ChatService();