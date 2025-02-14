export interface DailyCheckIn {
  id: string;
  userId: string;
  date: string;
  mood: string;
  sleep: number;
  stress: number;
  energy: number;
  notes?: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    deviceInfo?: string;
  };
}

export interface MealEntry {
  id: string;
  userId: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  time: string;
  notes?: string;
  photos: {
    id: string;
    url: string;
    thumbnail?: string;
  }[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface NutritionGoal {
  id: string;
  userId: string;
  type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water';
  target: number;
  unit: string;
  startDate: string;
  endDate?: string;
  active: boolean;
}