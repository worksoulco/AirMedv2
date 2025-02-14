export interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number;
  debug: boolean;
}

export interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface UserProperties {
  userId: string;
  role: string;
  deviceId?: string;
  platform?: string;
  timezone?: string;
  language?: string;
  [key: string]: any;
}

export interface SessionData {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  events: number;
  pages: string[];
  referrer?: string;
  userAgent: string;
}

export interface AnalyticsError {
  name: string;
  message: string;
  code: string;
  context?: Record<string, any>;
  timestamp: string;
}