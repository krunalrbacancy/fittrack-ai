const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9
};

const GOAL_CALORIE_ADJUSTMENT = {
  lose: -500,
  maintain: 0,
  gain: 300
};

const MIN_CALORIES = 1200;
const PROTEIN_PER_KG_BY_LEVEL = {
  beginner: 1.0,
  intermediate: 1.4,
  advanced: 1.8
};
const FATS_PER_KG = 1.0;
const CARBS_PER_KG = 3.0;
const SUGAR_CALORIE_SHARE = 0.10;
const FIBER_PER_1000_KCAL = 14;
const FASTING_DAY_RATIO = 0.75;

const calculateBMR = ({ gender, weightKg, heightCm, age }) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'female' ? base - 161 : base + 5;
};

export const calculateNutritionTargets = ({ gender, weightKg, heightCm, age, activityLevel, goal, trainingLevel }) => {
  const bmr = calculateBMR({ gender, weightKg, heightCm, age });
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.sedentary);

  const calories = Math.max(MIN_CALORIES, Math.round(tdee + (GOAL_CALORIE_ADJUSTMENT[goal] ?? 0)));

  const proteinPerKg = PROTEIN_PER_KG_BY_LEVEL[trainingLevel] || PROTEIN_PER_KG_BY_LEVEL.beginner;
  const protein = Math.round(weightKg * proteinPerKg);
  const fats = Math.round(weightKg * FATS_PER_KG);
  const carbs = Math.round(weightKg * CARBS_PER_KG);
  const fiber = Math.round((calories / 1000) * FIBER_PER_1000_KCAL);
  const sugar = Math.round((calories * SUGAR_CALORIE_SHARE) / 4);

  const fastingCalories = Math.max(MIN_CALORIES, Math.round(calories * FASTING_DAY_RATIO));
  const fastingProtein = Math.round(protein * FASTING_DAY_RATIO);
  const fastingFats = Math.round(fats * FASTING_DAY_RATIO);
  const fastingCarbs = Math.round(carbs * FASTING_DAY_RATIO);
  const fastingFiber = Math.round(fiber * FASTING_DAY_RATIO);
  const fastingSugar = Math.round(sugar * FASTING_DAY_RATIO);

  return {
    dailyCalorieTarget: calories,
    dailyProteinTarget: protein,
    dailyFatsTarget: fats,
    dailyCarbsTarget: carbs,
    dailyFiberTarget: fiber,
    dailySugarTarget: sugar,
    fastingCalorieTarget: fastingCalories,
    fastingProteinTarget: fastingProtein,
    fastingFatsTarget: fastingFats,
    fastingCarbsTarget: fastingCarbs,
    fastingFiberTarget: fastingFiber,
    fastingSugarTarget: fastingSugar
  };
};
