import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signUp, login, logout, getCurrentUser, isAuthenticated, getUserRole } from './auth';
import { supabase } from './supabase/client';

// Mock the supabase client
vi.mock('./supabase/client', () => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn()
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis()
  };

  return {
    supabase: mockSupabase,
    checkSupabaseConnection: vi.fn().mockResolvedValue(true),
    handleSupabaseError: vi.fn(error => {
      throw new Error(error.message || 'Mocked error');
    })
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.dispatchEvent
window.dispatchEvent = vi.fn();

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      // Mock successful auth signup
      const mockAuthUser = { id: 'test-id' };
      const mockProfile = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'patient',
        name: 'Test User'
      };

      // Setup mocks
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      (supabase.from as any)().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      // Call the function
      const result = await signUp('test@example.com', 'password123', {
        name: 'Test User',
        role: 'patient'
      });

      // Assertions
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
            role: 'patient',
            title: undefined
          }
        }
      });

      expect(result).toEqual({
        id: 'test-id',
        email: 'test@example.com',
        role: 'patient',
        userData: mockProfile
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(window.dispatchEvent).toHaveBeenCalled();
    });

    it('should throw an error if signup fails', async () => {
      // Mock failed auth signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Database error saving new user' }
      });

      // Call the function and expect it to throw
      await expect(
        signUp('test@example.com', 'password123', {
          name: 'Test User',
          role: 'patient'
        })
      ).rejects.toThrow();

      // Verify localStorage was cleaned
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token');
    });

    it('should validate required fields', async () => {
      await expect(
        signUp('', 'password123', {
          name: 'Test User',
          role: 'patient'
        })
      ).rejects.toThrow('Please enter your email and password');

      await expect(
        signUp('test@example.com', '', {
          name: 'Test User',
          role: 'patient'
        })
      ).rejects.toThrow('Please enter your email and password');

      await expect(
        signUp('test@example.com', 'password123', {
          name: '',
          role: 'patient'
        })
      ).rejects.toThrow('Please enter your name');

      await expect(
        signUp('test@example.com', 'password123', {
          name: 'Test User',
          role: 'provider'
        })
      ).rejects.toThrow('Please enter your title');
    });
  });

  describe('login', () => {
    it('should successfully log in a user', async () => {
      // Mock successful auth login
      const mockAuthUser = { id: 'test-id' };
      const mockProfile = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'patient',
        name: 'Test User'
      };

      // Setup mocks
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      (supabase.from as any)().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      // Call the function
      const result = await login('test@example.com', 'password123');

      // Assertions
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toEqual({
        id: 'test-id',
        email: 'test@example.com',
        role: 'patient',
        userData: mockProfile
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(window.dispatchEvent).toHaveBeenCalled();
    });

    it('should throw an error if login fails', async () => {
      // Mock failed auth login
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' }
      });

      // Call the function and expect it to throw
      await expect(
        login('test@example.com', 'password123')
      ).rejects.toThrow();

      // Verify localStorage was cleaned
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token');
    });
  });

  describe('logout', () => {
    it('should successfully log out a user', async () => {
      // Mock successful auth logout
      (supabase.auth.signOut as any).mockResolvedValue({
        error: null
      });

      // Call the function
      await logout();

      // Assertions
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token');
      expect(window.dispatchEvent).toHaveBeenCalled();
    });

    it('should still clear local storage if logout fails', async () => {
      // Mock failed auth logout
      (supabase.auth.signOut as any).mockResolvedValue({
        error: { message: 'Network error' }
      });

      // Call the function and expect it to throw
      await expect(logout()).rejects.toThrow();

      // Verify localStorage was still cleaned
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token');
      expect(window.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user from localStorage', () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'patient',
        userData: { id: 'test-id', email: 'test@example.com', role: 'patient' }
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

      const result = getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it('should return null if no user in localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return null and clean localStorage if invalid user data', () => {
      const invalidUser = { id: 'invalid' }; // Missing required fields
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(invalidUser));

      const result = getCurrentUser();
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if user is authenticated', () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'patient',
        userData: { id: 'test-id', email: 'test@example.com', role: 'patient' }
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

      const result = isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false if user is not authenticated', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('should return the user role if authenticated', () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'provider',
        userData: { id: 'test-id', email: 'test@example.com', role: 'provider' }
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

      const result = getUserRole();
      expect(result).toBe('provider');
    });

    it('should return null if not authenticated', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = getUserRole();
      expect(result).toBeNull();
    });
  });
});
