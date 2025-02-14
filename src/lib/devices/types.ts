export interface DeviceConfig {
  autoConnect: boolean;
  retryAttempts: number;
  retryDelay: number;
  connectionTimeout: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'blood_pressure' | 'heart_rate' | 'blood_glucose' | 'weight' | 'temperature' | 'oxygen';
  manufacturer: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  batteryLevel: number;
  lastSync: string;
  status: 'connected' | 'disconnected' | 'pairing' | 'error';
  error?: string;
}

export interface DeviceReading {
  id: string;
  deviceId: string;
  type: DeviceInfo['type'];
  value: number | { systolic: number; diastolic: number };
  unit: string;
  timestamp: string;
  metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface DeviceAlert {
  id: string;
  deviceId: string;
  type: 'low_battery' | 'connection_lost' | 'reading_error' | 'out_of_range';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface DeviceThresholds {
  type: DeviceInfo['type'];
  low: number;
  high: number;
  unit: string;
}