import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, UserPlus, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { login, signUp, getCurrentUser } from '@/lib/auth';
import { checkSupabaseConnection } from '@/lib/supabase/client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'patient' | 'provider'>('patient');
  const [title, setTitle] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Check database connection and clear invalid sessions on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkSupabaseConnection();
        setDbConnected(isConnected);
      } catch (err) {
        console.error('Connection check error:', err);
        setDbConnected(false);
      }
    };

    // Clear any invalid session data
    const currentUser = getCurrentUser();
    if (currentUser === null) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('supabase.auth.token');
    }

    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    try {
      setError(null);
      setLoading(true);

      if (!dbConnected) {
        throw new Error('Database connection error. Please click "Connect to Supabase" to set up your connection.');
      }

      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        throw new Error('Please enter your email and password');
      }

      let user;
      if (isSignUp) {
        const trimmedName = name.trim();
        const trimmedTitle = title.trim();

        if (!trimmedName) {
          throw new Error('Please enter your name');
        }
        if (role === 'provider' && !trimmedTitle) {
          throw new Error('Please enter your title');
        }

        user = await signUp(trimmedEmail, trimmedPassword, {
          name: trimmedName,
          role,
          title: trimmedTitle
        });
      } else {
        user = await login(trimmedEmail, trimmedPassword);
      }

      // Validate the login was successful
      if (!user || !user.id) {
        throw new Error('Authentication failed - invalid user data');
      }

      // For new users, redirect to onboarding
      if (isSignUp) {
        navigate('/onboarding');
      } else {
        // For existing users, navigate based on role
        navigate(user.role === 'provider' ? '/provider' : '/');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      // Clear any invalid session data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('supabase.auth.token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl">Welcome to AirMed</h1>
          <p className="mt-2 text-gray-600">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'patient' | 'provider')}
                    className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    disabled={loading}
                  >
                    <option value="patient">Patient</option>
                    <option value="provider">Healthcare Provider</option>
                  </select>
                </div>

                {role === 'provider' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="e.g., Primary Care Physician"
                      required
                      disabled={loading}
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setError(null);
                  setEmail(e.target.value.trim());
                }}
                className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setError(null);
                    setPassword(e.target.value);
                  }}
                  onFocus={() => isSignUp && setShowPasswordRequirements(true)}
                  onBlur={() => setShowPasswordRequirements(false)}
                  className="mt-1 block w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                {isSignUp && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPasswordRequirements(!showPasswordRequirements)}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isSignUp && showPasswordRequirements && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  <p className="font-medium">Password must contain:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    <li>At least 8 characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one number</li>
                    <li>At least one special character</li>
                  </ul>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {!dbConnected && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Please click "Connect to Supabase" to set up your database connection.
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !dbConnected}>
              {isSignUp ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? 'Creating Account...' : 'Create Account'}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? 'Signing in...' : 'Sign In'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-4">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setShowPasswordRequirements(false);
              }}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-4">
            <p className="text-center text-sm text-gray-500">
              Test Accounts:
            </p>
            <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Patient:</p>
                <p className="text-gray-500">Email: patient@test.com</p>
                <p className="text-gray-500">Password: test123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Provider:</p>
                <p className="text-gray-500">Email: provider@test.com</p>
                <p className="text-gray-500">Password: test123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
