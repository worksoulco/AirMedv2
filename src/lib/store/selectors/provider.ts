import type { ProviderState } from '../config/provider';

export const selectProvider = (state: ProviderState) => state.data;
export const selectPatients = (state: ProviderState) => state.patients;
export const selectAppointments = (state: ProviderState) => state.appointments;
export const selectProviderLoading = (state: ProviderState) => state.loading;
export const selectProviderError = (state: ProviderState) => state.error;