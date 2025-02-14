import { DailyCheckIn, MealEntry } from '@/types/tracking';

// Load check-ins for a date range
export function loadCheckIns(userId: string, startDate: string, endDate: string): DailyCheckIn[] {
  const stored = localStorage.getItem(`checkIns_${userId}`);
  const checkIns = stored ? JSON.parse(stored) : [];
  
  return checkIns.filter((checkIn: DailyCheckIn) =>
    checkIn.date >= startDate && checkIn.date <= endDate
  );
}

// Save check-in
export function saveCheckIn(checkIn: DailyCheckIn) {
  const checkIns = loadCheckIns(checkIn.userId, '2000-01-01', '2099-12-31');
  const existingIndex = checkIns.findIndex(ci => 
    ci.userId === checkIn.userId && ci.date === checkIn.date
  );
  
  const updatedCheckIns = existingIndex >= 0
    ? [
        ...checkIns.slice(0, existingIndex),
        {
          ...checkIn,
          metadata: {
            ...checkIn.metadata,
            updatedAt: new Date().toISOString()
          }
        },
        ...checkIns.slice(existingIndex + 1)
      ]
    : [...checkIns, {
        ...checkIn,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }];
  
  localStorage.setItem(`checkIns_${checkIn.userId}`, JSON.stringify(updatedCheckIns));
  window.dispatchEvent(new Event('checkInUpdate'));
  return checkIn;
}

// Load meals for a date range
export function loadMeals(userId: string, startDate: string, endDate: string): MealEntry[] {
  const stored = localStorage.getItem(`meals_${userId}`);
  const meals = stored ? JSON.parse(stored) : [];
  
  return meals.filter((meal: MealEntry) =>
    meal.date >= startDate && meal.date <= endDate
  );
}

// Save meal entry
export function saveMeal(meal: MealEntry) {
  const meals = loadMeals(meal.userId, '2000-01-01', '2099-12-31');
  const updatedMeals = [...meals, {
    ...meal,
    metadata: {
      ...meal.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }];
  
  localStorage.setItem(`meals_${meal.userId}`, JSON.stringify(updatedMeals));
  window.dispatchEvent(new Event('mealUpdate'));
  return meal;
}