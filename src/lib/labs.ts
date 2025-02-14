import { supabase } from './supabase/client';
import type { BiomarkerData } from '@/types/provider';
import { getCurrentUser } from './auth';

// Load labs from Supabase
export async function loadLabs(userId: string): Promise<BiomarkerData[]> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('lab_results')
      .select('*')
      .order('date', { ascending: false });

    // If user is a patient, only show their labs
    if (user.role === 'patient') {
      query = query.eq('patient_id', user.id);
    }
    // If user is a provider, show labs for their patients
    else if (user.role === 'provider') {
      query = query.eq('provider_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading labs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to load labs:', error);
    throw error;
  }
}

// Save lab results
export async function saveLabs(results: Omit<BiomarkerData, 'id'>[]) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Add user IDs to the results
    const resultsWithIds = results.map(result => ({
      ...result,
      patient_id: user.role === 'patient' ? user.id : null,
      provider_id: user.role === 'provider' ? user.id : null
    }));

    const { data, error } = await supabase
      .from('lab_results')
      .insert(resultsWithIds)
      .select();

    if (error) {
      console.error('Error saving labs:', error);
      throw error;
    }

    window.dispatchEvent(new Event('labUpdate'));
    return data;
  } catch (error) {
    console.error('Failed to save labs:', error);
    throw error;
  }
}

// Subscribe to real-time lab updates
export function subscribeToLabUpdates(userId: string) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Subscribe to labs based on user role
  const channel = user.role === 'patient'
    ? supabase
        .channel('lab_results')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lab_results',
            filter: `patient_id=eq.${user.id}`
          },
          () => window.dispatchEvent(new Event('labUpdate'))
        )
        .subscribe()
    : supabase
        .channel('lab_results')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lab_results',
            filter: `provider_id=eq.${user.id}`
          },
          () => window.dispatchEvent(new Event('labUpdate'))
        )
        .subscribe();

  return () => {
    channel.unsubscribe();
  };
}