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
  dailyCarbsTarget?: number;
  dailyFatsTarget?: number;
  dailyFiberTarget?: number;
  dailySugarTarget?: number;
  fastingCalorieTarget?: number;
  fastingProteinTarget?: number;
  fastingCarbsTarget?: number;
  fastingFatsTarget?: number;
  fastingFiberTarget?: number;
  fastingSugarTarget?: number;
}

export interface FoodEntry {
  _id: string;
  foodName: string;
  protein: number;
  calories: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  sugar?: number;
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
  totalCarbs?: number;
  totalFats?: number;
  totalFiber?: number;
  totalSugar?: number;
  foodCount: number;
}

export interface WeeklyStats {
  [date: string]: {
    calories: number;
    protein: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    sugar?: number;
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

export interface WaistLog {
  _id: string;
  waist: number; // in cm
  date: string;
  notes?: string;
  userId?: string;
}

export interface WorkoutLog {
  _id: string;
  date: string;
  workoutType?: string;
  duration?: number; // in minutes
  notes?: string;
  userId?: string;
}

export interface StepsLog {
  _id: string;
  steps: number;
  date: string;
  notes?: string;
  userId?: string;
}

