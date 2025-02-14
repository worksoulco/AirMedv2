import { Activity, Calendar, LineChart, MessageSquare, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LineChart },
  { name: 'Health Tracking', href: '/tracking', icon: Activity },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="hidden border-r bg-gray-50/40 md:block">
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 hover:text-gray-900',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}