import { User, EmergencyContact, HealthcareProvider, PendingProvider } from '../types/profile';

// Load user profile from localStorage
export function loadProfile(): User | null {
  const stored = localStorage.getItem('userProfile');
  return stored ? JSON.parse(stored) : null;
}

// Save user profile to localStorage
export function saveProfile(profile: User) {
  localStorage.setItem('userProfile', JSON.stringify(profile));
  // Dispatch custom event to notify components of the update
  window.dispatchEvent(new Event('profileUpdate'));
}

// Default profile data
export const defaultProfile: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '(555) 123-4567',
  dateOfBirth: '1985-06-15',
  gender: 'male',
  height: '5\'10"',
  weight: '160',
  bloodType: 'O+',
  address: '123 Health St, Medical City, MC 12345',
  photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&q=80&fit=crop',
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '(555) 987-6543'
  },
  providers: [
    {
      id: '1',
      name: 'Dr. Sarah Chen',
      role: 'Primary Care Physician',
      facility: 'HealthCare Medical Center',
      phone: '(555) 234-5678',
      email: 'dr.chen@healthcare.com',
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&q=80&fit=crop'
    }
  ],
  preferences: {
    notifications: {
      appointments: true,
      labResults: true,
      messages: true,
      reminders: true
    },
    theme: 'light',
    language: 'en'
  }
};

// Initialize profile if it doesn't exist
export function initializeProfile() {
  if (!loadProfile()) {
    saveProfile(defaultProfile);
  }
}

// Update profile
export function updateProfile(updates: Partial<User>) {
  const currentProfile = loadProfile();
  if (currentProfile) {
    const updatedProfile = { ...currentProfile, ...updates };
    saveProfile(updatedProfile);
    return updatedProfile;
  }
  return null;
}

// Update emergency contact
export function updateEmergencyContact(contact: EmergencyContact) {
  const currentProfile = loadProfile();
  if (currentProfile) {
    const updatedProfile = { ...currentProfile, emergencyContact: contact };
    saveProfile(updatedProfile);
    return updatedProfile;
  }
  return null;
}

// Add healthcare provider
export function addProvider(provider: HealthcareProvider) {
  const currentProfile = loadProfile();
  if (currentProfile) {
    const updatedProfile = {
      ...currentProfile,
      providers: [...currentProfile.providers, { ...provider, id: Date.now().toString() }]
    };
    saveProfile(updatedProfile);
    return updatedProfile;
  }
  return null;
}

// Remove healthcare provider
export function removeProvider(providerId: string) {
  const currentProfile = loadProfile();
  if (currentProfile) {
    const updatedProfile = {
      ...currentProfile,
      providers: currentProfile.providers.filter(p => p.id !== providerId)
    };
    saveProfile(updatedProfile);
    return updatedProfile;
  }
  return null;
}

// Update notification preferences
export function updateNotificationPreferences(preferences: User['preferences']['notifications']) {
  const currentProfile = loadProfile();
  if (currentProfile) {
    const updatedProfile = {
      ...currentProfile,
      preferences: {
        ...currentProfile.preferences,
        notifications: preferences
      }
    };
    saveProfile(updatedProfile);
    return updatedProfile;
  }
  return null;
}

// Generate a unique connection code
function generateConnectionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 8;
  let code = '';
  for (let i = 0; i < codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Request provider connection
export function requestProviderConnection(connectionCode: string) {
  const currentProfile = loadProfile();
  if (!currentProfile) return null;

  // Check if code is already pending or connected
  const isPending = currentProfile.pendingProviders?.some(
    p => p.connectionCode === connectionCode
  );
  const isConnected = currentProfile.providers.some(
    p => p.connectionCode === connectionCode
  );

  if (isPending || isConnected) {
    throw new Error('This connection code has already been used');
  }

  const pendingProvider: PendingProvider = {
    id: Date.now().toString(),
    connectionCode,
    status: 'pending',
    requestDate: new Date().toISOString()
  };

  const updatedProfile = {
    ...currentProfile,
    pendingProviders: [...(currentProfile.pendingProviders || []), pendingProvider]
  };

  saveProfile(updatedProfile);
  return updatedProfile;
}

// Add provider with verification
export function addProviderWithVerification(provider: Omit<HealthcareProvider, 'id' | 'connectionCode' | 'verified'>) {
  const connectionCode = generateConnectionCode();
  const newProvider: HealthcareProvider = {
    ...provider,
    id: Date.now().toString(),
    connectionCode,
    verified: false
  };

  const currentProfile = loadProfile();
  if (!currentProfile) return null;

  const updatedProfile = {
    ...currentProfile,
    providers: [...currentProfile.providers, newProvider]
  };

  saveProfile(updatedProfile);
  return { provider: newProvider, connectionCode };
}

// Approve pending provider
export function approvePendingProvider(providerId: string) {
  const currentProfile = loadProfile();
  if (!currentProfile) return null;

  const pendingProvider = currentProfile.pendingProviders?.find(p => p.id === providerId);
  if (!pendingProvider) return null;

  const updatedProfile = {
    ...currentProfile,
    pendingProviders: currentProfile.pendingProviders.filter(p => p.id !== providerId),
    providers: currentProfile.providers.map(p => 
      p.connectionCode === pendingProvider.connectionCode
        ? { ...p, verified: true }
        : p
    )
  };

  saveProfile(updatedProfile);
  return updatedProfile;
}

// Reject pending provider
export function rejectPendingProvider(providerId: string) {
  const currentProfile = loadProfile();
  if (!currentProfile) return null;

  const updatedProfile = {
    ...currentProfile,
    pendingProviders: currentProfile.pendingProviders.filter(p => p.id !== providerId)
  };

  saveProfile(updatedProfile);
  return updatedProfile;
}

// Remove provider connection
export function removeProviderConnection(providerId: string) {
  const currentProfile = loadProfile();
  if (!currentProfile) return null;

  const updatedProfile = {
    ...currentProfile,
    providers: currentProfile.providers.filter(p => p.id !== providerId)
  };

  saveProfile(updatedProfile);
  return updatedProfile;
}