import type { PatientState } from '../config/patient';

export const selectPatient = (state: PatientState) => state.data;
export const selectCheckIns = (state: PatientState) => state.checkIns;
export const selectProtocols = (state: PatientState) => state.protocols;
export const selectPatientLoading = (state: PatientState) => state.loading;
export const selectPatientError = (state: PatientState) => state.error;