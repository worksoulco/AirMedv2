import { useState, useEffect } from 'react';
import { Bell, Moon, Sun, AlertCircle, RefreshCw, Lock, Shield, UserPlus } from 'lucide-react';
import ConnectProviderModal from '../patient/ConnectProviderModal';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface SecuritySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface Provider {
  id: string;
  name: string;
  title?: string;
  photo_url?: string;
  facility?: string;
}

interface Profile {
  id: string;
  preferences: {
    notifications: Record<string, boolean>;
    theme: 'light' | 'dark';
  };
  providers: Provider[];
}

function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load profile preferences
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Load connected providers
        type ProviderResponse = {
          id: string;
          provider_id: string;
          provider: {
            id: string;
            name: string;
            provider_details: {
              title: string;
              facility: {
                name: string;
              };
            };
          };
        };

        const { data: providers, error: providersError } = await supabase
          .from('patient_providers')
          .select(`
            id,
            provider_id,
            provider:profiles!provider_id (
              id,
              name,
              provider_details!inner (
                title,
                facility
              )
            )
          `)
          .eq('patient_id', user.id)
          .eq('status', 'active') as { data: ProviderResponse[] | null; error: any };

        if (providersError) throw providersError;

        const defaultPreferences = {
          notifications: {
            appointments: true,
            labResults: true,
            messages: true,
            reminders: true
          },
          theme: 'light' as const
        };

        const profilePreferences = profileData?.preferences || defaultPreferences;
        const providersList = providers?.map(p => ({
          id: p.provider.id,
          name: p.provider.name || 'Unknown Provider',
          title: p.provider.provider_details?.title,
          facility: p.provider.provider_details?.facility?.name
        })) || [];

        setProfile({
          id: profileData?.id || user.id,
          preferences: profilePreferences,
          providers: providersList
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Subscribe to profile changes
    const subscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => loadProfile()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const updatePreference = async (category: keyof Profile['preferences'], key: string, value: boolean) => {
    if (!user?.id || !profile) return;

    try {
      setSaving(true);
      setError(null);

      let preferences;
      if (category === 'notifications') {
        preferences = {
          notifications: {
            ...profile.preferences.notifications,
            [key]: value
          },
          theme: profile.preferences.theme
        };
      } else if (category === 'theme') {
        preferences = {
          notifications: profile.preferences.notifications,
          theme: value ? 'dark' : 'light'
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ preferences })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Bell className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load settings</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          {error.includes('database') && (
            <p className="mt-4 text-sm text-gray-500">
              Please click the "Connect to Supabase" button in the top right to set up your database connection.
            </p>
          )}
          <Button
            onClick={handleRetry}
            className="mt-4 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl">Settings</h1>
          <p className="text-lg text-gray-600">
            Manage your account preferences and security
          </p>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-500">Choose what you want to be notified about</p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(profile.preferences.notifications).map(([key, enabled]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-medium text-gray-900">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {key === 'appointments' && 'Get notified about upcoming appointments'}
                    {key === 'labResults' && 'Receive notifications when new lab results are available'}
                    {key === 'messages' && 'Get notified when you receive new messages'}
                    {key === 'reminders' && 'Daily reminders for your tracked habits'}
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={enabled}
                    onChange={() => updatePreference('notifications', key, !enabled)}
                    disabled={saving}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-primary/20"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Lock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
              <p className="text-sm text-gray-500">Manage your account security settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-500">Update your account password</p>
                </div>
                <Button variant="outline">Update</Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Login History</h3>
                  <p className="text-sm text-gray-500">View your recent login activity</p>
                </div>
                <Button variant="outline">View</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Providers */}
        {user?.role === 'patient' && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Healthcare Providers</h2>
                <p className="text-sm text-gray-500">Manage your provider connections</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Add a Provider</h3>
                    <p className="text-sm text-gray-500">Connect with your healthcare provider using their code</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setShowConnectModal(true)}
                  >
                    Connect
                  </Button>
                </div>
              </div>

              {profile.providers?.map((provider) => (
                <div key={provider.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.title}</p>
                    </div>
                    <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Privacy</h2>
              <p className="text-sm text-gray-500">Manage your data and privacy preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Data Sharing</h3>
                  <p className="text-sm text-gray-500">Control how your data is shared with providers</p>
                </div>
                <Button variant="outline">Manage</Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-500">Download a copy of your health data</p>
                </div>
                <Button variant="outline">Export</Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">Permanently delete your account and data</p>
                </div>
                <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              {profile.preferences.theme === 'dark' ? (
                <Moon className="h-5 w-5 text-amber-600" />
              ) : (
                <Sun className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
              <p className="text-sm text-gray-500">Customize your app experience</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-medium text-gray-900">Dark Mode</h3>
              <p className="text-sm text-gray-500">Switch between light and dark themes</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={profile.preferences.theme === 'dark'}
                onChange={() => updatePreference(
                  'theme',
                  '',
                  profile.preferences.theme === 'light'
                )}
                disabled={saving}
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-primary/20"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showConnectModal && (
            <ConnectProviderModal 
              onClose={() => setShowConnectModal(false)}
              onSuccess={() => {
                setShowConnectModal(false);
                // Reload profile to get updated provider list
                setRetryCount(prev => prev + 1);
              }}
            />
      )}
    </div>
  );
}

export default SettingsPage;
