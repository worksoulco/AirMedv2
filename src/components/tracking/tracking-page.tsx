import { HabitTracker } from './habit-tracker';

export function TrackingPage() {
  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl">Goals & Habits</h1>
          <p className="mt-2 text-lg text-gray-600">
            Track your daily progress
          </p>
        </div>
        
        <div className="mx-auto max-w-xl space-y-6">
          <HabitTracker />
        </div>
      </div>
    </div>
  );
}