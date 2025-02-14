import { Link } from 'react-router-dom';
import { UtensilsCrossed, Plus } from 'lucide-react';
import { MealData } from '../modals/quick-meal';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

const mealTypeEmoji = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
} as const;

interface FoodSummaryProps {
  onAddMeal: () => void;
}

export function FoodSummary({ onAddMeal }: FoodSummaryProps) {
  const [todayMeals, setTodayMeals] = useState<MealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();
  const today = new Date().toISOString().split('T')[0];

  // Load today's meals on mount and when localStorage changes
  useEffect(() => {
    if (!user?.id) return;

    const loadTodayMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('patient_id', user.id)
          .eq('date', today)
          .order('time', { ascending: true });

        if (error) throw error;
        setTodayMeals(data || []);
      } catch (err) {
        console.error('Error loading meals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meals');
      } finally {
        setLoading(false);
      }
    };

    loadTodayMeals();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('meals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `patient_id=eq.${user.id}`
        },
        () => loadTodayMeals()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, today]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Meals</h2>
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Meals</h2>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today's Meals</h2>
          <p className="text-sm text-gray-500">Track your nutrition</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onAddMeal}
            size="icon"
            variant="ghost"
            className="rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 hover:text-orange-700"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Link
            to="/food-journal"
            className="rounded-full bg-orange-100 p-2 text-orange-600 hover:bg-orange-200 hover:text-orange-700"
          >
            <UtensilsCrossed className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {todayMeals.length > 0 ? (
          todayMeals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={meal.thumbnail_url || meal.photo_url}
                  alt={`${meal.type} meal`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{mealTypeEmoji[meal.type]}</span>
                  <h3 className="font-medium capitalize text-gray-900">{meal.type}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(`2000-01-01T${meal.time}`).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {meal.notes && (
                  <p className="mt-1 text-sm text-gray-600">{meal.notes}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-white p-6 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 font-medium text-gray-900">No meals logged today</h3>
            <p className="mt-1 text-sm text-gray-500">
              Keep track of your nutrition by logging your meals and snacks
            </p>
            <Button
              onClick={onAddMeal}
              className="mt-4"
              variant="outline"
            >
              Add Meal or Snack
            </Button>
          </div>
        )}

        {todayMeals.length > 0 && (
          <Link
            to="/food-journal"
            className="block text-center text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            See all meals →
          </Link>
        )}
      </div>
    </div>
  );
}