import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileMenu({ isOpen, onClose, onLogout }: ProfileMenuProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .rpc('get_user_profile', {
            p_user_id: user.id
          });

        if (error) throw error;
        setProfile(data);
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
  }, [user?.id]);

  if (!isOpen || !profile) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg font-medium text-primary">
                  {profile.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="py-1">
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              navigate('/profile');
              onClose();
            }}
          >
            <User className="h-4 w-4" />
            View Profile
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              navigate('/settings');
              onClose();
            }}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              navigate('/help');
              onClose();
            }}
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </button>
        </div>

        <div className="border-t py-1">
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}