import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please click "Connect to Supabase" to set up your connection.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'supabase.auth.token'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'airmed@1.0.0'
    }
  }
});

// Helper to check database connection
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Database connection not configured');
    }

    // First check auth service
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth service error:', authError);
      throw authError;
    }

    // Then check database connection with a simple query
    const { error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (dbError) {
      if (dbError.message.includes('does not exist')) {
        throw new Error('Database tables not found');
      }
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}

// Helper to handle Supabase errors
export function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);

  if (!error) {
    throw new Error('An unknown error occurred');
  }

  // Handle specific error codes
  if (error.code === '23505') {
    throw new Error('This record already exists');
  }
  if (error.code === '23503') {
    throw new Error('Referenced record not found');
  }
  if (error.code === '42P01') {
    throw new Error('Database table not found');
  }
  if (error.code === '42501') {
    throw new Error('Permission denied');
  }
  if (error.code === '22P02') {
    throw new Error('Invalid data format');
  }

  // Handle auth errors
  if (error.message?.includes('JWT')) {
    throw new Error('Session expired. Please log in again.');
  }
  if (error.message?.includes('auth/')) {
    throw new Error('Authentication error. Please try logging in again.');
  }
  if (error.message?.includes('network')) {
    throw new Error('Network error. Please check your connection.');
  }
  if (error.message?.includes('Database error querying schema')) {
    throw new Error('Database connection error. Please ensure Supabase is properly connected.');
  }

  // Use error message if available, otherwise generic error
  throw new Error(error.message || 'An unexpected error occurred');
}