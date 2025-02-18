import { supabase, checkSupabaseConnection, handleSupabaseError } from './client';
import type { AuthUser } from '@/types/auth';

// Helper to validate user data
function validateUserData(data: any): data is AuthUser {
  if (!data || typeof data !== 'object') return false;
  if (!data.id || typeof data.id !== 'string') return false;
  if (!data.email || typeof data.email !== 'string') return false;
  if (!data.role || !['patient', 'provider'].includes(data.role)) return false;
  if (!data.userData || typeof data.userData !== 'object') return false;
  return true;
}

// Helper to validate password strength
function validatePassword(password: string): { valid: boolean; message: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true, message: '' };
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  userData: {
    name: string;
    role: 'patient' | 'provider';
    title?: string;
  }
): Promise<AuthUser> {
  try {
    // Input validation
    if (!email?.trim()) {
      throw new Error('Please enter your email');
    }

    // Password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    if (!userData.name?.trim()) {
      throw new Error('Please enter your name');
    }
    if (!userData.role || !['patient', 'provider'].includes(userData.role)) {
      throw new Error('Please select a valid role');
    }
    if (userData.role === 'provider' && !userData.title?.trim()) {
      throw new Error('Please enter your title');
    }

    // Check database connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection error. Please click "Connect to Supabase" to set up your connection.');
    }

    // Sign up with Supabase auth
    const { data: { user: authUser }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      if (signUpError.message.includes('already registered')) {
        throw new Error('This email is already registered');
      }
      if (signUpError.message.includes('weak_password')) {
        throw new Error('Password must be at least 6 characters long');
      }
      throw signUpError;
    }

    if (!authUser?.id) {
      throw new Error('Sign up failed - no user data returned');
    }

    // Wait for profile to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to load user profile');
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Build role-specific user data
    const user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      userData: profile.role === 'provider'
        ? {
            ...profile,
            patients: [],
            pendingInvites: []
          }
        : {
            ...profile,
            providers: [],
            pendingProviders: [],
            preferences: profile.metadata?.preferences || {
              notifications: {
                appointments: true,
                labResults: true,
                messages: true,
                reminders: true
              },
              theme: 'light',
              language: 'en'
            }
          }
    };

    // Validate user data
    if (!validateUserData(user)) {
      throw new Error('Invalid user data structure');
    }

    return user;
  } catch (error) {
    // Log the full error for debugging
    console.error('Sign up error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      if (error.message.includes('database')) {
        throw new Error('Database error. Please ensure Supabase is properly connected.');
      }
      if (error.message.includes('auth')) {
        throw new Error('Authentication error. Please try again.');
      }
      // Pass through user-friendly error messages
      throw error;
    }

    // For unknown errors, throw a generic message
    throw new Error('An unexpected error occurred. Please try again.');
  }
}

export async function loginWithSupabase(email: string, password: string): Promise<AuthUser> {
  try {
    // Input validation
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Please enter your email and password');
    }

    // Sign in with Supabase auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Auth error:', authError);
      if (authError.message.includes('Invalid login')) {
        throw new Error('Invalid email or password');
      }
      throw authError;
    }

    if (!authUser?.id) {
      throw new Error('Login failed - no user data returned');
    }

    // Get the base profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to load user profile');
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Build role-specific user data
    const user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      userData: profile.role === 'provider'
        ? {
            ...profile,
            patients: [],
            pendingInvites: []
          }
        : {
            ...profile,
            providers: [],
            pendingProviders: [],
            preferences: profile.metadata?.preferences || {
              notifications: {
                appointments: true,
                labResults: true,
                messages: true,
                reminders: true
              },
              theme: 'light',
              language: 'en'
            }
          }
    };

    // Validate user data
    if (!validateUserData(user)) {
      throw new Error('Invalid user data structure');
    }

    return user;
  } catch (error) {
    // Log the full error for debugging
    console.error('Login error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      if (error.message.includes('database')) {
        throw new Error('Database error. Please ensure Supabase is properly connected.');
      }
      if (error.message.includes('auth')) {
        throw new Error('Authentication error. Please try again.');
      }
      // Pass through user-friendly error messages
      throw error;
    }

    // For unknown errors, throw a generic message
    throw new Error('An unexpected error occurred. Please try again.');
  }
}

export async function logoutFromSupabase() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Always clear local session data even if server logout fails
    localStorage.removeItem('supabase.auth.token');
    throw new Error('Failed to log out. Please clear your browser data.');
  }
}
