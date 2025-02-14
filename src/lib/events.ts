type EventCallback = (...args: any[]) => void;

class EventService {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Subscribe to multiple events
  subscribeToMany(events: string[], callback: EventCallback): () => void {
    const unsubscribes = events.map(event => this.subscribe(event, callback));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }

  // Clear all listeners
  clear() {
    this.listeners.clear();
  }
}

export const eventService = new EventService();

// Event constants
export const EVENTS = {
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    PROFILE_UPDATE: 'auth:profile_update'
  },
  DATA: {
    CHECKIN_UPDATE: 'data:checkin_update',
    MEAL_UPDATE: 'data:meal_update',
    LAB_UPDATE: 'data:lab_update',
    PROTOCOL_UPDATE: 'data:protocol_update'
  },
  CHAT: {
    MESSAGE_RECEIVED: 'chat:message_received',
    MESSAGE_SENT: 'chat:message_sent',
    THREAD_UPDATE: 'chat:thread_update'
  },
  SYNC: {
    STARTED: 'sync:started',
    COMPLETED: 'sync:completed',
    ERROR: 'sync:error'
  }
} as const;