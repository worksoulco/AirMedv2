import { eventService, EVENTS } from '../events';
import { storage } from '../storage';
import type { AuthUser, AuthSession, AuthError } from './types';

class AuthService {
  private currentUser: AuthUser | null = null;
  private currentSession: AuthSession | null = null;

  constructor() {
    // Load saved session on initialization
    this.loadSession();
  }

  private loadSession() {
    try {
      const savedUser = storage.get<AuthUser>('currentUser');
      const savedSession = storage.get<AuthSession>('currentSession');

      if (savedUser && savedSession) {
        // Check if session is expired
        if (new Date(savedSession.expiresAt) > new Date()) {
          this.currentUser = savedUser;
          this.currentSession = savedSession;
          this.updateLastActive();
        } else {
          this.logout(); // Clear expired session
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.logout(); // Clear invalid session
    }
  }

  private updateLastActive() {
    if (this.currentUser) {
      this.currentUser.metadata.lastActive = new Date().toISOString();
      storage.set('currentUser', this.currentUser);
    }
  }

  private createSession(user: AuthUser): AuthSession {
    const session: AuthSession = {
      id: crypto.randomUUID(),
      userId: user.id,
      token: crypto.randomUUID(), // In real app, this would be a JWT
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      deviceInfo: {
        id: crypto.randomUUID(),
        type: 'web',
        name: navigator.userAgent,
        platform: navigator.platform
      }
    };

    storage.set('currentSession', session);
    return session;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    try {
      // For demo, use mock users
      const mockUsers = storage.get<AuthUser[]>('mockUsers') || [];
      const user = mockUsers.find(u => u.email === email);

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Update user metadata
      user.metadata = {
        ...user.metadata,
        lastLogin: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        deviceId: crypto.randomUUID(),
        ipAddress: '127.0.0.1' // Mock IP
      };

      // Create new session
      this.currentUser = user;
      this.currentSession = this.createSession(user);

      // Save updated user
      storage.set('currentUser', user);

      // Notify listeners
      eventService.emit(EVENTS.AUTH.LOGIN, { user });

      return user;
    } catch (error) {
      const authError: AuthError = {
        name: 'AuthError',
        message: error instanceof Error ? error.message : 'Login failed',
        code: 'invalid_credentials'
      };
      throw authError;
    }
  }

  logout() {
    if (this.currentSession) {
      // Clear session data
      storage.remove('currentSession');
      storage.remove('currentUser');

      // Clear instance variables
      this.currentUser = null;
      this.currentSession = null;

      // Notify listeners
      eventService.emit(EVENTS.AUTH.LOGOUT);
    }
  }

  getCurrentUser(): AuthUser | null {
    this.updateLastActive();
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  getRole(): 'patient' | 'provider' | null {
    return this.currentUser?.role || null;
  }

  async updateProfile(updates: Partial<AuthUser['userData']>) {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    // Update user data
    this.currentUser.userData = {
      ...this.currentUser.userData,
      ...updates
    };

    // Save changes
    storage.set('currentUser', this.currentUser);

    // Notify listeners
    eventService.emit(EVENTS.AUTH.PROFILE_UPDATE, {
      user: this.currentUser,
      updates
    });

    return this.currentUser;
  }

  // Initialize mock users for testing
  initializeMockUsers() {
    const mockUsers: AuthUser[] = [
      {
        id: '1',
        email: 'patient@test.com',
        role: 'patient',
        userData: {
          id: '1',
          name: 'John Doe',
          email: 'patient@test.com',
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
          providers: [],
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
        },
        metadata: {
          lastLogin: new Date().toISOString(),
          lastActive: new Date().toISOString()
        }
      },
      {
        id: '2',
        email: 'provider@test.com',
        role: 'provider',
        userData: {
          id: '2',
          name: 'Dr. Sarah Chen',
          title: 'Primary Care Physician',
          specialties: ['Internal Medicine', 'Preventive Care'],
          npi: '1234567890',
          email: 'provider@test.com',
          phone: '(555) 234-5678',
          photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
          facility: {
            name: 'HealthCare Medical Center',
            address: '123 Medical Dr, Healthcare City, HC 12345',
            phone: '(555) 987-6543'
          },
          patients: [],
          pendingInvites: []
        },
        metadata: {
          lastLogin: new Date().toISOString(),
          lastActive: new Date().toISOString()
        }
      }
    ];

    storage.set('mockUsers', mockUsers);
  }
}

export const authService = new AuthService();