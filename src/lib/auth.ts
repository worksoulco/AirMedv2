import { supabase, checkSupabaseConnection, handleSupabaseError } from './supabase/client';
import type { AuthUser } from './types/auth';

// Helper function to validate UUID format
function isValidUUID(uuid: string | undefined | null): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to validate user data structure
function validateUserData(data: any): data is AuthUser {
  if (!data || typeof data !== 'object') return false;
  if (!isValidUUID(data.id)) return false;
  if (!data.email || typeof data.email !== 'string') return false;
  if (!data.role || !['patient', 'provider'].includes(data.role)) return false;
  if (!data.userData || typeof data.userData !== 'object') return false;
  return true;
}

// Get current authenticated user
export function getCurrentUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return null;
    
    const user = JSON.parse(stored);
    
    // Validate user data structure
    if (!validateUserData(user)) {
      console.error('Invalid user data structure in localStorage');
      localStorage.removeItem('currentUser');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    localStorage.removeItem('currentUser');
    return null;
  }
}

// Sign up
export async function signUp(
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
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Please enter your email and password');
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
        data: {
          name: userData.name.trim(),
          role: userData.role,
          title: userData.title?.trim()
        }
      }
    });

    if (signUpError) throw signUpError;
    if (!authUser?.id) throw new Error('Sign up failed - no user data returned');

    // Wait for profile to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error('User profile not found');

    // Build user object
    const user: AuthUser = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      userData: profile
    };

    // Validate and store user data
    if (!validateUserData(user)) {
      throw new Error('Invalid user data structure');
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    window.dispatchEvent(new Event('authUpdate'));
    
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('supabase.auth.token');
    throw handleSupabaseError(error);
  }
}

// Login
export async function login(email: string, password: string): Promise<AuthUser> {
  try {
    // Input validation
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Please enter your email and password');
    }

    // Check database connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection error. Please click "Connect to Supabase" to set up your connection.');
    }

    // Sign in with Supabase auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;
    if (!authUser?.id) throw new Error('Login failed - no user data returned');

    // Get the base profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error('User profile not found');

    // Build user object
    const user: AuthUser = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      userData: profile
    };

    // Validate user data
    if (!validateUserData(user)) {
      throw new Error('Invalid user data structure');
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    window.dispatchEvent(new Event('authUpdate'));
    
    return user;
  } catch (error) {
    console.error('Login error:', error);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('supabase.auth.token');
    throw handleSupabaseError(error);
  }
}

// Logout
export async function logout(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    localStorage.removeItem('currentUser');
    localStorage.removeItem('supabase.auth.token');
    window.dispatchEvent(new Event('authUpdate'));
  } catch (error) {
    console.error('Logout error:', error);
    // Still remove local data even if Supabase logout fails
    localStorage.removeItem('currentUser');
    localStorage.removeItem('supabase.auth.token');
    window.dispatchEvent(new Event('authUpdate'));
    throw new Error('Failed to log out completely. Please clear your browser data.');
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// Get user role
export function getUserRole(): 'patient' | 'provider' | null {
  const user = getCurrentUser();
  return user ? user.role : null;
}