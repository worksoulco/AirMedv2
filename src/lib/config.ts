/**
 * Application configuration service that loads and validates environment variables
 */
class ConfigService {
  // Supabase
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;

  // Environment
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;

  // API
  readonly apiUrl: string;
  readonly apiTimeout: number;

  // WebSocket
  readonly wsUrl: string;
  readonly wsReconnectInterval: number;
  readonly wsMaxRetries: number;

  // Analytics
  readonly analyticsEnabled: boolean;
  readonly analyticsDebug: boolean;
  readonly analyticsSampleRate: number;

  // Storage
  readonly storagePrefix: string;
  readonly storageVersion: string;

  // Features
  readonly notificationsEnabled: boolean;
  readonly fileUploadEnabled: boolean;
  readonly chatEnabled: boolean;

  // Security
  readonly authCookieSecure: boolean;
  readonly authCookieSameSite: 'strict' | 'lax' | 'none';
  readonly maxUploadSize: number;

  // Error Reporting
  readonly errorLoggingEnabled: boolean;
  readonly errorSampleRate: number;

  // Cache
  readonly cacheTTL: number;
  readonly cacheMaxSize: number;

  // Rate Limiting
  readonly apiRateLimit: number;
  readonly apiRateWindow: number;

  constructor() {
    // Supabase
    this.supabaseUrl = this.requireEnvVar('VITE_SUPABASE_URL');
    this.supabaseAnonKey = this.requireEnvVar('VITE_SUPABASE_ANON_KEY');

    // Environment
    const nodeEnv = this.requireEnvVar('VITE_NODE_ENV');
    this.isDevelopment = nodeEnv === 'development';
    this.isProduction = nodeEnv === 'production';
    this.isTest = nodeEnv === 'test';

    // API
    this.apiUrl = this.requireEnvVar('VITE_API_URL');
    this.apiTimeout = this.parseNumber('VITE_API_TIMEOUT', 30000);

    // WebSocket
    this.wsUrl = this.requireEnvVar('VITE_WS_URL');
    this.wsReconnectInterval = this.parseNumber('VITE_WS_RECONNECT_INTERVAL', 5000);
    this.wsMaxRetries = this.parseNumber('VITE_WS_MAX_RETRIES', 5);

    // Analytics
    this.analyticsEnabled = this.parseBoolean('VITE_ANALYTICS_ENABLED', true);
    this.analyticsDebug = this.parseBoolean('VITE_ANALYTICS_DEBUG', false);
    this.analyticsSampleRate = this.parseNumber('VITE_ANALYTICS_SAMPLE_RATE', 1.0);

    // Storage
    this.storagePrefix = this.getEnvVar('VITE_STORAGE_PREFIX', 'airmed_');
    this.storageVersion = this.getEnvVar('VITE_STORAGE_VERSION', '1.0');

    // Features
    this.notificationsEnabled = this.parseBoolean('VITE_ENABLE_NOTIFICATIONS', true);
    this.fileUploadEnabled = this.parseBoolean('VITE_ENABLE_FILE_UPLOAD', true);
    this.chatEnabled = this.parseBoolean('VITE_ENABLE_CHAT', true);

    // Security
    this.authCookieSecure = this.parseBoolean('VITE_AUTH_COOKIE_SECURE', false);
    this.authCookieSameSite = this.parseSameSite('VITE_AUTH_COOKIE_SAME_SITE', 'lax');
    this.maxUploadSize = this.parseNumber('VITE_MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB

    // Error Reporting
    this.errorLoggingEnabled = this.parseBoolean('VITE_ERROR_LOGGING_ENABLED', true);
    this.errorSampleRate = this.parseNumber('VITE_ERROR_SAMPLE_RATE', 1.0);

    // Cache
    this.cacheTTL = this.parseNumber('VITE_CACHE_TTL', 3600000);
    this.cacheMaxSize = this.parseNumber('VITE_CACHE_MAX_SIZE', 100);

    // Rate Limiting
    this.apiRateLimit = this.parseNumber('VITE_API_RATE_LIMIT', 100);
    this.apiRateWindow = this.parseNumber('VITE_API_RATE_WINDOW', 60000);

    // Validate configuration
    this.validate();
  }

  private requireEnvVar(key: keyof ImportMetaEnv): string {
    const value = import.meta.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private getEnvVar(key: keyof ImportMetaEnv, defaultValue: string): string {
    return import.meta.env[key] || defaultValue;
  }

  private parseBoolean(key: keyof ImportMetaEnv, defaultValue: boolean): boolean {
    const value = import.meta.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private parseNumber(key: keyof ImportMetaEnv, defaultValue: number): number {
    const value = import.meta.env[key];
    if (!value) return defaultValue;
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number format for environment variable: ${key}`);
    }
    return parsed;
  }

  private parseSameSite(key: keyof ImportMetaEnv, defaultValue: 'strict' | 'lax' | 'none'): 'strict' | 'lax' | 'none' {
    const value = import.meta.env[key]?.toLowerCase() || defaultValue;
    if (value !== 'strict' && value !== 'lax' && value !== 'none') {
      throw new Error(`Invalid SameSite value for environment variable: ${key}`);
    }
    return value;
  }

  private validate() {
    // Validate Supabase URL format
    try {
      new URL(this.supabaseUrl);
    } catch {
      throw new Error('Invalid VITE_SUPABASE_URL format');
    }

    // Validate API URL format
    try {
      new URL(this.apiUrl);
    } catch {
      throw new Error('Invalid VITE_API_URL format');
    }

    // Validate WebSocket URL format
    try {
      new URL(this.wsUrl);
    } catch {
      throw new Error('Invalid VITE_WS_URL format');
    }

    // Validate sample rates are between 0 and 1
    if (this.analyticsSampleRate < 0 || this.analyticsSampleRate > 1) {
      throw new Error('VITE_ANALYTICS_SAMPLE_RATE must be between 0 and 1');
    }
    if (this.errorSampleRate < 0 || this.errorSampleRate > 1) {
      throw new Error('VITE_ERROR_SAMPLE_RATE must be between 0 and 1');
    }

    // Validate positive numbers
    if (this.apiTimeout <= 0) throw new Error('VITE_API_TIMEOUT must be positive');
    if (this.wsReconnectInterval <= 0) throw new Error('VITE_WS_RECONNECT_INTERVAL must be positive');
    if (this.wsMaxRetries <= 0) throw new Error('VITE_WS_MAX_RETRIES must be positive');
    if (this.maxUploadSize <= 0) throw new Error('VITE_MAX_UPLOAD_SIZE must be positive');
    if (this.cacheTTL <= 0) throw new Error('VITE_CACHE_TTL must be positive');
    if (this.cacheMaxSize <= 0) throw new Error('VITE_CACHE_MAX_SIZE must be positive');
    if (this.apiRateLimit <= 0) throw new Error('VITE_API_RATE_LIMIT must be positive');
    if (this.apiRateWindow <= 0) throw new Error('VITE_API_RATE_WINDOW must be positive');
  }

  /**
   * Returns configuration as a plain object for logging/debugging
   */
  toJSON() {
    return {
      supabaseUrl: this.supabaseUrl,
      supabaseAnonKey: '[REDACTED]',
      environment: {
        isDevelopment: this.isDevelopment,
        isProduction: this.isProduction,
        isTest: this.isTest
      },
      api: {
        url: this.apiUrl,
        timeout: this.apiTimeout
      },
      websocket: {
        url: this.wsUrl,
        reconnectInterval: this.wsReconnectInterval,
        maxRetries: this.wsMaxRetries
      },
      analytics: {
        enabled: this.analyticsEnabled,
        debug: this.analyticsDebug,
        sampleRate: this.analyticsSampleRate
      },
      storage: {
        prefix: this.storagePrefix,
        version: this.storageVersion
      },
      features: {
        notifications: this.notificationsEnabled,
        fileUpload: this.fileUploadEnabled,
        chat: this.chatEnabled
      },
      security: {
        cookieSecure: this.authCookieSecure,
        cookieSameSite: this.authCookieSameSite,
        maxUploadSize: this.maxUploadSize
      },
      errorReporting: {
        enabled: this.errorLoggingEnabled,
        sampleRate: this.errorSampleRate
      },
      cache: {
        ttl: this.cacheTTL,
        maxSize: this.cacheMaxSize
      },
      rateLimiting: {
        limit: this.apiRateLimit,
        window: this.apiRateWindow
      }
    };
  }
}

export const config = new ConfigService();
