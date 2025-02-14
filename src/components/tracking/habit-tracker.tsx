import { useState, useEffect } from 'react';
import { Plus, Target, Sparkles, Moon, Zap, Archive, ChevronUp, Trash2, BarChart, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface HabitDay {
  date: string;
  completed: boolean;
  value?: number;
}

export interface BaseItem {
  id: string;
  name: string;
  description?: string;
  icon: keyof typeof itemIcons;
  created_at: string;
  type: 'habit' | 'goal';
  user_id: string;
}

export interface Habit extends BaseItem {
  type: 'habit';
  frequency: number;
  days: HabitDay[];
}

export interface Goal extends BaseItem {
  type: 'goal';
  target_value: number;
  current_value: number;
  unit: string;
  deadline?: string;
  days: HabitDay[];
}

export type TrackingItem = Habit | Goal;

export const itemIcons = {
  exercise: Target,
  meditation: Sparkles,
  sleep: Moon,
  recovery: Zap,
  other: BarChart,
} as const;

// Generate last 7 days with proper timezone handling
const generateWeekDays = () => {
  const days: HabitDay[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split('T')[0],
      completed: false,
      value: 0
    });
  }
  return days;
};

export default function HabitTracker() {
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [itemType, setItemType] = useState<'habit' | 'goal'>('habit');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    icon: 'exercise' as keyof typeof itemIcons,
    frequency: 7, // Default to daily
    target_value: 0,
    current_value: 0,
    unit: '',
    deadline: ''
  });
  const [goalInputValue, setGoalInputValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadItems = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch habits and goals in parallel
        const [habitsResponse, goalsResponse] = await Promise.all([
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        if (habitsResponse.error) throw habitsResponse.error;
        if (goalsResponse.error) throw goalsResponse.error;

        const allItems = [
          ...(habitsResponse.data || []).map(h => ({ ...h, type: 'habit' as const })),
          ...(goalsResponse.data || []).map(g => ({ ...g, type: 'goal' as const }))
        ];

        setItems(allItems);
      } catch (err) {
        console.error('Error loading habits:', err);
        setError(err instanceof Error ? err.message : 'Failed to load habits');
      } finally {
        setLoading(false);
      }
    };

    loadItems();

    // Subscribe to real-time updates
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
        () => loadItems()
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
        () => loadItems()
      )
      .subscribe();

    return () => {
      habitsSubscription.unsubscribe();
      goalsSubscription.unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const toggleHabitDay = async (itemId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .rpc('toggle_habit_completion', {
          p_habit_id: itemId,
          p_date: date
        });

      if (error) throw error;

      // Update local state
      setItems(prev => prev.map(item =>
        item.id === itemId && item.type === 'habit'
          ? { ...item, days: data }
          : item
      ));
    } catch (err) {
      console.error('Error toggling habit:', err);
      setError(err instanceof Error ? err.message : 'Failed to update habit');
    }
  };

  const updateGoalProgress = async (itemId: string, date: string, value: number) => {
    try {
      if (isNaN(value)) return;

      const goal = items.find(item => item.id === itemId && item.type === 'goal') as Goal;
      if (!goal) return;

      const days = [...goal.days];
      const dayIndex = days.findIndex(day => day.date === date);
      if (dayIndex === -1) return;

      days[dayIndex] = { ...days[dayIndex], value, completed: value > 0 };
      const totalProgress = days.reduce((sum, day) => sum + (day.value || 0), 0);

      const { error } = await supabase
        .from('goals')
        .update({
          days,
          current_value: totalProgress
        })
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    }
  };

  const addItem = async () => {
    if (!user?.id || !newItem.name.trim()) return;

    try {
      const now = new Date().toISOString();
      const baseItem = {
        user_id: user.id,
        name: newItem.name.trim(),
        description: newItem.description,
        icon: newItem.icon,
        created_at: now,
        days: generateWeekDays()
      };

      if (itemType === 'habit') {
        const { error } = await supabase
          .from('habits')
          .insert([{
            ...baseItem,
            frequency: newItem.frequency
          }]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([{
            ...baseItem,
            target_value: newItem.target_value,
            current_value: 0,
            unit: newItem.unit,
            deadline: newItem.deadline || null
          }]);

        if (error) throw error;
      }

      setNewItem({
        name: '',
        description: '',
        icon: 'exercise',
        frequency: 7,
        target_value: 0,
        current_value: 0,
        unit: '',
        deadline: ''
      });
      setShowNewItemForm(false);
    } catch (err) {
      console.error('Error adding item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  const deleteItem = async (itemId: string, type: 'habit' | 'goal') => {
    try {
      const { error } = await supabase
        .from(type === 'habit' ? 'habits' : 'goals')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="text-center">
          <Target className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading habits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load habits</h3>
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

  return (
    <div className="space-y-6">
      {/* Items List */}
      <div className="space-y-4">
        {items.map((item) => {
          const Icon = itemIcons[item.icon];
          return (
            <div
              key={item.id}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              {/* Title and Description Section */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        {item.type === 'habit' 
                          ? `${item.frequency}x/week`
                          : `${item.current_value}/${item.target_value} ${item.unit}`
                        }
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    )}
                    {item.type === 'goal' && item.deadline && (
                      <p className="mt-1 text-sm text-gray-500">
                        Deadline: {new Date(item.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => deleteItem(item.id, item.type)}
                      className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="flex items-center justify-between border-t pt-4">
                {item.type === 'habit' ? (
                  // Habit tracking
                  <div className="flex gap-4">
                    {item.days.map((day, index) => {
                      const date = new Date(day.date);
                      return (
                        <div key={day.date} className="flex flex-col items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <button
                            onClick={() => toggleHabitDay(item.id, day.date)}
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                              day.completed
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            )}
                          >
                            {day.completed ? '✓' : '×'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Goal tracking
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round((item.current_value / item.target_value) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{ width: `${(item.current_value / item.target_value) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        placeholder={`Add ${item.unit}`}
                        value={goalInputValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setGoalInputValue(value);
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            updateGoalProgress(item.id, new Date().toISOString().split('T')[0], numValue);
                          }
                        }}
                        className="w-32 rounded-lg border-gray-200 text-sm"
                      />
                      <span className="text-sm text-gray-500">{item.unit}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Item */}
      {showNewItemForm ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={itemType === 'habit' ? 'default' : 'outline'}
                onClick={() => setItemType('habit')}
              >
                Habit
              </Button>
              <Button
                variant={itemType === 'goal' ? 'default' : 'outline'}
                onClick={() => setItemType('goal')}
              >
                Goal
              </Button>
            </div>

            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder={itemType === 'habit' ? "What habit do you want to track?" : "What's your goal?"}
              className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />

            <input
              type="text"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="Add a description"
              className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />

            <select
              value={newItem.icon}
              onChange={(e) => setNewItem({ ...newItem, icon: e.target.value as keyof typeof itemIcons })}
              className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="exercise">Exercise</option>
              <option value="meditation">Meditation</option>
              <option value="sleep">Sleep</option>
              <option value="recovery">Recovery</option>
              <option value="other">Other</option>
            </select>

            {itemType === 'habit' ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Frequency (days per week)
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={newItem.frequency}
                  onChange={(e) => setNewItem({ ...newItem, frequency: parseInt(e.target.value) })}
                  className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Target Value
                    </label>
                    <input
                      type="number"
                      value={newItem.target_value}
                      onChange={(e) => setNewItem({ ...newItem, target_value: parseFloat(e.target.value) })}
                      className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      placeholder="e.g., lbs, minutes, miles"
                      className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Deadline (optional)
                  </label>
                  <input
                    type="date"
                    value={newItem.deadline}
                    onChange={(e) => setNewItem({ ...newItem, deadline: e.target.value })}
                    className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewItemForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={addItem}>
                {itemType === 'habit' ? 'Add Habit' : 'Add Goal'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewItemForm(true)}
          className="flex w-full items-center gap-2 rounded-2xl bg-green-600 p-4 text-white transition-colors hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Habit or Goal</span>
        </button>
      )}

      {/* Show Archived Items */}
      <button className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm text-gray-600 hover:text-gray-900">
        <Archive className="h-4 w-4" />
        <span>Show Archived Items</span>
      </button>
    </div>
  );
}

export { HabitTracker }