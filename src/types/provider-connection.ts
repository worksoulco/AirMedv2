export interface ProviderDetails {
  title: string;
  specialties: string[];
  npi: string;
  facility: {
    name: string;
    address: string;
    phone: string;
  };
}

export interface ProviderData {
  id: string;
  raw_user_meta_data: {
    name: string;
    email: string;
    photo_url?: string;
  };
  provider_details: ProviderDetails[];
}

export interface ProviderConnection {
  id: string;
  created_at: string;
  provider: ProviderData;
}

export interface Provider {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  provider_details: ProviderDetails;
}
