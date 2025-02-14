import { Activity, Edit2 } from 'lucide-react';
import { Button } from '../ui/button';
import { getCurrentUser } from '@/lib/auth';

interface DailyCheckInBannerProps {
  onStartCheckIn: () => void;
  lastCheckIn: {
    completed: boolean;
    mood?: string;
    sleep?: number;
    stress?: number;
    energy?: number;
    date?: string;
  };
}

export function DailyCheckInBanner({ onStartCheckIn, lastCheckIn }: DailyCheckInBannerProps) {
  // Get today's date in YYYY-MM-DD format, using local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Check if last check-in was today
  const lastCheckInDate = lastCheckIn.date ? new Date(lastCheckIn.date) : null;
  const isToday = lastCheckInDate?.toISOString().split('T')[0] === todayStr;

  if (lastCheckIn.completed && isToday) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-green-50 to-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today's Check-in</h2>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{lastCheckIn.mood}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Sleep: {lastCheckIn.sleep}/5
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    Energy: {lastCheckIn.energy}/5
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    Stress: {lastCheckIn.stress}/5
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onStartCheckIn}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Daily Check-in</h2>
            <p className="text-sm text-gray-500">Track your wellness</p>
          </div>
        </div>
        <Button onClick={onStartCheckIn} className="bg-amber-600 hover:bg-amber-700">
          Start Check-in
        </Button>
      </div>
    </div>
  );
}