import { X, Activity, MessageSquare, TestTube2, UtensilsCrossed, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const patientMenuItems = [
  { name: 'Home', href: '/', icon: Activity },
  { name: 'Food Journal', href: '/food-journal', icon: UtensilsCrossed },
  { name: 'Health Analytics', href: '/analytics', icon: Heart },
  { name: 'Labs', href: '/labs', icon: TestTube2 },
  { name: 'Messages', href: '/messages', icon: MessageSquare }
];

const providerMenuItems = [
  { name: 'Dashboard', href: '/provider', icon: Activity },
  { name: 'Patients', href: '/provider/patients', icon: Activity },
  { name: 'Notes', href: '/provider/notes', icon: Activity },
  { name: 'Messages', href: '/provider/messages', icon: MessageSquare }
];

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const user = getCurrentUser();
  const menuItems = user?.role === 'provider' ? providerMenuItems : patientMenuItems;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Side Menu */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="font-serif text-xl">AirMed</span>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={onClose}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}