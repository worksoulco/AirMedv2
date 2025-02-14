import { eventService, EVENTS } from '../events';
import { errorService } from '../errors/service';
import { authService } from '../auth/service';
import type { WebSocketConfig, WebSocketMessage, WebSocketSubscription, WebSocketState } from './types';

class WebSocketService {
  private config: WebSocketConfig = {
    url: 'wss://api.example.com/ws',
    reconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    debug: false
  };

  private ws: WebSocket | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Map<string, WebSocketSubscription> = new Map();

  private state: WebSocketState = {
    connected: false,
    connecting: false,
    reconnectAttempt: 0,
    lastMessageAt: null,
    subscriptions: 0
  };

  constructor(config?: Partial<WebSocketConfig>) {
    this.configure(config || {});
  }

  configure(config: Partial<WebSocketConfig>) {
    this.config = { ...this.config, ...config };
  }

  connect() {
    if (this.state.connected || this.state.connecting) return;

    try {
      this.state.connecting = true;
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = this.handleOpen;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
      this.ws.onmessage = this.handleMessage;

      this.log('Connecting to WebSocket...');
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleOpen = () => {
    this.state.connected = true;
    this.state.connecting = false;
    this.state.reconnectAttempt = 0;
    this.state.lastMessageAt = new Date().toISOString();

    this.log('WebSocket connected');
    this.startHeartbeat();
    this.processMessageQueue();
    
    // Authenticate connection
    const user = authService.getCurrentUser();
    if (user) {
      this.send({
        type: 'auth',
        payload: {
          userId: user.id,
          role: user.role
        },
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID()
      });
    }

    // Resubscribe to channels
    this.subscriptions.forEach(sub => {
      this.send({
        type: 'subscribe',
        payload: {
          channel: sub.channel
        },
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID()
      });
    });

    eventService.emit(EVENTS.SYNC.COMPLETED, { type: 'websocket_connected' });
  };

  private handleClose = (event: CloseEvent) => {
    this.state.connected = false;
    this.state.connecting = false;
    this.stopHeartbeat();

    this.log(`WebSocket closed: ${event.code} ${event.reason}`);

    // Attempt to reconnect if not a clean close
    if (!event.wasClean && this.state.reconnectAttempt < this.config.reconnectAttempts) {
      this.state.reconnectAttempt++;
      this.reconnectTimer = window.setTimeout(() => {
        this.log(`Reconnecting... Attempt ${this.state.reconnectAttempt}`);
        this.connect();
      }, this.config.reconnectInterval);
    }

    eventService.emit(EVENTS.SYNC.ERROR, {
      type: 'websocket_disconnected',
      code: event.code,
      reason: event.reason
    });
  };

  private handleError = (error: any) => {
    this.log('WebSocket error:', error);
    
    errorService.handleError({
      name: 'WebSocketError',
      message: error instanceof Error ? error.message : 'WebSocket error occurred',
      code: 'WEBSOCKET_ERROR',
      context: { error },
      timestamp: new Date().toISOString(),
      handled: true
    });
  };

  private handleMessage = (event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.state.lastMessageAt = new Date().toISOString();

      this.log('Received message:', message);

      // Handle system messages
      if (message.type === 'ping') {
        this.send({ type: 'pong', payload: {}, timestamp: new Date().toISOString(), id: message.id });
        return;
      }

      // Find and notify subscribers
      this.subscriptions.forEach(sub => {
        if (message.type.startsWith(sub.channel)) {
          sub.callback(message);
        }
      });

      eventService.emit(EVENTS.SYNC.COMPLETED, {
        type: 'websocket_message',
        messageType: message.type
      });
    } catch (error) {
      this.handleError(error);
    }
  };

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send({
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID()
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) this.send(message);
    }
  }

  send(message: WebSocketMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.log('Sent message:', message);
    } catch (error) {
      this.handleError(error);
      this.messageQueue.push(message);
    }
  }

  subscribe(channel: string, callback: (message: WebSocketMessage) => void): () => void {
    const subscription: WebSocketSubscription = {
      id: crypto.randomUUID(),
      channel,
      callback
    };

    this.subscriptions.set(subscription.id, subscription);
    this.state.subscriptions = this.subscriptions.size;

    // Subscribe on server if connected
    if (this.state.connected) {
      this.send({
        type: 'subscribe',
        payload: { channel },
        timestamp: new Date().toISOString(),
        id: subscription.id
      });
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscription.id);
      this.state.subscriptions = this.subscriptions.size;

      if (this.state.connected) {
        this.send({
          type: 'unsubscribe',
          payload: { channel },
          timestamp: new Date().toISOString(),
          id: subscription.id
        });
      }
    };
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state.connected = false;
    this.state.connecting = false;
    this.messageQueue = [];
  }

  getState(): WebSocketState {
    return { ...this.state };
  }

  private log(...args: any[]) {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }
}

export const wsService = new WebSocketService({
  url: process.env.WS_URL || 'wss://api.example.com/ws',
  debug: process.env.NODE_ENV === 'development'
});