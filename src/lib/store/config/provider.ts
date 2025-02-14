import type { StoreConfig } from '../types';
import { storage } from '../../storage';
import { errorService } from '../../errors/service';
import { eventService, EVENTS } from '../../events';
import { persistence, errorBoundary } from '../middleware';
import type { Provider } from '@/types/provider';

interface ProviderState {
  data: Provider | null;
  patients: any[];
  appointments: any[];
  loading: boolean;
  error: string | null;
}

const initialState: ProviderState = {
  data: storage.get('currentProvider'),
  patients: [],
  appointments: [],
  loading: false,
  error: null
};

export const providerStore: StoreConfig = {
  name: 'provider',
  initialState,
  reducers: {
    'provider/setData': (state, action) => ({
      ...state,
      data: action.payload,
      error: null
    }),
    'provider/setPatients': (state, action) => ({
      ...state,
      patients: action.payload
    }),
    'provider/setAppointments': (state, action) => ({
      ...state,
      appointments: action.payload
    }),
    'provider/setLoading': (state, action) => ({
      ...state,
      loading: action.payload
    }),
    'provider/setError': (state, action) => ({
      ...state,
      error: action.payload,
      loading: false
    }),
    'provider/reset': () => initialState
  },
  effects: {
    'provider/load': async (providerId) => {
      try {
        eventService.emit(EVENTS.SYNC.STARTED, { type: 'provider_load' });
        // Load provider data from storage or API
        const data = storage.get(`provider_${providerId}`);
        if (data) {
          return { type: 'provider/setData', payload: data };
        }
        throw new Error('Provider not found');
      } catch (error) {
        errorService.handleError({
          name: 'ProviderError',
          message: 'Failed to load provider data',
          code: 'PROVIDER_LOAD_ERROR',
          context: { providerId, error },
          timestamp: new Date().toISOString(),
          handled: true
        });
        return { type: 'provider/setError', payload: 'Failed to load provider data' };
      }
    }
  },
  middleware: [
    persistence('provider'),
    errorBoundary
  ]
};