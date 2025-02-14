import { Activity, Calendar, Target, TrendingUp, Award } from 'lucide-react';
import { TrackingItem, itemIcons } from '../tracking/habit-tracker';

interface HabitAnalyticsProps {
  timeRange: string;
}

export function HabitAnalytics({ timeRange }: HabitAnalyticsProps) {
  // Load items from localStorage
  const storedItems = localStorage.getItem('trackingItems');
  const items: TrackingItem[] = storedItems ? JSON.parse(storedItems) : [];
  
  // Filter for habits only
  const habits = items.filter(item => item.type === 'habit');

  // Calculate stats for each habit
  const habitStats = habits.map(habit => {
    const totalDays = habit.days.length;
    const completedDays = habit.days.filter(day => day.completed).length;
    const completion = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    // Calculate current streak
    let currentStreak = 0;
    for (let i = habit.days.length - 1; i >= 0; i--) {
      if (habit.days[i].completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    habit.days.forEach(day => {
      if (day.completed) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // Calculate trend
    const recentDays = habit.days.slice(-3);
    const recentCompletions = recentDays.filter(d => d.completed).length;
    const trend = recentCompletions >= 2 ? 'up' : recentCompletions === 0 ? 'down' : 'stable';

    return {
      ...habit,
      streak: currentStreak,
      completion,
      trend,
      bestStreak,
      totalCompletions: completedDays
    };
  });

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Habit Analytics</h2>
        <p className="text-sm text-gray-500">Track your habit consistency and progress</p>
      </div>

      <div className="space-y-6">
        {habitStats.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 font-medium text-gray-900">No Habits Created</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start tracking habits to see your analytics here
            </p>
          </div>
        ) : (
          habitStats.map((habit) => {
            const Icon = itemIcons[habit.icon];
            return (
              <div key={habit.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-indigo-100 p-2">
                      <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{habit.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{timeRange} overview</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {habit.completion}%
                    </span>
                    <TrendingUp className={`h-5 w-5 ${
                      habit.trend === 'up' ? 'text-green-500' :
                      habit.trend === 'down' ? 'text-red-500' :
                      'text-gray-500'
                    }`} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Activity className="h-4 w-4" />
                      Current Streak
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {habit.streak} days
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Award className="h-4 w-4" />
                      Best Streak
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {habit.bestStreak} days
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Target className="h-4 w-4" />
                      Total Completions
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {habit.totalCompletions}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="font-medium text-gray-900">{habit.completion}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${habit.completion}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}