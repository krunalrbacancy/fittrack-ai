import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { foodAPI, waterAPI } from '../utils/api';
import { DailyStats, FoodEntry, WaterStats } from '../types';
import { getTodayDate } from '../utils/calculations';
import { Layout } from '../components/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DailyStats>({ totalCalories: 0, totalProtein: 0, foodCount: 0 });
  const [waterStats, setWaterStats] = useState<WaterStats>({ totalWater: 0, logCount: 0 });
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [manualWaterAmount, setManualWaterAmount] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadWaterStats(),
        loadFoods(),
        loadWeeklyStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await foodAPI.getStats(selectedDate);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadWaterStats = async () => {
    try {
      const data = await waterAPI.getStats(selectedDate);
      setWaterStats(data);
    } catch (error) {
      console.error('Failed to load water stats:', error);
    }
  };

  const loadFoods = async () => {
    try {
      const data = await foodAPI.getAll(selectedDate);
      setFoods(data);
    } catch (error) {
      console.error('Failed to load foods:', error);
    }
  };

  const loadWeeklyStats = async () => {
    try {
      const data = await foodAPI.getWeekly();
      const weekData = Object.entries(data).map(([date, values]: [string, any]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories: values.calories,
        protein: values.protein,
      }));
      setWeeklyStats(weekData);
    } catch (error) {
      console.error('Failed to load weekly stats:', error);
    }
  };

  const addWater = async (amount: number) => {
    try {
      await waterAPI.create({
        amount,
        date: selectedDate,
      } as any);
      loadWaterStats();
    } catch (error) {
      console.error('Failed to add water:', error);
      alert('Failed to add water');
    }
  };

  const handleManualWaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(manualWaterAmount);
    if (amount > 0) {
      await addWater(amount);
      setManualWaterAmount('');
    } else {
      alert('Please enter a valid amount');
    }
  };

  // Determine dayType from food entries (if any entry is fasting, day is fasting)
  const dayType = foods.length > 0 && foods.some(f => f.dayType === 'fasting') ? 'fasting' : 'normal';

  // Calculate calorie target based on dayType
  const calorieTarget = dayType === 'fasting' 
    ? (user?.fastingCalorieTarget || 500)
    : (user?.dailyCalorieTarget || 2000);
  
  const proteinTarget = user?.dailyProteinTarget || 150;
  
  // Calculate recommended water: currentWeight × 35 ml
  const recommendedWater = user?.currentWeight ? Math.round(user.currentWeight * 35) : 2000;
  
  const remainingCalories = Math.max(0, calorieTarget - stats.totalCalories);
  const remainingProtein = Math.max(0, proteinTarget - stats.totalProtein);
  const remainingWater = Math.max(0, recommendedWater - waterStats.totalWater);
  
  const calorieExceeded = stats.totalCalories > calorieTarget;
  const proteinDeficit = stats.totalProtein < proteinTarget;
  const waterDeficit = waterStats.totalWater < recommendedWater;

  const caloriePercentage = Math.min(100, (stats.totalCalories / calorieTarget) * 100);
  const proteinPercentage = Math.min(100, (stats.totalProtein / proteinTarget) * 100);
  const waterPercentage = Math.min(100, (waterStats.totalWater / recommendedWater) * 100);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full pb-12 md:pb-4">
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Daily Tracking</h1>
                {dayType === 'fasting' && (
                  <span className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
                    Fasting Day
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Track your calories, protein, and water intake
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {calorieExceeded && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> You have exceeded your daily calorie target!
                </p>
              </div>
            </div>
          </div>
        )}

        {proteinDeficit && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Reminder:</strong> You haven't reached your daily protein target yet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl md:text-3xl">🔥</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Calories
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {stats.totalCalories} / {calorieTarget}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl md:text-3xl">💪</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Protein
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {stats.totalProtein.toFixed(1)}g / {proteinTarget}g
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl md:text-3xl">💧</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Water
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {waterStats.totalWater}ml / {recommendedWater}ml
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl md:text-3xl">📊</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Remaining
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900">
                      {remainingCalories}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Calories Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  calorieExceeded ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, caloriePercentage)}%` }}
              >
                {caloriePercentage.toFixed(1)}%
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {stats.totalCalories} of {calorieTarget} calories
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Protein Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  proteinDeficit ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, proteinPercentage)}%` }}
              >
                {proteinPercentage.toFixed(1)}%
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {stats.totalProtein.toFixed(1)}g of {proteinTarget}g protein
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Water Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  waterDeficit ? 'bg-cyan-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, waterPercentage)}%` }}
              >
                {waterPercentage.toFixed(1)}%
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {waterStats.totalWater}ml of {recommendedWater}ml water
            </p>
          </div>
        </div>

        {/* Water Tracker */}
        <div className="bg-white shadow-md rounded-xl p-4 md:p-6 mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Water Tracker</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 md:gap-4 items-center">
              <span className="text-sm text-gray-600 w-full sm:w-auto mb-2 sm:mb-0">Quick add:</span>
              <button
                onClick={() => addWater(200)}
                className="flex-1 sm:flex-none px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 active:bg-blue-300 text-sm font-medium transition-colors touch-manipulation"
              >
                +200ml
              </button>
              <button
                onClick={() => addWater(250)}
                className="flex-1 sm:flex-none px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 active:bg-blue-300 text-sm font-medium transition-colors touch-manipulation"
              >
                +250ml
              </button>
              <button
                onClick={() => addWater(500)}
                className="flex-1 sm:flex-none px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 active:bg-blue-300 text-sm font-medium transition-colors touch-manipulation"
              >
                +500ml
              </button>
            </div>
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Remaining: <span className="font-semibold">{remainingWater}ml</span>
            </div>
            <div className="border-t pt-4">
              <form onSubmit={handleManualWaterSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manual Entry
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={manualWaterAmount}
                    onChange={(e) => setManualWaterAmount(e.target.value)}
                    placeholder="Enter amount in ml"
                    className="block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 text-base font-medium transition-colors touch-manipulation"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        {weeklyStats.length > 0 && (
          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Weekly Analytics</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calories" stroke="#ef4444" name="Calories" />
                <Line type="monotone" dataKey="protein" stroke="#3b82f6" name="Protein (g)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Layout>
  );
};
