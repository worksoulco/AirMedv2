import { deviceService } from './service';
import type { DeviceInfo } from './types';

// Mock devices for testing
const mockDevices: Array<Omit<DeviceInfo, 'id' | 'status' | 'lastSync'>> = [
  {
    name: 'Blood Pressure Monitor',
    type: 'blood_pressure',
    manufacturer: 'Omron',
    model: 'BP786N',
    serialNumber: 'BP123456',
    firmwareVersion: '1.2.3',
    batteryLevel: 85
  },
  {
    name: 'Glucose Meter',
    type: 'blood_glucose',
    manufacturer: 'OneTouch',
    model: 'Verio',
    serialNumber: 'GM789012',
    firmwareVersion: '2.1.0',
    batteryLevel: 92
  },
  {
    name: 'Pulse Oximeter',
    type: 'oxygen',
    manufacturer: 'Nonin',
    model: 'PO3250',
    serialNumber: 'PO345678',
    firmwareVersion: '1.0.5',
    batteryLevel: 78
  }
];

// Function to initialize mock devices
export async function initializeMockDevices() {
  try {
    // Connect mock devices
    for (const device of mockDevices) {
      await deviceService.connectDevice(device);
    }

    // Start generating mock readings
    startMockReadings();
  } catch (error) {
    console.error('Failed to initialize mock devices:', error);
  }
}

// Generate mock readings
function startMockReadings() {
  const devices = deviceService.getDevices();

  devices.forEach(device => {
    setInterval(() => {
      let value: number | { systolic: number; diastolic: number };

      switch (device.type) {
        case 'blood_pressure':
          value = {
            systolic: Math.floor(Math.random() * 40 + 100), // 100-140
            diastolic: Math.floor(Math.random() * 30 + 60) // 60-90
          };
          break;
        case 'blood_glucose':
          value = Math.floor(Math.random() * 100 + 80); // 80-180
          break;
        case 'oxygen':
          value = Math.floor(Math.random() * 5 + 95); // 95-100
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 40 + 60); // 60-100
          break;
        case 'temperature':
          value = Math.floor(Math.random() * 2 + 97); // 97-99
          break;
        default:
          value = 0;
      }

      deviceService.addReading({
        deviceId: device.id,
        type: device.type,
        value,
        unit: device.type === 'blood_pressure' ? 'mmHg' :
              device.type === 'blood_glucose' ? 'mg/dL' :
              device.type === 'oxygen' ? '%' :
              device.type === 'heart_rate' ? 'bpm' :
              device.type === 'temperature' ? '°F' :
              '',
        timestamp: new Date().toISOString(),
        metadata: {
          batteryLevel: device.batteryLevel,
          signalStrength: Math.floor(Math.random() * 30 + 70) // 70-100
        }
      });
    }, 30000); // Generate reading every 30 seconds
  });
}