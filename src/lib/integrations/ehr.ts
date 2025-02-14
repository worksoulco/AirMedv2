import type { BiomarkerData } from '@/types/provider';

interface EHRConfig {
  baseUrl: string;
  apiKey: string;
  organizationId: string;
}

class EHRIntegration {
  private config: EHRConfig;

  constructor(config: EHRConfig) {
    this.config = config;
  }

  async fetchLabResults(patientId: string): Promise<BiomarkerData[]> {
    // Mock implementation
    const mockLabs: BiomarkerData[] = [
      {
        name: 'Hemoglobin A1C',
        value: 5.7,
        unit: '%',
        referenceRange: '4.0-5.6',
        status: 'high',
        category: 'Diabetes',
        date: new Date().toISOString(),
        metadata: {
          loinc: '4548-4',
          method: 'High Performance Liquid Chromatography',
          performer: 'Main Lab'
        }
      },
      {
        name: 'Total Cholesterol',
        value: 180,
        unit: 'mg/dL',
        referenceRange: '125-200',
        status: 'normal',
        category: 'Lipids',
        date: new Date().toISOString(),
        metadata: {
          loinc: '2093-3',
          method: 'Enzymatic',
          performer: 'Main Lab'
        }
      }
    ];

    return mockLabs;
  }

  subscribeToUpdates(patientId: string, callback: (data: BiomarkerData) => void) {
    // Mock WebSocket implementation
    const interval = setInterval(() => {
      const mockUpdate: BiomarkerData = {
        name: 'Blood Glucose',
        value: Math.floor(Math.random() * 100 + 80),
        unit: 'mg/dL',
        referenceRange: '70-100',
        status: 'normal',
        category: 'Diabetes',
        date: new Date().toISOString(),
        metadata: {
          loinc: '2339-0',
          method: 'Hexokinase',
          performer: 'Point of Care'
        }
      };
      callback(mockUpdate);
    }, 60000);

    return () => clearInterval(interval);
  }
}

// Initialize with mock config
export const ehrClient = new EHRIntegration({
  baseUrl: 'https://api.example.com/ehr',
  apiKey: 'mock-key',
  organizationId: 'mock-org'
});