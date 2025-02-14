import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Shield, Edit2, Plus, Save, X, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export function ProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .rpc('get_full_profile', {
            p_user_id: user.id
          });

        if (error) throw error;
        setProfile(data);
        setEditedProfile(data);
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

  const handleSave = async () => {
    if (!user?.id || !editedProfile) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .rpc('update_profile', {
          p_updates: {
            name: editedProfile.name,
            phone: editedProfile.phone,
            photo_url: editedProfile.photo_url,
            height: editedProfile.height,
            weight: editedProfile.weight,
            blood_type: editedProfile.blood_type,
            emergency_contact: editedProfile.emergency_contact
          }
        });

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load profile</h3>
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
          <h1 className="font-serif text-3xl">Profile</h1>
          <p className="text-lg text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>

        {/* Personal Information */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-100 p-2">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500">Your basic profile details</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  setEditedProfile(profile);
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              className="flex items-center gap-2"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-gray-900">{profile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.phone || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Date of Birth</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {isEditing ? (
                  <input
                    type="date"
                    value={editedProfile.date_of_birth || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, date_of_birth: e.target.value })}
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <p className="text-gray-900">
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString()
                      : 'Not provided'}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Height</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.height || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, height: e.target.value })}
                  placeholder="e.g., 5'10&quot;"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-gray-900">{profile.height || 'Not provided'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Weight</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.weight || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, weight: e.target.value })}
                  placeholder="e.g., 160 lbs"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-gray-900">{profile.weight || 'Not provided'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Blood Type</label>
              {isEditing ? (
                <select
                  value={editedProfile.blood_type || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, blood_type: e.target.value })}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              ) : (
                <p className="text-gray-900">{profile.blood_type || 'Not provided'}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-600">Address</label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.address || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <p className="text-gray-900">{profile.address || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedProfile(profile);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Emergency Contact</h2>
              <p className="text-sm text-gray-500">Person to contact in case of emergency</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Contact Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.emergency_contact?.name || ''}
                  onChange={(e) => setEditedProfile({
                    ...editedProfile,
                    emergency_contact: {
                      ...editedProfile.emergency_contact,
                      name: e.target.value
                    }
                  })}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-gray-900">{profile.emergency_contact?.name || 'Not provided'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Relationship</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.emergency_contact?.relationship || ''}
                  onChange={(e) => setEditedProfile({
                    ...editedProfile,
                    emergency_contact: {
                      ...editedProfile.emergency_contact,
                      relationship: e.target.value
                    }
                  })}
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-gray-900">{profile.emergency_contact?.relationship || 'Not provided'}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.emergency_contact?.phone || ''}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      emergency_contact: {
                        ...editedProfile.emergency_contact,
                        phone: e.target.value
                      }
                    })}
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <p className="text-gray-900">{profile.emergency_contact?.phone || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Healthcare Providers */}
        {user?.role === 'patient' && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Healthcare Providers</h2>
                    <p className="text-sm text-gray-500">Your medical care team</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {profile.providers?.length > 0 ? (
                profile.providers.map((provider: any) => (
                  <div
                    key={provider.id}
                    className="rounded-lg border bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{provider.name}</h3>
                        <p className="text-sm text-gray-600">{provider.role}</p>
                        <p className="mt-1 text-sm text-gray-500">{provider.facility}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{provider.phone}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <User className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900">No providers connected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Connect with your healthcare providers to get started
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Provider
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}