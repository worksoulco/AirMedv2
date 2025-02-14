import { eventService, EVENTS } from './events';

interface StorageOptions {
  prefix?: string;
  version?: number;
  encrypt?: boolean;
}

class StorageService {
  private prefix: string;
  private version: number;
  private encrypt: boolean;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || 'airmed';
    this.version = options.version || 1;
    this.encrypt = options.encrypt || false;
  }

  private getKey(key: string): string {
    return `${this.prefix}_v${this.version}_${key}`;
  }

  private encrypt(data: any): string {
    // TODO: Implement encryption when needed
    return JSON.stringify(data);
  }

  private decrypt(data: string): any {
    // TODO: Implement decryption when needed
    return JSON.parse(data);
  }

  set(key: string, value: any) {
    try {
      const storageKey = this.getKey(key);
      const data = this.encrypt ? this.encrypt(value) : JSON.stringify(value);
      localStorage.setItem(storageKey, data);
      eventService.emit(EVENTS.SYNC.COMPLETED, { key, action: 'set' });
    } catch (error) {
      console.error('Storage Error:', error);
      eventService.emit(EVENTS.SYNC.ERROR, { key, error });
      throw error;
    }
  }

  get<T>(key: string): T | null {
    try {
      const storageKey = this.getKey(key);
      const data = localStorage.getItem(storageKey);
      if (!data) return null;
      return this.encrypt ? this.decrypt(data) : JSON.parse(data);
    } catch (error) {
      console.error('Storage Error:', error);
      eventService.emit(EVENTS.SYNC.ERROR, { key, error });
      return null;
    }
  }

  remove(key: string) {
    try {
      const storageKey = this.getKey(key);
      localStorage.removeItem(storageKey);
      eventService.emit(EVENTS.SYNC.COMPLETED, { key, action: 'remove' });
    } catch (error) {
      console.error('Storage Error:', error);
      eventService.emit(EVENTS.SYNC.ERROR, { key, error });
      throw error;
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage);
      const prefixedKeys = keys.filter(key => key.startsWith(`${this.prefix}_v${this.version}`));
      prefixedKeys.forEach(key => localStorage.removeItem(key));
      eventService.emit(EVENTS.SYNC.COMPLETED, { action: 'clear' });
    } catch (error) {
      console.error('Storage Error:', error);
      eventService.emit(EVENTS.SYNC.ERROR, { error });
      throw error;
    }
  }

  // Get all keys with a specific prefix
  getKeys(prefix: string): string[] {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(this.getKey(prefix)))
      .map(key => key.replace(this.getKey(''), ''));
  }
}

export const storage = new StorageService({
  prefix: 'airmed',
  version: 1,
  encrypt: false // Enable when implementing encryption
});