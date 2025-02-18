import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import type { User as ProfileUser } from '@/types/profile';
import type { Provider } from '@/types/provider';
import type { AuthUser } from '@/types/auth';
export type { AuthUser };

function getUserFromSession(user: SupabaseUser): AuthUser {
  const role = user.user_metadata.role || 'patient';
  const baseUserData = {
    id: user.id,
    name: user.user_metadata.name || 'Unknown User',
    email: user.email!,
    photo: user.user_metadata.photo_url,
  };

  if (role === 'provider') {
    const providerData: Provider = {
      ...baseUserData,
      title: user.user_metadata.title || '',
      specialties: [],
      npi: '',
      phone: '',
      facility: {
        name: '',
        address: '',
        phone: ''
      },
      patients: [],
      pendingInvites: []
    };
    return {
      id: user.id,
      email: user.email!,
      role: 'provider',
      userData: providerData
    };
  } else {
    const userData: ProfileUser = {
      ...baseUserData,
      phone: '',
      dateOfBirth: '',
      gender: 'other',
      height: '',
      weight: '',
      bloodType: '',
      address: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      },
      providers: [],
      pendingProviders: [],
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
    return {
      id: user.id,
      email: user.email!,
      role: 'patient',
      userData: userData
    };
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(getUserFromSession(session.user));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(getUserFromSession(session.user));
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return { user, signOut };
}
