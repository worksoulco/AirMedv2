import { supabase, checkSupabaseConnection, handleSupabaseError } from './supabase/client';
import type { AuthUser, ProfileUpdateData } from '../types/auth';

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

    // Wait for profile to be created by trigger with retries
    let profile = null;
    let profileError = null;
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 2000; // 2 seconds between attempts

    while (!profile && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (!result.error && result.data) {
        profile = result.data;
        break;
      }
      
      profileError = result.error;
      console.log(`Attempt ${attempts}: Profile fetch failed, retrying...`);
    }

    if (!profile) {
      throw new Error(
        profileError ? 
        `Failed to create profile: ${profileError.message}` :
        'Failed to create profile after multiple attempts'
      );
    }

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
  } catch (error: unknown) {
    console.error('Sign up error:', error);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('supabase.auth.token');
    
    // Enhanced error handling for common cases
    if (error instanceof Error) {
      if (error.message.includes('Profile already exists')) {
        throw new Error('An account with this email already exists. Please log in instead.');
      } else if (error.message.includes('Failed to create profile')) {
        throw new Error('Failed to set up your account. Please try again or contact support if the problem persists.');
      } else if (error.message.includes('Invalid user data structure')) {
        // This can happen if the profile creation succeeded but validation failed
        // Try to fetch the profile directly
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
          
          if (profile) {
            // Build user object
            const user: AuthUser = {
              id: profile.id,
              email: profile.email,
              role: profile.role,
              userData: profile
            };
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.dispatchEvent(new Event('authUpdate'));
            
            return user;
          }
        } catch (fetchError) {
          console.error('Error fetching profile after signup:', fetchError);
        }
        
        throw new Error('Account created but profile setup failed. Please try logging in.');
      }
    }
    
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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

// Update user profile
export async function updateUserProfile(profileData: ProfileUpdateData): Promise<AuthUser> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser?.id) {
      throw new Error('No authenticated user found');
    }

    // Check database connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection error. Please check your connection.');
    }

    // Update profile in database
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender,
        height: profileData.height,
        weight: profileData.weight,
        blood_type: profileData.blood_type,
        emergency_contact: profileData.emergency_contact
      })
      .eq('id', currentUser.id)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!profile) throw new Error('Failed to update profile');

    // Build updated user object
    const updatedUser: AuthUser = {
      ...currentUser,
      userData: profile
    };

    // Validate and store updated user data
    if (!validateUserData(updatedUser)) {
      throw new Error('Invalid user data structure');
    }

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('authUpdate'));
    
    return updatedUser;
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    throw handleSupabaseError(error);
  }
}
