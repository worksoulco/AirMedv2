import type { User } from './profile';
import type { Provider } from './provider';

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'provider';
  userData: User | Provider;
}