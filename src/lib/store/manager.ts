import type { Store, StoreConfig, StoreManager } from './types';
import { StoreNotFoundError } from './types';
import { AppStore } from './store';

class StoreManagerService implements StoreManager {
  private stores = new Map<string, Store>();

  createStore<T>(config: StoreConfig): Store<T> {
    if (this.stores.has(config.name)) {
      throw new Error(`Store "${config.name}" already exists`);
    }

    const store = new AppStore<T>(config);
    this.stores.set(config.name, store);
    return store;
  }

  getStore(name: string): Store | undefined {
    const store = this.stores.get(name);
    if (!store) {
      throw new StoreNotFoundError(name);
    }
    return store;
  }

  removeStore(name: string): void {
    this.stores.delete(name);
  }

  clearStores(): void {
    this.stores.clear();
  }
}

export const storeManager = new StoreManagerService();