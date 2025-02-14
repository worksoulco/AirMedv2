import { MealData } from '../components/modals/quick-meal';

// Load meals from localStorage
export function loadMeals(): MealData[] {
  const stored = localStorage.getItem('meals');
  return stored ? JSON.parse(stored) : [];
}

// Save meals to localStorage
export function saveMeals(meals: MealData[]) {
  localStorage.setItem('meals', JSON.stringify(meals));
  // Dispatch custom event to notify components of the update
  window.dispatchEvent(new Event('mealUpdate'));
}

// Add a new meal
export function addMeal(meal: MealData): MealData[] {
  const meals = loadMeals();
  const newMeals = [meal, ...meals];
  saveMeals(newMeals);
  return newMeals;
}

// Delete a meal
export function deleteMeal(id: string): MealData[] {
  const meals = loadMeals();
  const newMeals = meals.filter(meal => meal.id !== id);
  saveMeals(newMeals);
  return newMeals;
}

// Get today's meals
export function getTodayMeals(): MealData[] {
  const meals = loadMeals();
  const today = new Date().toISOString().split('T')[0];
  return meals.filter(meal => meal.date === today);
}