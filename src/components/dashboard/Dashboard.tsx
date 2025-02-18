import { useState, useEffect } from 'react';
import { FoodSummary } from './food-summary';
import { WellnessTrends } from './wellness-trends';
import { ProtocolTracker } from './protocol-tracker';
import { DailyCheckInBanner } from './daily-check-in-banner';
import { DailyCheckInModal } from '../modals/daily-check-in';
import { QuickMealModal, MealData } from '../modals/quick-meal';
import { addMeal } from '@/lib/meals';
import { getCurrentUser } from '@/lib/auth';
import { saveCheckIn, getCheckIns } from '@/lib/supabase/checkins';
import { Activity } from 'lucide-react';

function Dashboard() {
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();
  const userId = user?.id;

  // Load last check-in from Supabase
  const [lastCheckIn, setLastCheckIn] = useState({
    completed: false,
    mood: undefined,
    sleep: undefined,
    stress: undefined,
    energy: undefined,
    date: undefined,
  });

  useEffect(() => {
    if (!userId) return;

    const loadLastCheckIn = async () => {
      try {
        setLoading(true);
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get yesterday's date
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Get check-ins for today and yesterday
        const checkIns = await getCheckIns(userId, yesterdayStr, todayStr);
        
        if (checkIns.length > 0) {
          // Sort by date descending to get the most recent first
          checkIns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const mostRecent = checkIns[0];

          // Only set as completed if it's from today
          const isToday = mostRecent.date === todayStr;
          
          setLastCheckIn({
            completed: isToday,
            mood: mostRecent.mood,
            sleep: mostRecent.sleep,
            stress: mostRecent.stress,
            energy: mostRecent.energy,
            date: mostRecent.date,
          });
        } else {
          // Reset check-in state if no recent check-ins
          setLastCheckIn({
            completed: false,
            mood: undefined,
            sleep: undefined,
            stress: undefined,
            energy: undefined,
            date: undefined,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load check-in');
      } finally {
        setLoading(false);
      }
    };

    loadLastCheckIn();
  }, [userId]);

  const handleCheckInComplete = async (data: any) => {
    if (!userId) return;

    try {
      const checkIn = await saveCheckIn({
        userId,
        date: new Date().toISOString().split('T')[0],
        mood: data.mood,
        sleep: data.sleep,
        stress: data.stress,
        energy: data.energy
      });

      setLastCheckIn({
        completed: true,
        ...checkIn
      });

      setShowCheckInModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save check-in');
    }
  };

  const handleAddMeal = (mealData: MealData) => {
    addMeal(mealData);
    setShowMealModal(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">
          Good morning, {user?.userData.name.split(' ')[0] || 'there'}
        </h1>
        <p className="text-lg text-gray-600">Let's check your wellness today</p>
      </div>
      <div className="grid gap-6 sm:gap-8">
        {/* Current Protocol */}
        <ProtocolTracker />

        {/* Daily Check-in */}
        <DailyCheckInBanner
          onStartCheckIn={() => setShowCheckInModal(true)}
          lastCheckIn={lastCheckIn}
        />

        {/* Wellness Trends */}
        <WellnessTrends />

        {/* Food Summary */}
        <FoodSummary onAddMeal={() => setShowMealModal(true)} />
      </div>

      {showCheckInModal && (
        <DailyCheckInModal
          onClose={() => setShowCheckInModal(false)}
          onComplete={handleCheckInComplete}
          initialData={lastCheckIn.completed ? lastCheckIn : undefined}
        />
      )}

      {showMealModal && (
        <QuickMealModal
          onClose={() => setShowMealModal(false)}
          onSave={handleAddMeal}
        />
      )}
    </div>
  );
}

export default Dashboard;
