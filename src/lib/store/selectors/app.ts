import type { AppState } from '../config/app';

export const selectTheme = (state: AppState) => state.theme;
export const selectLanguage = (state: AppState) => state.language;
export const selectNotifications = (state: AppState) => state.notifications;
export const selectLastSync = (state: AppState) => state.lastSync;
export const selectDeviceId = (state: AppState) => state.deviceId;