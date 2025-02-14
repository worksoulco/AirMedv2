import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Activity,
  MessageSquare,
  Menu,
  Plus,
  X,
  UtensilsCrossed,
  TestTube2,
  Heart,
  Settings,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ProfileMenu } from '../profile/profile-menu';
import { DailyCheckInModal } from '../modals/daily-check-in';
import { QuickMealModal } from '../modals/quick-meal';

// App logo component
function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 w-8">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <path
            d="M10,50 Q25,10 50,50 T90,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-primary"
          />
        </svg>
      </div>
      <span className="font-serif text-xl font-semibold text-secondary">AirMed</span>
    </div>
  );
}

const patientNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Habits', href: '/tracking', icon: Activity },
  { name: 'Labs', href: '/labs', icon: TestTube2 },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
];

const providerNavigation = [
  { name: 'Dashboard', href: '/provider', icon: Home },
  { name: 'Patients', href: '/provider/patients', icon: Activity },
  { name: 'Notes', href: '/provider/notes', icon: Activity },
  { name: 'Messages', href: '/provider/messages', icon: MessageSquare },
];

interface TopNavProps {
  onMenuClick: () => void;
  onLogout: () => void;
  user: any;
}

export function TopNav({ onMenuClick, onLogout, user }: TopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-secondary hover:bg-muted"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="absolute left-1/2 -translate-x-1/2">
          <AppLogo />
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.userData?.photo ? (
              <img
                src={user.userData.photo}
                alt={user.userData.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">
                  {user?.userData?.name?.charAt(0)}
                </span>
              </div>
            )}
          </Button>

          <ProfileMenu
            isOpen={showUserMenu}
            onClose={() => setShowUserMenu(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </nav>
  );
}

export function BottomNav({ user }: { user: any }) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const navigation = user?.role === 'provider' ? providerNavigation : patientNavigation;

  const patientActions = [
    {
      name: 'Daily Check-in',
      icon: Activity,
      onClick: () => setShowCheckInModal(true),
    },
    {
      name: 'Log Meal',
      icon: UtensilsCrossed,
      onClick: () => setShowMealModal(true),
    },
  ];

  const providerActions = [
    {
      name: 'Add Patient',
      icon: Activity,
      onClick: () => navigate('/provider/patients'),
    },
    {
      name: 'New Note',
      icon: Activity,
      onClick: () => navigate('/provider/notes'),
    },
  ];

  const actions = user?.role === 'provider' ? providerActions : patientActions;
  const firstHalf = navigation.slice(0, 2);
  const secondHalf = navigation.slice(2);
  const navigate = useNavigate();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-md">
          <div className="relative flex items-center justify-between px-4 py-2">
            {/* First Half */}
            <div className="flex items-center gap-8">
              {firstHalf.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg px-3 py-2',
                    location.pathname === item.href
                      ? 'text-primary'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              ))}
            </div>

            {/* Plus Button */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                {/* Action Menu */}
                <div className={cn(
                  "absolute bottom-full right-1/2 mb-4 translate-x-1/2 transition-all duration-200 ease-in-out",
                  isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )}>
                  <div className="flex flex-col items-center gap-2">
                    {actions.map((action, index) => (
                      <button
                        key={action.name}
                        onClick={action.onClick}
                        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg transition-all hover:bg-gray-50"
                        style={{
                          transitionDelay: `${index * 50}ms`,
                          transform: isMenuOpen ? 'scale(1)' : 'scale(0.95)',
                          opacity: isMenuOpen ? 1 : 0,
                        }}
                      >
                        {action.name}
                        <action.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90",
                    isMenuOpen && "rotate-45"
                  )}
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </button>
              </div>
            </div>

            {/* Second Half */}
            <div className="flex items-center gap-8">
              {secondHalf.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg px-3 py-2',
                    location.pathname === item.href
                      ? 'text-primary'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Modals for Patient Actions */}
      {user?.role === 'patient' && (
        <>
          {showCheckInModal && (
            <DailyCheckInModal onClose={() => setShowCheckInModal(false)} />
          )}
          {showMealModal && (
            <QuickMealModal onClose={() => setShowMealModal(false)} />
          )}
        </>
      )}
    </>
  );
}