export interface NotificationConfig {
  enabled: boolean;
  defaultOptions: NotificationOptions;
}

export interface NotificationOptions {
  title?: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  onClick?: (notification: Notification) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export interface NotificationPermissionOptions {
  onGranted?: () => void;
  onDenied?: () => void;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 'high' | 'default' | 'low';
  sound?: boolean;
  vibration?: boolean;
  lights?: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}