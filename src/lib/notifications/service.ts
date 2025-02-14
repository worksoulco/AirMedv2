import { errorService } from '../errors/service';
import { storage } from '../storage';
import type {
  NotificationConfig,
  NotificationOptions,
  NotificationPermissionOptions,
  NotificationChannel,
  PushSubscription
} from './types';

class NotificationService {
  private config: NotificationConfig = {
    enabled: true,
    defaultOptions: {
      icon: '/icon.svg',
      badge: '/icon.svg',
      requireInteraction: false,
      silent: false
    }
  };

  private channels: Map<string, NotificationChannel> = new Map();
  private pushSubscription: PushSubscription | null = null;

  constructor() {
    this.initializeChannels();
  }

  private initializeChannels() {
    // Define default notification channels
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'appointments',
        name: 'Appointments',
        description: 'Notifications about upcoming appointments',
        importance: 'high',
        sound: true,
        vibration: true
      },
      {
        id: 'messages',
        name: 'Messages',
        description: 'Chat and communication notifications',
        importance: 'high',
        sound: true,
        vibration: true
      },
      {
        id: 'reminders',
        name: 'Reminders',
        description: 'Daily reminders and tasks',
        importance: 'default',
        sound: true
      },
      {
        id: 'updates',
        name: 'Updates',
        description: 'General updates and information',
        importance: 'low',
        sound: false
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });
  }

  async requestPermission(options: NotificationPermissionOptions = {}): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notifications are not supported in this browser');
      }

      if (Notification.permission === 'granted') {
        options.onGranted?.();
        return true;
      }

      if (Notification.permission === 'denied') {
        options.onDenied?.();
        return false;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        options.onGranted?.();
        return true;
      } else {
        options.onDenied?.();
        return false;
      }
    } catch (error) {
      errorService.handleError({
        name: 'NotificationError',
        message: 'Failed to request notification permission',
        code: 'NOTIFICATION_PERMISSION_ERROR',
        context: { error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      return false;
    }
  }

  async show(channelId: string, options: NotificationOptions): Promise<Notification | null> {
    try {
      if (!this.config.enabled) return null;
      if (!('Notification' in window)) return null;
      if (Notification.permission !== 'granted') return null;

      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error(`Notification channel ${channelId} not found`);
      }

      // Merge channel settings with notification options
      const notificationOptions: NotificationOptions = {
        ...this.config.defaultOptions,
        ...options,
        silent: channel.sound === false,
        requireInteraction: channel.importance === 'high'
      };

      const notification = new Notification(
        notificationOptions.title || 'AirMed',
        notificationOptions
      );

      // Add event listeners
      if (notificationOptions.onClick) {
        notification.onclick = () => notificationOptions.onClick?.(notification);
      }
      if (notificationOptions.onClose) {
        notification.onclose = notificationOptions.onClose;
      }
      if (notificationOptions.onError) {
        notification.onerror = (event) => {
          const error = new Error('Notification display failed');
          notificationOptions.onError?.(error);
        };
      }

      return notification;
    } catch (error) {
      errorService.handleError({
        name: 'NotificationError',
        message: 'Failed to show notification',
        code: 'NOTIFICATION_DISPLAY_ERROR',
        context: { channelId, options, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      return null;
    }
  }

  async subscribeToPush(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VAPID_PUBLIC_KEY || ''
        )
      });

      this.pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(
            subscription.getKey('p256dh') as ArrayBuffer
          ),
          auth: this.arrayBufferToBase64(
            subscription.getKey('auth') as ArrayBuffer
          )
        }
      };

      // Save subscription
      storage.set('pushSubscription', this.pushSubscription);
      return true;
    } catch (error) {
      errorService.handleError({
        name: 'PushSubscriptionError',
        message: 'Failed to subscribe to push notifications',
        code: 'PUSH_SUBSCRIPTION_ERROR',
        context: { error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode.apply(null, new Uint8Array(buffer) as any);
    return window.btoa(binary);
  }

  getChannel(channelId: string): NotificationChannel | undefined {
    return this.channels.get(channelId);
  }

  updateChannel(channelId: string, updates: Partial<NotificationChannel>) {
    const channel = this.channels.get(channelId);
    if (channel) {
      this.channels.set(channelId, { ...channel, ...updates });
    }
  }

  configure(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const notificationService = new NotificationService();