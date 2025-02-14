import type { Medication, Patient } from '@/types/provider';

interface PharmacyConfig {
  baseUrl: string;
  apiKey: string;
  pharmacyId: string;
}

class PharmacyIntegration {
  private config: PharmacyConfig;

  constructor(config: PharmacyConfig) {
    this.config = config;
  }

  async prescribeMedication(patientId: string, prescription: Omit<Medication, 'id' | 'status'>) {
    try {
      const response = await fetch(`${this.config.baseUrl}/prescriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId,
          pharmacyId: this.config.pharmacyId,
          medication: prescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit prescription');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Pharmacy Integration Error:', error);
      throw error;
    }
  }

  async getMedicationHistory(patientId: string): Promise<Medication[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/medications?patientId=${patientId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch medication history');
      }

      const data = await response.json();
      return data.medications;
    } catch (error) {
      console.error('Pharmacy Integration Error:', error);
      throw error;
    }
  }

  async checkDrugInteractions(medications: string[]): Promise<{
    severity: 'high' | 'moderate' | 'low';
    description: string;
    recommendations: string[];
  }[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/interactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ medications })
      });

      if (!response.ok) {
        throw new Error('Failed to check drug interactions');
      }

      const data = await response.json();
      return data.interactions;
    } catch (error) {
      console.error('Pharmacy Integration Error:', error);
      throw error;
    }
  }

  async subscribeToRefillRequests(callback: (request: {
    patientId: string;
    medicationId: string;
    requestDate: string;
  }) => void) {
    const ws = new WebSocket(`${this.config.baseUrl.replace('http', 'ws')}/refills`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => ws.close();
  }
}

export const pharmacyClient = new PharmacyIntegration({
  baseUrl: process.env.PHARMACY_API_URL || '',
  apiKey: process.env.PHARMACY_API_KEY || '',
  pharmacyId: process.env.PHARMACY_ID || ''
});