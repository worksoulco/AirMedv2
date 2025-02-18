import type { Patient } from './patient';

export interface Provider {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  npi: string;
  email: string;
  phone: string;
  photo: string;
  facility: {
    name: string;
    address: string;
    phone: string;
  };
  patients: Patient[];
  pendingInvites: PatientInvite[];
}

export interface PatientInvite {
  id: string;
  name: string;
  email: string;
  code: string;
  sentDate: string;
  expiryDate: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface PatientAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'wellness' | 'lab' | 'medication' | 'appointment';
  severity: 'high' | 'medium' | 'low';
  message: string;
  date: string;
}

export interface WellnessMetric {
  id: string;
  patientName: string;
  metric: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: string;
}

export interface Appointment {
  id: string;
  providerId: string;
  patientId: string;
  date: string;
  time: string;
  type: 'initial' | 'followup' | 'checkup';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'file' | 'system';
  metadata?: Record<string, any>;
}

export interface ClinicalNote {
  id: string;
  date: string;
  type: 'visit' | 'phone' | 'message' | 'lab' | 'other';
  content: string;
  provider: string;
  private: boolean;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

export interface DeviceReading {
  timestamp: string;
  type: 'blood_pressure' | 'heart_rate' | 'blood_glucose' | 'weight' | 'temperature' | 'oxygen';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  deviceId: string;
}

export interface BiomarkerData {
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
  category: string;
  date: string;
  metadata?: {
    loinc?: string;
    method?: string;
    specimen?: string;
    performer?: string;
    pdfFile?: string;
  };
}
