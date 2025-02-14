import type { DeviceReading } from '@/types/provider';

interface DeviceConfig {
  baseUrl: string;
  apiKey: string;
}

class DeviceIntegration {
  private config: DeviceConfig;
  private ws: WebSocket | null = null;

  constructor(config: DeviceConfig) {
    this.config = config;
  }

  async getDeviceReadings(patientId: string, type: DeviceReading['type'], startDate: string, endDate: string) {
    // For demo purposes, generate mock data
    const readings: DeviceReading[] = [];
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const interval = (end - start) / 10; // 10 readings over the period

    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(start + interval * i).toISOString();
      let value: DeviceReading['value'];

      switch (type) {
        case 'blood_pressure':
          value = {
            systolic: Math.floor(Math.random() * 40 + 100), // 100-140
            diastolic: Math.floor(Math.random() * 30 + 60), // 60-90
          };
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 40 + 60); // 60-100
          break;
        case 'blood_glucose':
          value = Math.floor(Math.random() * 100 + 80); // 80-180
          break;
        case 'weight':
          value = Math.floor(Math.random() * 50 + 130); // 130-180
          break;
        case 'temperature':
          value = Math.floor(Math.random() * 2 + 97); // 97-99
          break;
        case 'oxygen':
          value = Math.floor(Math.random() * 5 + 95); // 95-100
          break;
      }

      readings.push({
        timestamp,
        type,
        value,
        unit: type === 'blood_pressure' ? 'mmHg' :
              type === 'heart_rate' ? 'bpm' :
              type === 'blood_glucose' ? 'mg/dL' :
              type === 'weight' ? 'lbs' :
              type === 'temperature' ? '°F' :
              '%',
        deviceId: `mock-${type}-device`
      });
    }

    return readings;
  }

  subscribeToReadings(patientId: string, callback: (reading: DeviceReading) => void) {
    // For demo, simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      const types: DeviceReading['type'][] = [
        'blood_pressure', 'heart_rate', 'blood_glucose',
        'weight', 'temperature', 'oxygen'
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let value: DeviceReading['value'];
      switch (type) {
        case 'blood_pressure':
          value = {
            systolic: Math.floor(Math.random() * 40 + 100),
            diastolic: Math.floor(Math.random() * 30 + 60),
          };
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 40 + 60);
          break;
        case 'blood_glucose':
          value = Math.floor(Math.random() * 100 + 80);
          break;
        case 'weight':
          value = Math.floor(Math.random() * 50 + 130);
          break;
        case 'temperature':
          value = Math.floor(Math.random() * 2 + 97);
          break;
        case 'oxygen':
          value = Math.floor(Math.random() * 5 + 95);
          break;
      }

      const reading: DeviceReading = {
        timestamp: new Date().toISOString(),
        type,
        value,
        unit: type === 'blood_pressure' ? 'mmHg' :
              type === 'heart_rate' ? 'bpm' :
              type === 'blood_glucose' ? 'mg/dL' :
              type === 'weight' ? 'lbs' :
              type === 'temperature' ? '°F' :
              '%',
        deviceId: `mock-${type}-device`
      };

      callback(reading);
    }, 30000);

    return () => clearInterval(interval);
  }

  async setAlertThresholds(patientId: string, thresholds: {
    type: DeviceReading['type'];
    min?: number;
    max?: number;
  }[]) {
    // Mock implementation
    return { success: true };
  }

  async getDeviceStatus(deviceId: string) {
    // Mock implementation
    return {
      connected: true,
      batteryLevel: Math.random() * 100,
      lastSync: new Date().toISOString(),
      firmware: '1.0.0'
    };
  }
}

// Initialize with mock config
export const deviceClient = new DeviceIntegration({
  baseUrl: 'https://api.example.com/devices',
  apiKey: 'mock-key'
});