import type { Middleware, Action, Store } from './types';
import { errorService } from '../errors/service';
import { storage } from '../storage';

// Logger middleware
export const logger: Middleware = (store: Store) => (next: (action: Action) => void) => (action: Action) => {
  console.group(action.type);
  console.log('Previous State:', store.getState());
  console.log('Action:', action);
  next(action);
  console.log('Next State:', store.getState());
  console.groupEnd();
};

// Persistence middleware
export const persistence = (key: string): Middleware => 
  (store: Store) => (next: (action: Action) => void) => (action: Action) => {
    next(action);
    try {
      storage.set(key, store.getState());
    } catch (error) {
      errorService.handleError({
        name: 'StoreError',
        message: 'Failed to persist store state',
        code: 'STORE_PERSISTENCE_ERROR',
        context: { key, action, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
    }
  };

// Thunk middleware for async actions
export const thunk: Middleware = (store: Store) => (next: (action: Action) => void) => (action: Action) => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return next(action);
};

// Error boundary middleware
export const errorBoundary: Middleware = () => (next: (action: Action) => void) => (action: Action) => {
  try {
    return next(action);
  } catch (error) {
    errorService.handleError({
      name: 'StoreError',
      message: 'Action processing failed',
      code: 'STORE_ACTION_ERROR',
      context: { action, error },
      timestamp: new Date().toISOString(),
      handled: true
    });
    throw error;
  }
};

// Validation middleware
export const validation = (validators: Record<string, (payload: any) => boolean>): Middleware =>
  () => (next: (action: Action) => void) => (action: Action) => {
    const validator = validators[action.type];
    if (validator && !validator(action.payload)) {
      throw new Error(`Invalid payload for action ${action.type}`);
    }
    return next(action);
  };