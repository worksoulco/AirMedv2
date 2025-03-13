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

    // Then check database connection by querying profiles table
    const { error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (dbError) {
      console.error('Database error:', dbError);
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
  
  // Handle specific auth errors
  if (error.message?.includes('Database error saving new user')) {
    throw new Error('Unable to create your account at this time. Please try again later or contact support.');
  }
  if (error.message?.includes('User already registered')) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }
  if (error.message?.includes('Email link is invalid or has expired')) {
    throw new Error('The email verification link is invalid or has expired. Please request a new one.');
  }
  if (error.message?.includes('Email not confirmed')) {
    throw new Error('Please verify your email address before logging in.');
  }
  if (error.message?.includes('Invalid login credentials')) {
    throw new Error('Invalid email or password. Please try again.');
  }

  // Use error message if available, otherwise generic error
  throw new Error(error.message || 'Unexpected failure, please check server logs for more information');
}
