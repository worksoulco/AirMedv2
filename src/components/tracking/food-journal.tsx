import { useState, useEffect } from 'react';
import { UtensilsCrossed, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { QuickMealModal, MealData } from '../modals/quick-meal';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

const mealTypeEmoji = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
} as const;

export function FoodJournal() {
  const [meals, setMeals] = useState<MealData[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const user = getCurrentUser();

  // Load meals on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('patient_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setMeals(data || []);
      } catch (err) {
        console.error('Error loading meals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meals');
      } finally {
        setLoading(false);
      }
    };

    loadMeals();

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
        () => loadMeals()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const deleteMeal = async (id: string) => {
    if (!user?.id) return;

    try {
      setError(null);

      // First get the meal to get the photo URLs
      const { data: meal, error: fetchError } = await supabase
        .from('meals')
        .select('photo_url, thumbnail_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the meal record
      const { error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('patient_id', user.id);

      if (deleteError) throw deleteError;

      // Delete the photos from storage
      if (meal?.photo_url) {
        const photoPath = meal.photo_url.split('/').pop();
        if (photoPath) {
          const { error: photoError } = await supabase.storage
            .from('food-photos')
            .remove([`${user.id}/${photoPath}`]);

          if (photoError) {
            console.error('Error deleting photo:', photoError);
          }
        }
      }

      if (meal?.thumbnail_url) {
        const thumbPath = meal.thumbnail_url.split('/').pop();
        if (thumbPath) {
          const { error: thumbError } = await supabase.storage
            .from('food-thumbnails')
            .remove([`${user.id}/${thumbPath}`]);

          if (thumbError) {
            console.error('Error deleting thumbnail:', thumbError);
          }
        }
      }
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete meal');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <UtensilsCrossed className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading meals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load meals</h3>
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

  const groupMealsByDate = () => {
    const groups: Record<string, MealData[]> = {};
    meals.forEach(meal => {
      const date = new Date(meal.date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(meal);
    });
    return groups;
  };

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">Food Journal</h1>
        <p className="text-lg text-gray-600">Track your meals and nutrition</p>
      </div>

      <Button
        onClick={() => setShowMealModal(true)}
        className="flex w-full items-center justify-center gap-2"
      >
        <UtensilsCrossed className="h-5 w-5" />
        Log Meal
      </Button>

      <div className="space-y-8">
        {Object.entries(groupMealsByDate()).map(([date, dateMeals]) => (
          <div key={date} className="space-y-4">
            <h2 className="font-medium text-gray-900">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <div className="space-y-4">
              {dateMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={meal.thumbnail_url || meal.photo_url}
                        alt={`${meal.type} meal`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
                    </div>
                    <div className="flex flex-1 items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{mealTypeEmoji[meal.type]}</span>
                          <h3 className="font-medium capitalize text-gray-900">
                            {meal.type}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {new Date(`2000-01-01T${meal.time}`).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {meal.notes && (
                          <p className="mt-2 text-sm text-gray-600">{meal.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMeal(meal.id)}
                        className="text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {meals.length === 0 && (
          <div className="rounded-xl bg-white p-6 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 font-medium text-gray-900">No meals logged yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start tracking your meals to build a healthy eating habit
            </p>
          </div>
        )}
      </div>

      {showMealModal && (
        <QuickMealModal
          onClose={() => setShowMealModal(false)}
          onSave={() => setShowMealModal(false)}
        />
      )}
    </div>
  );
}