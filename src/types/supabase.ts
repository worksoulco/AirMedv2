export interface ProviderResponse {
  id: string;
  raw_user_meta_data: {
    name: string;
    email: string;
    photo_url?: string;
  };
  provider_details: Array<{
    title: string;
    specialties: string[];
    npi: string;
    facility: {
      name: string;
      address: string;
      phone: string;
    };
  }>;
}

export interface PatientResponse {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  metadata?: Record<string, any>;
}

export interface PatientProviderResponse {
  id: string;
  provider: ProviderResponse;
}

export interface ProviderPatientResponse {
  id: string;
  patient: PatientResponse;
}
