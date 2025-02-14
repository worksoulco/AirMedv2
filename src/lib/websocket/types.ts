export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  debug: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id: string;
}

export interface WebSocketSubscription {
  id: string;
  channel: string;
  callback: (message: WebSocketMessage) => void;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  reconnectAttempt: number;
  lastMessageAt: string | null;
  subscriptions: number;
}