/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // Environment
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test'

  // API Configuration
  readonly VITE_API_URL: string
  readonly VITE_API_TIMEOUT: string

  // WebSocket Configuration
  readonly VITE_WS_URL: string
  readonly VITE_WS_RECONNECT_INTERVAL: string
  readonly VITE_WS_MAX_RETRIES: string

  // Analytics Configuration
  readonly VITE_ANALYTICS_ENABLED: string
  readonly VITE_ANALYTICS_DEBUG: string
  readonly VITE_ANALYTICS_SAMPLE_RATE: string

  // Storage Configuration
  readonly VITE_STORAGE_PREFIX: string
  readonly VITE_STORAGE_VERSION: string

  // Feature Flags
  readonly VITE_ENABLE_NOTIFICATIONS: string
  readonly VITE_ENABLE_FILE_UPLOAD: string
  readonly VITE_ENABLE_CHAT: string

  // Security
  readonly VITE_AUTH_COOKIE_SECURE: string
  readonly VITE_AUTH_COOKIE_SAME_SITE: string
  readonly VITE_MAX_UPLOAD_SIZE: string

  // Error Reporting
  readonly VITE_ERROR_LOGGING_ENABLED: string
  readonly VITE_ERROR_SAMPLE_RATE: string

  // Cache Configuration
  readonly VITE_CACHE_TTL: string
  readonly VITE_CACHE_MAX_SIZE: string

  // Rate Limiting
  readonly VITE_API_RATE_LIMIT: string
  readonly VITE_API_RATE_WINDOW: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
