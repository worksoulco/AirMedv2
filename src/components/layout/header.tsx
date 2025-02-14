import { Bell, Menu, User } from 'lucide-react';
import { Button } from '../ui/button';

export function Header() {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="hidden font-bold md:inline-block">Longevity.ai</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}