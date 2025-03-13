import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock window.dispatchEvent
window.dispatchEvent = vi.fn();

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
