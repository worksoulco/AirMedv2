import { errorService } from '../errors/service';
import type { CacheConfig, CacheEntry, CacheStats, CacheOptions } from './types';

class CacheService {
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    cleanupInterval: 60 * 1000 // 1 minute
  };

  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    size: 0
  };

  private cleanupTimer: number | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.delete(key);
      }
    }
  }

  set<T>(key: string, value: T, options: CacheOptions = {}): boolean {
    try {
      const size = this.calculateSize(value);
      
      // Check if adding this item would exceed max size
      if (size + this.stats.size > this.config.maxSize) {
        this.evict(size);
      }

      const entry: CacheEntry<T> = {
        key,
        value,
        size,
        expiresAt: Date.now() + (options.ttl || this.config.defaultTTL),
        metadata: options.metadata
      };

      this.cache.set(key, entry);
      this.stats.size += size;

      return true;
    } catch (error) {
      errorService.handleError({
        name: 'CacheError',
        message: 'Failed to cache item',
        code: 'CACHE_SET_ERROR',
        context: { key, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      return false;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.size -= entry.size;
      return true;
    }
    return false;
  }

  clear() {
    this.cache.clear();
    this.stats.size = 0;
  }

  private calculateSize(value: any): number {
    try {
      const str = JSON.stringify(value);
      return new Blob([str]).size;
    } catch {
      return 0;
    }
  }

  private evict(requiredSize: number) {
    // Simple LRU eviction
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);

    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.delete(key);
      freedSize += entry.size;
      if (freedSize >= requiredSize) break;
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.delete(key);
      return false;
    }
    return true;
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      size: this.stats.size,
      entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests === 0 ? 0 : this.stats.hits / totalRequests
    };
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values<T>(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  entries<T>(): Array<[string, CacheEntry<T>]> {
    return Array.from(this.cache.entries());
  }
}

export const cacheService = new CacheService();