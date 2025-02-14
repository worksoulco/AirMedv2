import type { StoreConfig } from '../types';
import { storage } from '../../storage';
import { persistence, errorBoundary } from '../middleware';

interface AppState {
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  lastSync: string | null;
  deviceId: string;
}

const initialState: AppState = {
  theme: storage.get('theme') || 'light',
  language: storage.get('language') || 'en',
  notifications: storage.get('notifications') || {
    enabled: true,
    sound: true,
    vibration: true
  },
  lastSync: null,
  deviceId: storage.get('deviceId') || crypto.randomUUID()
};

export const appStore: StoreConfig = {
  name: 'app',
  initialState,
  reducers: {
    'app/setTheme': (state, action) => ({
      ...state,
      theme: action.payload
    }),
    'app/setLanguage': (state, action) => ({
      ...state,
      language: action.payload
    }),
    'app/setNotifications': (state, action) => ({
      ...state,
      notifications: {
        ...state.notifications,
        ...action.payload
      }
    }),
    'app/setLastSync': (state, action) => ({
      ...state,
      lastSync: action.payload
    }),
    'app/reset': () => initialState
  },
  middleware: [
    persistence('app'),
    errorBoundary
  ]
};