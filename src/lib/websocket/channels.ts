// Define WebSocket channel constants
export const CHANNELS = {
  AUTH: {
    CONNECTED: 'auth:connected',
    DISCONNECTED: 'auth:disconnected'
  },
  CHAT: {
    MESSAGE: 'chat:message',
    TYPING: 'chat:typing',
    READ: 'chat:read'
  },
  PATIENT: {
    CHECKIN: 'patient:checkin',
    VITALS: 'patient:vitals',
    LABS: 'patient:labs'
  },
  PROVIDER: {
    ALERT: 'provider:alert',
    SCHEDULE: 'provider:schedule'
  },
  PROTOCOL: {
    UPDATE: 'protocol:update',
    TASK: 'protocol:task'
  }
} as const;

// Helper to create channel-specific message types
export interface ChatMessage {
  type: typeof CHANNELS.CHAT.MESSAGE;
  payload: {
    threadId: string;
    senderId: string;
    content: string;
    attachments?: Array<{
      id: string;
      type: string;
      url: string;
    }>;
  };
}

export interface TypingMessage {
  type: typeof CHANNELS.CHAT.TYPING;
  payload: {
    threadId: string;
    userId: string;
    typing: boolean;
  };
}

export interface CheckInMessage {
  type: typeof CHANNELS.PATIENT.CHECKIN;
  payload: {
    patientId: string;
    date: string;
    data: {
      mood: string;
      sleep: number;
      stress: number;
      energy: number;
    };
  };
}

export interface VitalsMessage {
  type: typeof CHANNELS.PATIENT.VITALS;
  payload: {
    patientId: string;
    timestamp: string;
    type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'oxygen';
    value: number | { systolic: number; diastolic: number };
    unit: string;
  };
}

export interface ProtocolUpdateMessage {
  type: typeof CHANNELS.PROTOCOL.UPDATE;
  payload: {
    protocolId: string;
    patientId: string;
    update: {
      status?: 'active' | 'completed' | 'archived';
      tasks?: Array<{
        id: string;
        status: 'pending' | 'in_progress' | 'completed';
      }>;
    };
  };
}