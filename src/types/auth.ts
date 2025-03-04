import type { User, EmergencyContact } from './profile';
import type { Provider } from './provider';

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'provider';
  userData: User | Provider;
}

export interface ProfileUpdateData {
  date_of_birth: string;
  gender: string;
  height: string;
  weight: string;
  blood_type: string | null;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
}
