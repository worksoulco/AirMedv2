import { Link } from 'react-router-dom';
import { ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileMenu({ isOpen, onClose, onLogout }: ProfileMenuProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="relative">
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg z-50" onClick={onClose}>
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
