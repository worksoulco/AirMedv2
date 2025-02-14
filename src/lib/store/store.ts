import { container } from '../container';
import { eventService, EVENTS } from '../events';
import { errorService } from '../errors/service';
import type {
  Store,
  StoreConfig,
  Action,
  Dispatch,
  Selector,
  Middleware
} from './types';

export class AppStore<T = any> implements Store<T> {
  private state: T;
  private listeners: Set<() => void> = new Set();
  private reducers: StoreConfig['reducers'];
  private effects: StoreConfig['effects'];
  private middleware: Middleware[];
  private dependencies: any[];

  constructor(config: StoreConfig) {
    this.state = config.initialState;
    this.reducers = config.reducers;
    this.effects = config.effects || {};
    this.middleware = config.middleware || [];
    this.dependencies = config.dependencies?.map(id => container.get(id)) || [];

    // Initialize middleware chain
    this.dispatch = this.middleware.reduceRight(
      (next, middleware) => middleware(this)(next),
      this.baseDispatch.bind(this)
    );
  }

  private baseDispatch(action: Action): void {
    try {
      // Apply reducers
      const reducer = this.reducers[action.type];
      if (reducer) {
        const nextState = reducer(this.state, action);
        if (nextState !== this.state) {
          this.state = nextState;
          this.notifyListeners();
        }
      }

      // Apply effects
      const effect = this.effects[action.type];
      if (effect) {
        Promise.resolve(effect.apply(null, [action.payload, ...this.dependencies]))
          .catch(error => {
            errorService.handleError({
              name: 'StoreError',
              message: 'Effect execution failed',
              code: 'STORE_EFFECT_ERROR',
              context: { action, error },
              timestamp: new Date().toISOString(),
              handled: true
            });
          });
      }

      // Emit event
      eventService.emit(EVENTS.SYNC.COMPLETED, {
        type: 'store_update',
        action
      });
    } catch (error) {
      errorService.handleError({
        name: 'StoreError',
        message: 'Action dispatch failed',
        code: 'STORE_DISPATCH_ERROR',
        context: { action, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      throw error;
    }
  }

  dispatch(action: Action): void {
    // This will be replaced by middleware chain
    this.baseDispatch(action);
  }

  getState(): T {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  select<R>(selector: Selector<T, R>): R {
    return selector(this.state);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}