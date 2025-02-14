import { errorService } from '../errors/service';
import { storage } from '../storage';
import { authService } from '../auth/service';
import type {
  AnalyticsConfig,
  AnalyticsEvent,
  UserProperties,
  SessionData,
  AnalyticsError
} from './types';

class AnalyticsService {
  private config: AnalyticsConfig = {
    enabled: true,
    sampleRate: 1.0, // 100%
    debug: false
  };

  private session: SessionData | null = null;
  private userProperties: UserProperties | null = null;
  private queue: AnalyticsEvent[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.initializeSession();
    this.startQueueProcessor();
  }

  private initializeSession() {
    const user = authService.getCurrentUser();
    if (!user) return;

    this.session = {
      id: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      events: 0,
      pages: [window.location.pathname],
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };

    this.userProperties = {
      userId: user.id,
      role: user.role,
      deviceId: crypto.randomUUID(),
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };

    // Save session
    storage.set('analyticsSession', this.session);
  }

  private startQueueProcessor() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = window.setInterval(() => {
      this.flush().catch(console.error);
    }, 30000); // Flush every 30 seconds
  }

  private async flush(): Promise<void> {
    if (!this.config.enabled || this.queue.length === 0) return;

    try {
      const events = [...this.queue];
      this.queue = [];

      // In a real app, send to analytics service
      if (this.config.debug) {
        console.log('Analytics Events:', events);
      }

      // Update session
      if (this.session) {
        this.session.events += events.length;
        this.session.endTime = new Date().toISOString();
        this.session.duration = new Date(this.session.endTime).getTime() -
          new Date(this.session.startTime).getTime();
        
        storage.set('analyticsSession', this.session);
      }
    } catch (error) {
      // Put events back in queue
      this.queue.unshift(...this.queue);

      errorService.handleError({
        name: 'AnalyticsError',
        message: 'Failed to flush analytics events',
        code: 'ANALYTICS_FLUSH_ERROR',
        context: { error },
        timestamp: new Date().toISOString(),
        handled: true
      });
    }
  }

  track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    if (!this.config.enabled) return;
    if (Math.random() > this.config.sampleRate) return;

    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.queue.push(analyticsEvent);

    if (this.config.debug) {
      console.log('Tracked Event:', analyticsEvent);
    }
  }

  page(path: string, title?: string): void {
    if (!this.session) return;

    // Add page to session history
    if (!this.session.pages.includes(path)) {
      this.session.pages.push(path);
      storage.set('analyticsSession', this.session);
    }

    this.track({
      name: 'page_view',
      category: 'navigation',
      action: 'view',
      label: title || path,
      metadata: {
        path,
        title,
        referrer: document.referrer
      }
    });
  }

  identify(properties: Partial<UserProperties>): void {
    if (!this.userProperties) return;

    this.userProperties = {
      ...this.userProperties,
      ...properties
    };

    if (this.config.debug) {
      console.log('Updated User Properties:', this.userProperties);
    }
  }

  async endSession(): Promise<void> {
    if (!this.session) return;

    // Flush remaining events
    await this.flush();

    // Update session end time
    this.session.endTime = new Date().toISOString();
    this.session.duration = new Date(this.session.endTime).getTime() -
      new Date(this.session.startTime).getTime();

    storage.set('analyticsSession', this.session);

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.session = null;
  }

  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };

    if (!this.config.enabled && this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    } else if (this.config.enabled && !this.flushInterval) {
      this.startQueueProcessor();
    }
  }

  getSession(): SessionData | null {
    return this.session;
  }

  getUserProperties(): UserProperties | null {
    return this.userProperties;
  }
}

export const analyticsService = new AnalyticsService();