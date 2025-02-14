import { useState, useEffect } from 'react';
import { Activity, Brain, Heart, AlertCircle, RefreshCw, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

// Map emojis to numeric values for the graph
const moodScores: Record<string, number> = {
  '😊': 5, // Great
  '🙂': 4, // Good
  '😐': 3, // Okay
  '😕': 2, // Not great
};

const metrics = [
  { name: 'Sleep Quality', key: 'sleep', icon: Brain, color: 'indigo' },
  { name: 'Stress Level', key: 'stress', icon: Heart, color: 'emerald' },
  { name: 'Energy Level', key: 'energy', icon: Activity, color: 'violet' },
  { name: 'Mood', key: 'mood', icon: Activity, color: 'amber' },
] as const;

export function WellnessTrends() {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [activeMetrics, setActiveMetrics] = useState(metrics.map(m => m.name));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get last 7 days of check-ins, habits, and goals
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        // Fetch check-ins, habits, and goals in parallel
        const [checkInsResponse, habitsResponse, goalsResponse] = await Promise.all([
          supabase
            .from('check_ins')
            .select('*')
            .eq('patient_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true }),
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id),
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
        ]);

        if (checkInsResponse.error) throw checkInsResponse.error;
        if (habitsResponse.error) throw habitsResponse.error;
        if (goalsResponse.error) throw goalsResponse.error;

        // Create array of last 7 days with default values
        const days: any[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          
          // Find check-in for this date or create default
          const checkIn = checkInsResponse.data?.find(ci => ci.date === date) || {
            date,
            mood: '😐',
            sleep: 1,
            stress: 1,
            energy: 1
          };
          
          days.push(checkIn);
        }

        setCheckIns(days);
        setHabits(habitsResponse.data || []);
        setGoals(goalsResponse.data || []);
      } catch (err) {
        console.error('Error loading wellness data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wellness data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const checkInsSubscription = supabase
      .channel('check_ins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `patient_id=eq.${user.id}`
        },
        () => loadData()
      )
      .subscribe();

    const habitsSubscription = supabase
      .channel('habits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${user.id}`
        },
        () => loadData()
      )
      .subscribe();

    const goalsSubscription = supabase
      .channel('goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      checkInsSubscription.unsubscribe();
      habitsSubscription.unsubscribe();
      goalsSubscription.unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Calculate habit completion rate
  const habitCompletionRate = habits.length > 0
    ? habits.reduce((acc, habit) => {
        const completedDays = habit.days.filter((day: any) => day.completed).length;
        return acc + (completedDays / habit.days.length);
      }, 0) / habits.length * 100
    : 0;

  // Calculate goal progress
  const goalProgress = goals.length > 0
    ? goals.reduce((acc, goal) => {
        const progress = (goal.current_value / goal.target_value) * 100;
        return acc + progress;
      }, 0) / goals.length
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading wellness data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load wellness data</h3>
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

  if (!checkIns || checkIns.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 font-medium text-gray-900">No wellness data yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start tracking your daily wellness to see trends here
          </p>
        </div>
      </div>
    );
  }

  const getMetricColor = (metric: string) => {
    const colors = {
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', stroke: 'stroke-indigo-500' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', stroke: 'stroke-emerald-500' },
      violet: { bg: 'bg-violet-50', text: 'text-violet-600', stroke: 'stroke-violet-500' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', stroke: 'stroke-amber-500' },
    };
    const metricObj = metrics.find(m => m.name === metric)!;
    return colors[metricObj.color as keyof typeof colors];
  };

  const getLinePath = (metricKey: string) => {
    if (!checkIns || checkIns.length === 0) return '';

    const values = checkIns.map(d => {
      if (metricKey === 'mood') {
        return moodScores[d.mood] || 3;
      }
      return d[metricKey] || 1; // Default to 1 if no value
    });

    const maxValue = 5;
    const width = 100 / (values.length - 1);
    
    return values.map((value, i) => {
      const x = i * width;
      const y = 100 - (value / maxValue) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const calculateWeeklyAverage = (metricKey: string) => {
    if (!checkIns || checkIns.length === 0) return '0.0';

    const values = checkIns.map(d => {
      if (metricKey === 'mood') {
        return moodScores[d.mood] || 3;
      }
      return d[metricKey] || 1; // Default to 1 if no value
    });

    const sum = values.reduce((acc, val) => acc + val, 0);
    return (sum / values.length).toFixed(1);
  };

  const latestCheckIn = checkIns[checkIns.length - 1];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Wellness Trends</h2>
          <p className="text-sm text-gray-500">Your daily check-in data</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{latestCheckIn?.mood || '😐'}</span>
          <span className="text-sm text-gray-500">Today</span>
        </div>
      </div>

      {/* Weekly Averages - 2x2 grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const colors = getMetricColor(metric.name);
          const average = calculateWeeklyAverage(metric.key);
          return (
            <div
              key={metric.name}
              className={cn(
                'rounded-lg p-3',
                colors.bg
              )}
            >
              <div className="flex items-center gap-2">
                <metric.icon className={cn('h-4 w-4', colors.text)} />
                <span className="text-sm font-medium text-gray-600">
                  {metric.name}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={cn('text-2xl font-semibold', colors.text)}>
                  {average}
                </span>
                <span className="text-sm text-gray-500">avg</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Habit and Goal Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Habit Completion Rate */}
        <div className="rounded-lg bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Habit Completion</span>
          </div>
          <div className="mt-1">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-green-600">
                {Math.round(habitCompletionRate)}%
              </span>
              <span className="text-sm text-gray-500">
                {habits.length} active
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${habitCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="rounded-lg bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Goal Progress</span>
          </div>
          <div className="mt-1">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-blue-600">
                {Math.round(goalProgress)}%
              </span>
              <span className="text-sm text-gray-500">
                {goals.length} active
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Toggles */}
      <div className="mb-6 flex flex-wrap gap-2">
        {metrics.map((metric) => {
          const colors = getMetricColor(metric.name);
          const isActive = activeMetrics.includes(metric.name);
          return (
            <Button
              key={metric.name}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveMetrics(prev =>
                prev.includes(metric.name)
                  ? prev.filter(m => m !== metric.name)
                  : [...prev, metric.name]
              )}
              className={cn(
                'flex items-center gap-1.5',
                isActive && `${colors.bg} ${colors.text} border-transparent`
              )}
            >
              <metric.icon className="h-4 w-4" />
              {metric.name}
            </Button>
          );
        })}
      </div>

      {/* Graph */}
      <div className="relative h-[240px] w-full">
        {/* Y-axis labels with emojis */}
        <div className="absolute -left-4 top-0 flex h-full flex-col justify-between text-xs text-gray-400">
          {[5, 4, 3, 2, 1].map((value) => (
            <div key={value} className="relative h-0">
              <div className="absolute -translate-y-1/2 whitespace-nowrap">
                <span className="inline-block w-3 text-right">{value}</span>
                <span className="ml-0.5">
                  {value === 5 ? '😊' : value === 4 ? '🙂' : value === 3 ? '😐' : value === 2 ? '😕' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Graph */}
        <div className="absolute inset-y-0 left-6 right-0">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-1 grid-rows-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="border-t border-gray-100"
              />
            ))}
          </div>

          {/* SVG for line charts */}
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {activeMetrics.map((metricName) => {
              const metric = metrics.find(m => m.name === metricName)!;
              const colors = getMetricColor(metricName);
              return (
                <path
                  key={metricName}
                  d={getLinePath(metric.key)}
                  fill="none"
                  className={`${colors.stroke} stroke-[1.5]`}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute -bottom-6 left-6 right-0 flex justify-between text-xs text-gray-400">
          {checkIns.map((data, index) => (
            <div key={index}>
              {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}