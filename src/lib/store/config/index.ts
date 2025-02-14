export * from './app';
export * from './patient';
export * from './provider';

import { storeManager } from '../manager';
import { appStore } from './app';
import { patientStore } from './patient';
import { providerStore } from './provider';

// Initialize stores
export function initializeStores() {
  storeManager.createStore(appStore);
  storeManager.createStore(patientStore);
  storeManager.createStore(providerStore);
}