import { supabase, checkSupabaseConnection } from './client';
import type { CheckIn } from '@/types/tracking';

// Helper function to validate UUID format
function isValidUUID(uuid: string | undefined | null): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper to handle Supabase errors
function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);
  
  if (error.message?.includes('JWT')) {
    throw new Error('Authentication error. Please log in again.');
  }
  if (error.code === '42P01') {
    throw new Error('Database table not found. Please ensure the database is properly set up.');
  }
  if (error.code === '23505') {
    throw new Error('A check-in for this date already exists.');
  }
  if (error.code === '22P02') {
    throw new Error('Invalid data format. Please ensure all fields are in the correct format.');
  }
  throw new Error(error.message || 'An unexpected error occurred');
}

export async function saveCheckIn(checkIn: Omit<CheckIn, 'id' | 'created_at'>) {
  try {
    // Validate connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to database. Please check your connection.');
    }

    // Validate UUID
    if (!isValidUUID(checkIn.userId)) {
      throw new Error('Invalid user ID format. Please log out and log in again.');
    }

    const { data, error } = await supabase
      .from('check_ins')
      .insert([{
        patient_id: checkIn.userId,
        date: checkIn.date,
        mood: checkIn.mood,
        sleep: checkIn.sleep,
        stress: checkIn.stress,
        energy: checkIn.energy,
        notes: checkIn.notes,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function getCheckIns(userId: string, startDate: string, endDate: string) {
  try {
    // Validate connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to database. Please check your connection.');
    }

    // Validate UUID
    if (!isValidUUID(userId)) {
      throw new Error('Invalid user ID format. Please log out and log in again.');
    }

    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('patient_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function getCheckInMetrics(userId: string, startDate: string, endDate: string) {
  try {
    // Validate connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to database. Please check your connection.');
    }

    // Validate UUID
    if (!isValidUUID(userId)) {
      throw new Error('Invalid user ID format. Please log out and log in again.');
    }

    const { data, error } = await supabase
      .rpc('get_patient_metrics', {
        p_patient_id: userId,
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export async function updateCheckIn(
  userId: string,
  date: string,
  updates: Partial<Omit<CheckIn, 'id' | 'userId' | 'date' | 'created_at'>>
) {
  try {
    // Validate connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to database. Please check your connection.');
    }

    // Validate UUID
    if (!isValidUUID(userId)) {
      throw new Error('Invalid user ID format. Please log out and log in again.');
    }

    const { data, error } = await supabase
      .from('check_ins')
      .update(updates)
      .eq('patient_id', userId)
      .eq('date', date)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
  }
}

export function subscribeToCheckIns(userId: string, callback: (payload: any) => void) {
  try {
    // Validate UUID
    if (!isValidUUID(userId)) {
      throw new Error('Invalid user ID format. Please log out and log in again.');
    }

    return supabase
      .channel('check-ins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `patient_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  } catch (error) {
    console.error('Error subscribing to check-ins:', error);
    throw error;
  }
}