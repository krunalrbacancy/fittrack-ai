import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import FoodEntry from '../models/FoodEntry.js';
import WeightLog from '../models/WeightLog.js';
import WaistLog from '../models/WaistLog.js';
import StepsLog from '../models/StepsLog.js';
import WaterLog from '../models/WaterLog.js';
import WorkoutLog from '../models/WorkoutLog.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatUsage from '../models/ChatUsage.js';
import { calculateNutritionTargets } from './nutritionTargets.js';

export const GUEST_USERNAME = 'guest';
const GUEST_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SEED_DAYS = 21;

const GUEST_PROFILE = {
  name: 'Guest',
  gender: 'male',
  age: 29,
  height: 178,
  activityLevel: 'moderate',
  goalType: 'lose',
  startWeight: 84,
  targetWeight: 76,
  startWaist: 92,
  targetWaist: 84
};

const FOOD_LIBRARY = {
  breakfast: [
    { foodName: 'Moong dal chilla', calories: 196, protein: 13.2, carbs: 22, fats: 5, fiber: 4, sugar: 2 },
    { foodName: '2 boiled eggs + toast', calories: 260, protein: 18, carbs: 22, fats: 11, fiber: 2, sugar: 2 },
    { foodName: 'Oats with milk and banana', calories: 320, protein: 12, carbs: 55, fats: 6, fiber: 6, sugar: 18 },
    { foodName: 'Greek yogurt with berries', calories: 180, protein: 15, carbs: 20, fats: 4, fiber: 3, sugar: 14 }
  ],
  lunch: [
    { foodName: '150g chicken breast + rice', calories: 480, protein: 42, carbs: 55, fats: 8, fiber: 2, sugar: 1 },
    { foodName: '150g paneer + 2 roti', calories: 520, protein: 28, carbs: 48, fats: 22, fiber: 5, sugar: 3 },
    { foodName: 'Rajma chawal', calories: 450, protein: 16, carbs: 78, fats: 8, fiber: 10, sugar: 4 },
    { foodName: 'Grilled fish + salad', calories: 380, protein: 36, carbs: 12, fats: 18, fiber: 4, sugar: 3 }
  ],
  snacks: [
    { foodName: 'Protein shake', calories: 120, protein: 25, carbs: 3, fats: 1, fiber: 0, sugar: 1 },
    { foodName: 'Roasted chana', calories: 180, protein: 10, carbs: 24, fats: 4, fiber: 6, sugar: 1 },
    { foodName: 'Mixed nuts (30g)', calories: 190, protein: 6, carbs: 6, fats: 17, fiber: 3, sugar: 1 },
    { foodName: 'Fruit bowl', calories: 110, protein: 1.5, carbs: 27, fats: 0.5, fiber: 4, sugar: 20 }
  ],
  dinner: [
    { foodName: 'Chicken curry + 2 roti', calories: 520, protein: 38, carbs: 42, fats: 20, fiber: 5, sugar: 3 },
    { foodName: 'Dal + brown rice + sabzi', calories: 420, protein: 16, carbs: 70, fats: 8, fiber: 9, sugar: 3 },
    { foodName: 'Grilled paneer + veggies', calories: 380, protein: 24, carbs: 20, fats: 22, fiber: 6, sugar: 4 },
    { foodName: 'Soup + salad', calories: 260, protein: 12, carbs: 30, fats: 8, fiber: 7, sugar: 6 }
  ]
};

const WORKOUT_TYPES = ['Strength training', 'Running', 'Yoga', 'Cycling', 'HIIT'];

const pick = (arr, seed) => arr[seed % arr.length];
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

const buildSeedData = (userId) => {
  const weightLogs = [];
  const waistLogs = [];
  const stepsLogs = [];
  const waterLogs = [];
  const workoutLogs = [];
  const foodEntries = [];

  const { startWeight, targetWeight, startWaist, targetWaist } = GUEST_PROFILE;
  const weightDrop = startWeight - targetWeight;
  const waistDrop = startWaist - targetWaist;

  for (let i = SEED_DAYS; i >= 0; i--) {
    const date = daysAgo(i);
    const progress = (SEED_DAYS - i) / SEED_DAYS;
    const noise = Math.sin(i * 1.7) * 0.3;

    weightLogs.push({
      userId,
      weight: Number((startWeight - weightDrop * progress + noise).toFixed(1)),
      date
    });

    if (i % 3 === 0) {
      waistLogs.push({
        userId,
        waist: Number((startWaist - waistDrop * progress).toFixed(1)),
        date
      });
    }

    stepsLogs.push({
      userId,
      steps: 5500 + Math.round(Math.abs(Math.sin(i * 0.9)) * 5500),
      date
    });

    waterLogs.push({ userId, amount: 250, date: new Date(date.setHours(8, 0, 0, 0)) });
    waterLogs.push({ userId, amount: 500, date: new Date(date.setHours(13, 0, 0, 0)) });
    waterLogs.push({ userId, amount: 250, date: new Date(date.setHours(18, 0, 0, 0)) });

    if (i % 2 === 0) {
      workoutLogs.push({
        userId,
        date,
        workoutType: pick(WORKOUT_TYPES, i),
        duration: 30 + (i % 3) * 15
      });
    }

    (['breakfast', 'lunch', 'snacks', 'dinner']).forEach((category, catIdx) => {
      const item = pick(FOOD_LIBRARY[category], i + catIdx);
      foodEntries.push({
        userId,
        ...item,
        quantity: 1,
        category,
        dayType: 'normal',
        date
      });
    });
  }

  return { weightLogs, waistLogs, stepsLogs, waterLogs, workoutLogs, foodEntries };
};

export const resetGuestAccount = async () => {
  let guest = await User.findOne({ username: GUEST_USERNAME });

  const targets = calculateNutritionTargets({
    gender: GUEST_PROFILE.gender,
    weightKg: GUEST_PROFILE.startWeight,
    heightCm: GUEST_PROFILE.height,
    age: GUEST_PROFILE.age,
    activityLevel: GUEST_PROFILE.activityLevel,
    goal: GUEST_PROFILE.goalType
  });

  const profileFields = {
    name: GUEST_PROFILE.name,
    gender: GUEST_PROFILE.gender,
    age: GUEST_PROFILE.age,
    height: GUEST_PROFILE.height,
    activityLevel: GUEST_PROFILE.activityLevel,
    currentWeight: GUEST_PROFILE.startWeight,
    targetWeight: GUEST_PROFILE.targetWeight,
    targetWaist: GUEST_PROFILE.targetWaist,
    goal: 'Lose Weight',
    goalType: GUEST_PROFILE.goalType,
    onboardingCompleted: true,
    isGuest: true,
    guestResetAt: new Date(),
    ...targets
  };

  if (!guest) {
    guest = await User.create({
      username: GUEST_USERNAME,
      password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
      ...profileFields
    });
  } else {
    Object.assign(guest, profileFields);
    await guest.save();
  }

  await Promise.all([
    FoodEntry.deleteMany({ userId: guest._id }),
    WeightLog.deleteMany({ userId: guest._id }),
    WaistLog.deleteMany({ userId: guest._id }),
    StepsLog.deleteMany({ userId: guest._id }),
    WaterLog.deleteMany({ userId: guest._id }),
    WorkoutLog.deleteMany({ userId: guest._id }),
    ChatMessage.deleteMany({ userId: guest._id }),
    ChatUsage.deleteMany({ userId: guest._id })
  ]);

  const { weightLogs, waistLogs, stepsLogs, waterLogs, workoutLogs, foodEntries } = buildSeedData(guest._id);

  await Promise.all([
    WeightLog.insertMany(weightLogs),
    WaistLog.insertMany(waistLogs),
    StepsLog.insertMany(stepsLogs),
    WaterLog.insertMany(waterLogs),
    WorkoutLog.insertMany(workoutLogs),
    FoodEntry.insertMany(foodEntries)
  ]);

  return guest;
};

export const getOrResetGuestAccount = async () => {
  const guest = await User.findOne({ username: GUEST_USERNAME });

  const needsReset =
    !guest ||
    !guest.guestResetAt ||
    Date.now() - guest.guestResetAt.getTime() > GUEST_RESET_INTERVAL_MS;

  if (needsReset) {
    return resetGuestAccount();
  }

  return guest;
};
