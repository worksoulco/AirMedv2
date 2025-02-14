import { ServiceIdentifier } from '../container/types';

export type Selector<T = any, R = any> = (state: T) => R;
export type Effect = (...args: any[]) => void | Promise<void>;
export type Reducer<T = any> = (state: T, action: Action) => T;
export type Middleware = (store: Store) => (next: Dispatch) => (action: Action) => any;

export interface Action {
  type: string;
  payload?: any;
  meta?: Record<string, any>;
  error?: boolean;
}

export interface StoreConfig {
  name: string;
  initialState: any;
  reducers: Record<string, Reducer>;
  effects?: Record<string, Effect>;
  middleware?: Middleware[];
  dependencies?: ServiceIdentifier[];
}

export interface Store<T = any> {
  getState(): T;
  dispatch(action: Action): void;
  subscribe(listener: () => void): () => void;
  select<R>(selector: Selector<T, R>): R;
}

export type Dispatch = (action: Action) => void;

export interface StoreManager {
  createStore<T>(config: StoreConfig): Store<T>;
  getStore(name: string): Store | undefined;
  removeStore(name: string): void;
  clearStores(): void;
}

export class StoreNotFoundError extends Error {
  constructor(name: string) {
    super(`Store "${name}" not found`);
    this.name = 'StoreNotFoundError';
  }
}