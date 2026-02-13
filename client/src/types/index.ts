export interface User {
  _id?: string;
  id?: string;
  username: string;
  name: string;
  age: number | null;
  height: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  goal: string;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  fastingCalorieTarget?: number;
}

export interface FoodEntry {
  _id: string;
  foodName: string;
  protein: number;
  calories: number;
  quantity: number;
  date: string;
  category?: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  dayType?: 'normal' | 'fasting';
  userId?: string;
}

export interface WeightLog {
  _id: string;
  weight: number;
  date: string;
  notes?: string;
  userId?: string;
}

export interface DailyStats {
  totalCalories: number;
  totalProtein: number;
  foodCount: number;
}

export interface WeeklyStats {
  [date: string]: {
    calories: number;
    protein: number;
  };
}

export interface WaterLog {
  _id: string;
  amount: number; // in ml
  date: string;
  userId?: string;
}

export interface WaterStats {
  totalWater: number;
  logCount: number;
}

