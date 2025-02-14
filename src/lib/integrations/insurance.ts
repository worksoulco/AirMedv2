import type { Patient, Appointment } from '@/types/provider';

interface InsuranceConfig {
  baseUrl: string;
  apiKey: string;
  providerId: string;
}

class InsuranceIntegration {
  private config: InsuranceConfig;

  constructor(config: InsuranceConfig) {
    this.config = config;
  }

  async verifyEligibility(patientId: string): Promise<{
    eligible: boolean;
    coverage: {
      type: string;
      planName: string;
      memberId: string;
      groupId: string;
      effectiveDate: string;
      copay: number;
      deductible: {
        individual: number;
        family: number;
        remaining: number;
      };
    };
    restrictions?: string[];
  }> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/eligibility/${patientId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify eligibility');
      }

      return response.json();
    } catch (error) {
      console.error('Insurance Integration Error:', error);
      throw error;
    }
  }

  async submitClaim(appointment: Appointment, diagnosis: string[], procedures: string[]) {
    try {
      const response = await fetch(`${this.config.baseUrl}/claims`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: this.config.providerId,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          serviceDate: appointment.date,
          diagnosis,
          procedures
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit claim');
      }

      return response.json();
    } catch (error) {
      console.error('Insurance Integration Error:', error);
      throw error;
    }
  }

  async getClaimStatus(claimId: string): Promise<{
    status: 'pending' | 'approved' | 'denied' | 'partial';
    amount: {
      billed: number;
      approved: number;
      patientResponsibility: number;
    };
    denialReason?: string;
    notes?: string[];
  }> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/claims/${claimId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get claim status');
      }

      return response.json();
    } catch (error) {
      console.error('Insurance Integration Error:', error);
      throw error;
    }
  }

  async requestPriorAuthorization(patientId: string, {
    medication,
    diagnosis,
    clinicalNotes
  }: {
    medication: string;
    diagnosis: string[];
    clinicalNotes: string;
  }) {
    try {
      const response = await fetch(`${this.config.baseUrl}/prior-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId,
          providerId: this.config.providerId,
          medication,
          diagnosis,
          clinicalNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to request prior authorization');
      }

      return response.json();
    } catch (error) {
      console.error('Insurance Integration Error:', error);
      throw error;
    }
  }
}

export const insuranceClient = new InsuranceIntegration({
  baseUrl: process.env.INSURANCE_API_URL || '',
  apiKey: process.env.INSURANCE_API_KEY || '',
  providerId: process.env.PROVIDER_ID || ''
});