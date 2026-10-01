import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';

import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/context/AuthContext';
import { DailyStats, FoodEntry, WaterStats } from '@/types';
import { getTodayDate } from '@/utils/calculations';
import { foodAPI, waterAPI } from '@/utils/api';
import { FOOD_BY_CATEGORY, FoodSuggestion, getFoodSuggestions } from '@/utils/foodSuggestions';

const EMPTY_STATS: DailyStats = {
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFats: 0,
  totalFiber: 0,
  foodCount: 0,
};

const MEAL_SECTIONS: { key: 'breakfast' | 'lunch' | 'snacks' | 'dinner'; label: string; icon: string; bg: string; border: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'lunch', label: 'Lunch', icon: '☀️', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'snacks', label: 'Snacks', icon: '🍪', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'dinner', label: 'Dinner', icon: '🌙', bg: 'bg-blue-50', border: 'border-blue-200' },
];

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DailyStats>(EMPTY_STATS);
  const [waterStats, setWaterStats] = useState<WaterStats>({ totalWater: 0, logCount: 0 });
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{ date: string; calories: number; protein: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [manualWaterAmount, setManualWaterAmount] = useState('');
  const [waterLoading, setWaterLoading] = useState(false);
  const [waterAddingAmount, setWaterAddingAmount] = useState<number | null>(null);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionOffsets, setSuggestionOffsets] = useState({
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await foodAPI.getStats(selectedDate);
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      if (error.response?.status === 401) {
        setStats(EMPTY_STATS);
      }
    }
  }, [selectedDate]);

  const loadWaterStats = useCallback(async () => {
    try {
      const data = await waterAPI.getStats(selectedDate);
      setWaterStats(data);
    } catch (error: any) {
      console.error('Failed to load water stats:', error);
      if (error.response?.status === 401) {
        setWaterStats({ totalWater: 0, logCount: 0 });
      }
    }
  }, [selectedDate]);

  const loadFoods = useCallback(async () => {
    try {
      const data = await foodAPI.getAll(selectedDate);
      setFoods(data);
    } catch (error: any) {
      console.error('Failed to load foods:', error);
      if (error.response?.status === 401) {
        setFoods([]);
      }
    }
  }, [selectedDate]);

  const loadWeeklyStats = useCallback(async () => {
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
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadWaterStats(), loadFoods(), loadWeeklyStats()]);
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadWaterStats, loadFoods, loadWeeklyStats]);

  useEffect(() => {
    if (!authLoading) {
      // loadData's setState calls happen inside async continuations, not
      // synchronously in this effect body, so this doesn't cascade renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    }
  }, [loadData, authLoading, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const addWater = async (amount: number) => {
    if (waterLoading) return;
    setWaterLoading(true);
    setWaterAddingAmount(amount);
    try {
      await waterAPI.create({ amount, date: selectedDate } as any);
      await loadWaterStats();
    } catch (error) {
      console.error('Failed to add water:', error);
      Alert.alert('Error', 'Failed to add water');
    } finally {
      setWaterLoading(false);
      setWaterAddingAmount(null);
    }
  };

  const handleManualWaterSubmit = async () => {
    if (waterLoading) return;
    const amount = Number(manualWaterAmount);
    if (amount > 0) {
      await addWater(amount);
      setManualWaterAmount('');
    } else {
      Alert.alert('Invalid amount', 'Please enter a valid amount');
    }
  };

  const dayType = foods.length > 0 && foods.some((f) => f.dayType === 'fasting') ? 'fasting' : 'normal';

  const calorieTarget = dayType === 'fasting' ? user?.fastingCalorieTarget || 1600 : user?.dailyCalorieTarget || 2000;
  const proteinTarget = dayType === 'fasting' ? user?.fastingProteinTarget || 70 : user?.dailyProteinTarget || 90;
  const carbsTarget = dayType === 'fasting' ? user?.fastingCarbsTarget || 170 : user?.dailyCarbsTarget || 240;
  const fatsTarget = dayType === 'fasting' ? user?.fastingFatsTarget || 55 : user?.dailyFatsTarget || 60;
  const fiberTarget = dayType === 'fasting' ? user?.fastingFiberTarget || 22 : user?.dailyFiberTarget || 28;

  const recommendedWater = user?.currentWeight ? Math.round(user.currentWeight * 35) : 2000;

  const remainingCalories = Math.max(0, calorieTarget - stats.totalCalories);
  const remainingProtein = Math.max(0, proteinTarget - stats.totalProtein);
  const remainingCarbs = Math.max(0, carbsTarget - (stats.totalCarbs || 0));
  const remainingFats = Math.max(0, fatsTarget - (stats.totalFats || 0));
  const remainingFiber = Math.max(0, fiberTarget - (stats.totalFiber || 0));
  const remainingWater = Math.max(0, recommendedWater - waterStats.totalWater);

  const calorieExceeded = stats.totalCalories > calorieTarget;
  const proteinDeficit = stats.totalProtein < proteinTarget;
  const waterDeficit = waterStats.totalWater < recommendedWater;

  const remainingNutrients = useMemo(
    () => ({
      calories: remainingCalories,
      protein: remainingProtein,
      carbs: remainingCarbs,
      fats: remainingFats,
      fiber: remainingFiber,
      sugar: 0,
    }),
    [remainingCalories, remainingProtein, remainingCarbs, remainingFats, remainingFiber]
  );

  const suggestionsByCategory: Record<'breakfast' | 'lunch' | 'snacks' | 'dinner', FoodSuggestion[]> = {
    breakfast: useMemo(
      () => getFoodSuggestions('breakfast', remainingNutrients, suggestionOffsets.breakfast),
      [remainingNutrients, suggestionOffsets.breakfast]
    ),
    lunch: useMemo(
      () => getFoodSuggestions('lunch', remainingNutrients, suggestionOffsets.lunch),
      [remainingNutrients, suggestionOffsets.lunch]
    ),
    snacks: useMemo(
      () => getFoodSuggestions('snacks', remainingNutrients, suggestionOffsets.snacks),
      [remainingNutrients, suggestionOffsets.snacks]
    ),
    dinner: useMemo(
      () => getFoodSuggestions('dinner', remainingNutrients, suggestionOffsets.dinner),
      [remainingNutrients, suggestionOffsets.dinner]
    ),
  };

  const handleRefreshSuggestions = (category: 'breakfast' | 'lunch' | 'snacks' | 'dinner') => {
    const categoryFoods = FOOD_BY_CATEGORY[category] || [];
    const maxOffset = Math.max(1, categoryFoods.length - 2);
    setSuggestionOffsets((prev) => ({
      ...prev,
      [category]: (prev[category] + 3) % maxOffset,
    }));
  };

  const handleAddSuggestion = async (suggestion: FoodSuggestion, category: string) => {
    if (addingSuggestion) return;
    setAddingSuggestion(suggestion.name);

    try {
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
        dayType,
      } as any);

      await loadData();
    } catch (error) {
      console.error('Failed to add food suggestion:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    } finally {
      setAddingSuggestion(null);
    }
  };

  const caloriePercentage = (stats.totalCalories / calorieTarget) * 100;
  const proteinPercentage = (stats.totalProtein / proteinTarget) * 100;
  const carbsPercentage = carbsTarget > 0 ? ((stats.totalCarbs || 0) / carbsTarget) * 100 : 0;
  const fatsPercentage = fatsTarget > 0 ? ((stats.totalFats || 0) / fatsTarget) * 100 : 0;
  const fiberPercentage = fiberTarget > 0 ? ((stats.totalFiber || 0) / fiberTarget) * 100 : 0;
  const waterPercentage = (waterStats.totalWater / recommendedWater) * 100;

  const statCards = [
    { icon: '🔥', label: 'Calories', value: `${stats.totalCalories} / ${calorieTarget}` },
    { icon: '💪', label: 'Protein', value: `${stats.totalProtein.toFixed(1)}g / ${proteinTarget}g` },
    { icon: '💧', label: 'Water', value: `${waterStats.totalWater}ml / ${recommendedWater}ml` },
    { icon: '🍞', label: 'Carbs', value: `${(stats.totalCarbs || 0).toFixed(1)}g / ${carbsTarget}g` },
    { icon: '🥑', label: 'Fats', value: `${(stats.totalFats || 0).toFixed(1)}g / ${fatsTarget}g` },
    { icon: '🌾', label: 'Fiber', value: `${(stats.totalFiber || 0).toFixed(1)}g / ${fiberTarget}g` },
    { icon: '📊', label: 'Remaining', value: `${remainingCalories}` },
  ];

  const progressBars = [
    { label: 'Calories', percentage: caloriePercentage, color: calorieExceeded ? '#ef4444' : '#22c55e', caption: `${stats.totalCalories} of ${calorieTarget} calories` },
    { label: 'Protein', percentage: proteinPercentage, color: proteinDeficit ? '#eab308' : '#3b82f6', caption: `${stats.totalProtein.toFixed(1)}g of ${proteinTarget}g protein` },
    { label: 'Carbs', percentage: carbsPercentage, color: '#f97316', caption: `${(stats.totalCarbs || 0).toFixed(1)}g of ${carbsTarget}g carbs` },
    { label: 'Fats', percentage: fatsPercentage, color: '#eab308', caption: `${(stats.totalFats || 0).toFixed(1)}g of ${fatsTarget}g fats` },
    { label: 'Fiber', percentage: fiberPercentage, color: '#22c55e', caption: `${(stats.totalFiber || 0).toFixed(1)}g of ${fiberTarget}g fiber` },
    { label: 'Water', percentage: waterPercentage, color: waterDeficit ? '#06b6d4' : '#2563eb', caption: `${waterStats.totalWater}ml of ${recommendedWater}ml water` },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View className="mb-4 flex-row flex-wrap items-center gap-3">
          <Text className="text-2xl font-bold text-gray-900">Daily Tracking</Text>
          {dayType === 'fasting' && (
            <View className="rounded-full bg-purple-100 px-3 py-1.5">
              <Text className="text-xs font-medium text-purple-800">Fasting Day</Text>
            </View>
          )}
          <Pressable onPress={handleRefresh} disabled={refreshing} className="ml-auto rounded-lg p-2">
            <Ionicons name="refresh" size={20} color="#4b5563" />
          </Pressable>
        </View>
        <Text className="mb-4 text-sm text-gray-600">Track your calories, protein, and water intake</Text>

        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          <Text className="text-base text-gray-900">{selectedDate}</Text>
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(selectedDate)}
            mode="date"
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'set' && date) {
                setSelectedDate(date.toISOString().split('T')[0]);
              } else {
                setShowDatePicker(false);
              }
            }}
          />
        )}

        {calorieExceeded && (
          <View className="mb-4 border-l-4 border-red-500 bg-red-50 p-4">
            <Text className="text-sm text-red-700">
              <Text className="font-bold">Warning: </Text>
              You have exceeded your daily calorie target!
            </Text>
          </View>
        )}

        {proteinDeficit && (
          <View className="mb-4 border-l-4 border-yellow-500 bg-yellow-50 p-4">
            <Text className="text-sm text-yellow-700">
              <Text className="font-bold">Reminder: </Text>
              You haven&apos;t reached your daily protein target yet.
            </Text>
          </View>
        )}

        <View className="mb-6 flex-row flex-wrap gap-3">
          {statCards.map((card) => (
            <View key={card.label} className="min-w-[45%] flex-1 rounded-xl bg-white p-4 shadow-sm">
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">{card.icon}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-500">{card.label}</Text>
                  <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                    {card.value}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="mb-6 gap-4">
          {progressBars.map((bar) => (
            <View key={bar.label} className="rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-3 text-base font-semibold text-gray-900">{bar.label} Progress</Text>
              <ProgressBar percentage={bar.percentage} color={bar.color} />
              <Text className="mt-2 text-sm text-gray-600">{bar.caption}</Text>
            </View>
          ))}
        </View>

        <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-900">Water Tracker</Text>
          <View className="flex-row flex-wrap gap-2">
            {[200, 250, 500].map((amount) => (
              <Pressable
                key={amount}
                onPress={() => addWater(amount)}
                disabled={waterLoading}
                className="flex-1 items-center rounded-xl bg-blue-100 px-4 py-3 disabled:opacity-50"
              >
                <Text className="text-sm font-medium text-blue-700">
                  {waterLoading && waterAddingAmount === amount ? 'Adding...' : `+${amount}ml`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-4 text-sm text-gray-600">
            Remaining: <Text className="font-semibold">{remainingWater}ml</Text>
          </Text>
          <View className="mt-4 flex-row gap-3 border-t border-gray-200 pt-4">
            <TextInput
              keyboardType="number-pad"
              value={manualWaterAmount}
              onChangeText={setManualWaterAmount}
              placeholder="Enter amount in ml"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
            />
            <Pressable
              onPress={handleManualWaterSubmit}
              disabled={waterLoading}
              className="items-center justify-center rounded-xl bg-blue-600 px-6 disabled:opacity-50"
            >
              <Text className="text-base font-medium text-white">{waterLoading ? 'Adding...' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-6">
          <Text className="mb-4 text-base font-semibold text-gray-900">Meal Suggestions</Text>
          <View className="gap-4">
            {MEAL_SECTIONS.map((section) => (
              <View key={section.key} className={`rounded-xl border p-4 ${section.bg} ${section.border}`}>
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-gray-900">
                    {section.icon} {section.label}
                  </Text>
                  <Pressable
                    onPress={() => handleRefreshSuggestions(section.key)}
                    className="rounded-lg bg-white px-2 py-1"
                  >
                    <Text className="text-xs font-medium text-gray-700">🔄 Refresh</Text>
                  </Pressable>
                </View>
                <View className="gap-2">
                  {suggestionsByCategory[section.key].map((suggestion, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleAddSuggestion(suggestion, section.key)}
                      disabled={addingSuggestion === suggestion.name}
                      className="rounded-lg bg-white px-3 py-2 disabled:opacity-50"
                    >
                      <Text className="text-xs font-medium text-gray-900">{suggestion.name}</Text>
                      <Text className="mt-1 text-xs text-gray-600">
                        {suggestion.calories} cal, {suggestion.protein}g protein
                      </Text>
                      {addingSuggestion === suggestion.name && (
                        <Text className="mt-1 text-xs text-blue-600">Adding...</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {weeklyStats.length > 0 && (
          <View className="rounded-xl bg-white p-4 shadow-sm">
            <Text className="mb-4 text-base font-semibold text-gray-900">Weekly Analytics</Text>
            <LineChart
              data={weeklyStats.map((w) => ({ value: w.calories, label: w.date }))}
              data2={weeklyStats.map((w) => ({ value: w.protein }))}
              color1="#ef4444"
              color2="#3b82f6"
              thickness={2}
              hideDataPoints={false}
              dataPointsRadius={3}
              height={220}
              noOfSections={4}
              yAxisTextStyle={{ fontSize: 10, color: '#6b7280' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#6b7280' }}
              spacing={40}
              initialSpacing={16}
            />
            <View className="mt-3 flex-row gap-4">
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <Text className="text-xs text-gray-600">Calories</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <Text className="text-xs text-gray-600">Protein (g)</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
