export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  height: string;
  weight: string;
  bloodType: string;
  address: string;
  photo: string;
  emergencyContact: EmergencyContact;
  providers: HealthcareProvider[];
  pendingProviders: PendingProvider[];
  preferences: {
    notifications: {
      appointments: boolean;
      labResults: boolean;
      messages: boolean;
      reminders: boolean;
    };
    theme: 'light' | 'dark';
    language: string;
  };
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface HealthcareProvider {
  id: string;
  name: string;
  role: string;
  facility: string;
  phone: string;
  email: string;
  photo: string;
  connectionCode?: string;
  verified: boolean;
}

export interface PendingProvider {
  id: string;
  connectionCode: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
}