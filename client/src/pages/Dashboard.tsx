import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { foodAPI, waterAPI } from '../utils/api';
import { DailyStats, FoodEntry, WaterStats } from '../types';
import { getTodayDate } from '../utils/calculations';
import { Layout } from '../components/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getFoodSuggestions } from '../utils/foodSuggestions';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DailyStats>({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0, foodCount: 0 });
  const [waterStats, setWaterStats] = useState<WaterStats>({ totalWater: 0, logCount: 0 });
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [manualWaterAmount, setManualWaterAmount] = useState('');
  const [waterLoading, setWaterLoading] = useState(false);
  const [waterAddingAmount, setWaterAddingAmount] = useState<number | null>(null);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [suggestionOffsets, setSuggestionOffsets] = useState({
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  });

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
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      // If error is 401 (unauthorized), set empty stats
      if (error.response?.status === 401) {
        setStats({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0, foodCount: 0 });
      }
    }
  };

  const loadWaterStats = async () => {
    try {
      const data = await waterAPI.getStats(selectedDate);
      setWaterStats(data);
    } catch (error: any) {
      console.error('Failed to load water stats:', error);
      // If error is 401 (unauthorized), set empty stats
      if (error.response?.status === 401) {
        setWaterStats({ totalWater: 0, logCount: 0 });
      }
    }
  };

  const loadFoods = async () => {
    try {
      const data = await foodAPI.getAll(selectedDate);
      setFoods(data);
    } catch (error: any) {
      console.error('Failed to load foods:', error);
      // If error is 401 (unauthorized), set empty array
      if (error.response?.status === 401) {
        setFoods([]);
      }
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
    if (waterLoading) return; // Prevent multiple clicks
    setWaterLoading(true);
    setWaterAddingAmount(amount);
    try {
      await waterAPI.create({
        amount,
        date: selectedDate,
      } as any);
      loadWaterStats();
    } catch (error) {
      console.error('Failed to add water:', error);
      alert('Failed to add water');
    } finally {
      setWaterLoading(false);
      setWaterAddingAmount(null);
    }
  };

  const handleManualWaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waterLoading) return; // Prevent multiple submissions
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
    ? (user?.fastingCalorieTarget || 1600)
    : (user?.dailyCalorieTarget || 2000);

  // Calculate nutrition targets based on dayType
  const proteinTarget = dayType === 'fasting'
    ? (user?.fastingProteinTarget || 70)
    : (user?.dailyProteinTarget || 90);

  const carbsTarget = dayType === 'fasting'
    ? (user?.fastingCarbsTarget || 170)
    : (user?.dailyCarbsTarget || 240);

  const fatsTarget = dayType === 'fasting'
    ? (user?.fastingFatsTarget || 55)
    : (user?.dailyFatsTarget || 60);

  const fiberTarget = dayType === 'fasting'
    ? (user?.fastingFiberTarget || 22)
    : (user?.dailyFiberTarget || 28);

  // Calculate recommended water: currentWeight × 35 ml
  const recommendedWater = user?.currentWeight ? Math.round(user.currentWeight * 35) : 2000;

  const remainingCalories = Math.max(0, calorieTarget - stats.totalCalories);
  const remainingProtein = Math.max(0, proteinTarget - stats.totalProtein);
  const remainingCarbs = Math.max(0, carbsTarget - (stats.totalCarbs || 0));
  const remainingFats = Math.max(0, fatsTarget - (stats.totalFats || 0));
  const remainingFiber = Math.max(0, fiberTarget - (stats.totalFiber || 0));
  const remainingWater = Math.max(0, recommendedWater - waterStats.totalWater);

  const calorieExceeded = stats.totalCalories > calorieTarget;
  const proteinDeficit = stats.totalProtein < proteinTarget;
  const carbsDeficit = (stats.totalCarbs || 0) < carbsTarget;
  const fatsDeficit = (stats.totalFats || 0) < fatsTarget;
  const fiberDeficit = (stats.totalFiber || 0) < fiberTarget;
  const waterDeficit = waterStats.totalWater < recommendedWater;

  // Calculate food suggestions for each meal
  const remainingNutrients = useMemo(() => ({
    calories: remainingCalories,
    protein: remainingProtein,
    carbs: remainingCarbs,
    fats: remainingFats,
    fiber: remainingFiber,
  }), [remainingCalories, remainingProtein, remainingCarbs, remainingFats, remainingFiber]);

  const breakfastSuggestions = useMemo(() => getFoodSuggestions('breakfast', remainingNutrients, suggestionOffsets.breakfast), [remainingNutrients, suggestionOffsets.breakfast]);
  const lunchSuggestions = useMemo(() => getFoodSuggestions('lunch', remainingNutrients, suggestionOffsets.lunch), [remainingNutrients, suggestionOffsets.lunch]);
  const snacksSuggestions = useMemo(() => getFoodSuggestions('snacks', remainingNutrients, suggestionOffsets.snacks), [remainingNutrients, suggestionOffsets.snacks]);
  const dinnerSuggestions = useMemo(() => getFoodSuggestions('dinner', remainingNutrients, suggestionOffsets.dinner), [remainingNutrients, suggestionOffsets.dinner]);

  // Handle refresh suggestions
  const handleRefreshSuggestions = (category: 'breakfast' | 'lunch' | 'snacks' | 'dinner') => {
    setSuggestionOffsets(prev => ({
      ...prev,
      [category]: (prev[category] + 3) % 9, // Cycle through suggestions
    }));
  };

  // Handle adding a food suggestion
  const handleAddSuggestion = async (suggestion: any, category: string) => {
    if (addingSuggestion) return; // Prevent multiple clicks
    setAddingSuggestion(suggestion.name);

    try {
      // Parse quantity from suggestion
      const quantityMatch = suggestion.quantity.match(/^(\d+(?:\.\d+)?)/);
      const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;

      await foodAPI.create({
        foodName: suggestion.name,
        calories: suggestion.calories,
        protein: suggestion.protein,
        carbs: suggestion.carbs,
        fats: suggestion.fats,
        fiber: suggestion.fiber,
        quantity: suggestion.per100g ? quantity / 100 : quantity,
        date: selectedDate,
        category: category as any,
        dayType: dayType,
      } as any);

      // Reload data
      await Promise.all([
        loadStats(),
        loadFoods(),
      ]);
    } catch (error) {
      console.error('Failed to add food suggestion:', error);
      alert('Failed to add food. Please try again.');
    } finally {
      setAddingSuggestion(null);
    }
  };

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
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
                  <div className="text-2xl md:text-3xl">🍞</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Carbs
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {(stats.totalCarbs || 0).toFixed(1)}g / {carbsTarget}g
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
                  <div className="text-2xl md:text-3xl">🥑</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Fats
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {(stats.totalFats || 0).toFixed(1)}g / {fatsTarget}g
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
                  <div className="text-2xl md:text-3xl">🌾</div>
                </div>
                <div className="ml-3 md:ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">
                      Fiber
                    </dt>
                    <dd className="text-base md:text-lg font-semibold text-gray-900 truncate">
                      {(stats.totalFiber || 0).toFixed(1)}g / {fiberTarget}g
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
            <div className="w-full bg-gray-200 rounded-full h-6 relative">
              <div
                className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  calorieExceeded ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, caloriePercentage)}%` }}
              >
                {caloriePercentage >= 10 && caloriePercentage.toFixed(1)}%
              </div>
              {caloriePercentage < 10 && (
                <div className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-semibold text-gray-700">
                  {caloriePercentage.toFixed(1)}%
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {stats.totalCalories} of {calorieTarget} calories
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Protein Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 relative">
              <div
                className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  proteinDeficit ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, proteinPercentage)}%` }}
              >
                {proteinPercentage >= 10 && proteinPercentage.toFixed(1)}%
              </div>
              {proteinPercentage < 10 && (
                <div className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-semibold text-gray-700">
                  {proteinPercentage.toFixed(1)}%
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {stats.totalProtein.toFixed(1)}g of {proteinTarget}g protein
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Carbs Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 relative">
              {(() => {
                const carbsPercentage = carbsTarget > 0 ? ((stats.totalCarbs || 0) / carbsTarget) * 100 : 0;
                const displayPercentage = Math.min(100, carbsPercentage);
                return (
                  <>
                    {displayPercentage >= 10 ? (
                      <div
                        className="h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-orange-500"
                        style={{ width: `${displayPercentage}%` }}
                      >
                        {`${displayPercentage.toFixed(1)}%`}
                      </div>
                    ) : (
                      <>
                        <div
                          className="h-6 rounded-full bg-orange-500"
                          style={{ width: `${displayPercentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-semibold text-gray-700">
                          {displayPercentage.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {(stats.totalCarbs || 0).toFixed(1)}g of {carbsTarget}g carbs
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Fats Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 relative">
              {(() => {
                const fatsPercentage = fatsTarget > 0 ? ((stats.totalFats || 0) / fatsTarget) * 100 : 0;
                const displayPercentage = Math.min(100, fatsPercentage);
                return (
                  <>
                    {displayPercentage >= 10 ? (
                      <div
                        className="h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-yellow-500"
                        style={{ width: `${displayPercentage}%` }}
                      >
                        {`${displayPercentage.toFixed(1)}%`}
                      </div>
                    ) : (
                      <>
                        <div
                          className="h-6 rounded-full bg-yellow-500"
                          style={{ width: `${displayPercentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-semibold text-gray-700">
                          {displayPercentage.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {(stats.totalFats || 0).toFixed(1)}g of {fatsTarget}g fats
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Fiber Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 relative">
              {(() => {
                const fiberPercentage = fiberTarget > 0 ? ((stats.totalFiber || 0) / fiberTarget) * 100 : 0;
                const displayPercentage = Math.min(100, fiberPercentage);
                return (
                  <>
                    {displayPercentage >= 10 ? (
                      <div
                        className="h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-green-500"
                        style={{ width: `${displayPercentage}%` }}
                      >
                        {`${displayPercentage.toFixed(1)}%`}
                      </div>
                    ) : (
                      <>
                        <div
                          className="h-6 rounded-full bg-green-500"
                          style={{ width: `${displayPercentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-semibold text-gray-700">
                          {displayPercentage.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {(stats.totalFiber || 0).toFixed(1)}g of {fiberTarget}g fiber
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Water Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 relative">
              <div
                className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  waterDeficit ? 'bg-cyan-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, waterPercentage)}%` }}
              >
                {waterPercentage >= 10 && waterPercentage.toFixed(1)}%
              </div>
              {waterPercentage < 10 && (
                <div className="absolute inset-0 flex items-center justify-start pl-2 text-xs font-semibold text-gray-700">
                  {waterPercentage.toFixed(1)}%
                </div>
              )}
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
                disabled={waterLoading}
                className="flex-1 sm:flex-none px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 active:bg-blue-300 text-sm font-medium transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {waterLoading && waterAddingAmount === 200 ? 'Adding...' : '+200ml'}
              </button>
              <button
                onClick={() => addWater(250)}
                disabled={waterLoading}
                className="flex-1 sm:flex-none px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 active:bg-blue-300 text-sm font-medium transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {waterLoading && waterAddingAmount === 250 ? 'Adding...' : '+250ml'}
              </button>
              <button
                onClick={() => addWater(500)}
                disabled={waterLoading}
                className="flex-1 sm:flex-none px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 active:bg-blue-300 text-sm font-medium transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {waterLoading && waterAddingAmount === 500 ? 'Adding...' : '+500ml'}
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
                    disabled={waterLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 text-base font-medium transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {waterLoading ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Food Suggestions */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Meal Suggestions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Breakfast Suggestions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span>🌅</span>
                  <span>Breakfast</span>
                </h4>
                <button
                  onClick={() => handleRefreshSuggestions('breakfast')}
                  className="text-xs px-2 py-1 bg-white rounded-lg hover:bg-yellow-100 active:bg-yellow-200 transition-colors text-gray-700 font-medium"
                  title="Get different suggestions"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-2">
                {breakfastSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddSuggestion(suggestion, 'breakfast')}
                    disabled={addingSuggestion === suggestion.name}
                    className="w-full text-left px-3 py-2 bg-white rounded-lg hover:bg-yellow-100 active:bg-yellow-200 transition-colors text-xs disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-gray-600 mt-1">
                      {suggestion.calories} cal, {suggestion.protein}g protein
                    </div>
                    {addingSuggestion === suggestion.name && (
                      <div className="text-blue-600 text-xs mt-1">Adding...</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Lunch Suggestions */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span>☀️</span>
                  <span>Lunch</span>
                </h4>
                <button
                  onClick={() => handleRefreshSuggestions('lunch')}
                  className="text-xs px-2 py-1 bg-white rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-colors text-gray-700 font-medium"
                  title="Get different suggestions"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-2">
                {lunchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddSuggestion(suggestion, 'lunch')}
                    disabled={addingSuggestion === suggestion.name}
                    className="w-full text-left px-3 py-2 bg-white rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-colors text-xs disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-gray-600 mt-1">
                      {suggestion.calories} cal, {suggestion.protein}g protein
                    </div>
                    {addingSuggestion === suggestion.name && (
                      <div className="text-blue-600 text-xs mt-1">Adding...</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Snacks Suggestions */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span>🍪</span>
                  <span>Snacks</span>
                </h4>
                <button
                  onClick={() => handleRefreshSuggestions('snacks')}
                  className="text-xs px-2 py-1 bg-white rounded-lg hover:bg-purple-100 active:bg-purple-200 transition-colors text-gray-700 font-medium"
                  title="Get different suggestions"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-2">
                {snacksSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddSuggestion(suggestion, 'snacks')}
                    disabled={addingSuggestion === suggestion.name}
                    className="w-full text-left px-3 py-2 bg-white rounded-lg hover:bg-purple-100 active:bg-purple-200 transition-colors text-xs disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-gray-600 mt-1">
                      {suggestion.calories} cal, {suggestion.protein}g protein
                    </div>
                    {addingSuggestion === suggestion.name && (
                      <div className="text-blue-600 text-xs mt-1">Adding...</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Dinner Suggestions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span>🌙</span>
                  <span>Dinner</span>
                </h4>
                <button
                  onClick={() => handleRefreshSuggestions('dinner')}
                  className="text-xs px-2 py-1 bg-white rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors text-gray-700 font-medium"
                  title="Get different suggestions"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-2">
                {dinnerSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleAddSuggestion(suggestion, 'dinner')}
                    disabled={addingSuggestion === suggestion.name}
                    className="w-full text-left px-3 py-2 bg-white rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors text-xs disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{suggestion.name}</div>
                    <div className="text-gray-600 mt-1">
                      {suggestion.calories} cal, {suggestion.protein}g protein
                    </div>
                    {addingSuggestion === suggestion.name && (
                      <div className="text-blue-600 text-xs mt-1">Adding...</div>
                    )}
                  </button>
                ))}
              </div>
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
