export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  size: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  size: number;
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheOptions {
  ttl?: number;
  size?: number;
  metadata?: Record<string, any>;
}