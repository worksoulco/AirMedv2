import type { User } from '@/types/profile';
import type { Provider } from '@/types/provider';

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'provider';
  userData: User | Provider;
  metadata: {
    lastLogin: string;
    lastActive: string;
    deviceId?: string;
    ipAddress?: string;
  };
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  deviceInfo: {
    id: string;
    type: string;
    name: string;
    platform: string;
  };
}

export interface AuthError extends Error {
  code: 'invalid_credentials' | 'session_expired' | 'not_authenticated' | 'unauthorized';
  metadata?: Record<string, any>;
}