import type { StoreConfig } from '../types';
import { storage } from '../../storage';
import { errorService } from '../../errors/service';
import { eventService, EVENTS } from '../../events';
import { persistence, errorBoundary } from '../middleware';
import type { Patient } from '@/types/provider';

interface PatientState {
  data: Patient | null;
  checkIns: any[];
  protocols: any[];
  loading: boolean;
  error: string | null;
}

const initialState: PatientState = {
  data: storage.get('currentPatient'),
  checkIns: [],
  protocols: [],
  loading: false,
  error: null
};

export const patientStore: StoreConfig = {
  name: 'patient',
  initialState,
  reducers: {
    'patient/setData': (state, action) => ({
      ...state,
      data: action.payload,
      error: null
    }),
    'patient/setCheckIns': (state, action) => ({
      ...state,
      checkIns: action.payload
    }),
    'patient/setProtocols': (state, action) => ({
      ...state,
      protocols: action.payload
    }),
    'patient/setLoading': (state, action) => ({
      ...state,
      loading: action.payload
    }),
    'patient/setError': (state, action) => ({
      ...state,
      error: action.payload,
      loading: false
    }),
    'patient/reset': () => initialState
  },
  effects: {
    'patient/load': async (patientId) => {
      try {
        eventService.emit(EVENTS.SYNC.STARTED, { type: 'patient_load' });
        // Load patient data from storage or API
        const data = storage.get(`patient_${patientId}`);
        if (data) {
          return { type: 'patient/setData', payload: data };
        }
        throw new Error('Patient not found');
      } catch (error) {
        errorService.handleError({
          name: 'PatientError',
          message: 'Failed to load patient data',
          code: 'PATIENT_LOAD_ERROR',
          context: { patientId, error },
          timestamp: new Date().toISOString(),
          handled: true
        });
        return { type: 'patient/setError', payload: 'Failed to load patient data' };
      }
    }
  },
  middleware: [
    persistence('patient'),
    errorBoundary
  ]
};