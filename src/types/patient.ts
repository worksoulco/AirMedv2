export interface Patient {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  metadata?: Record<string, any>;
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

export interface HealthMetric {
  id: string;
  patientName: string;
  metric: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: string;
}
