// Add DeviceReading type
export interface DeviceReading {
  timestamp: string;
  type: 'blood_pressure' | 'heart_rate' | 'blood_glucose' | 'weight' | 'temperature' | 'oxygen';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  deviceId: string;
}

// Add BiomarkerData type to provider types
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
  };
}