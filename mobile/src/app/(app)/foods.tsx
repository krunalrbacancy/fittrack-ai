import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { FoodEntry, FoodIngredient } from '@/types';
import { foodAPI } from '@/utils/api';
import { formatDate, getTodayDate } from '@/utils/calculations';
import { FOOD_BY_CATEGORY, FoodSuggestion, getFoodSuggestions as getMealSuggestions } from '@/utils/foodSuggestions';
import {
  getBaseNutritionData,
  getFoodSuggestions as getNutritionSuggestions,
  getNutritionForAutoFill,
  getNutritionForFood,
  getNutritionFromStaticOnly,
} from '@/utils/nutrition';

type Category = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
type DayType = 'normal' | 'fasting';

const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; border: string; bg: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅', border: 'border-yellow-400', bg: 'bg-yellow-50' },
  lunch: { label: 'Lunch', emoji: '☀️', border: 'border-orange-400', bg: 'bg-orange-50' },
  snacks: { label: 'Snacks', emoji: '🍪', border: 'border-purple-400', bg: 'bg-purple-50' },
  dinner: { label: 'Dinner', emoji: '🌙', border: 'border-blue-400', bg: 'bg-blue-50' },
};

const MEAL_SECTIONS: { key: Category; label: string; icon: string; bg: string; border: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'lunch', label: 'Lunch', icon: '☀️', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'snacks', label: 'Snacks', icon: '🍪', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'dinner', label: 'Dinner', icon: '🌙', bg: 'bg-blue-50', border: 'border-blue-200' },
];

interface BaseNutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  per100g: boolean;
}

const emptyFormData = () => ({
  foodName: '',
  protein: '',
  calories: '',
  carbs: '',
  fats: '',
  fiber: '',
  sugar: '',
  quantity: '1',
  date: getTodayDate(),
  category: 'lunch' as Category,
  dayType: 'normal' as DayType,
});

const emptyIngredientDraft = () => ({ name: '', quantity: '1', calories: '', protein: '', carbs: '', fats: '', fiber: '' });

function sumIngredients(ingredients: FoodIngredient[]) {
  return ingredients.reduce(
    (totals, ing) => ({
      calories: totals.calories + (ing.calories || 0),
      protein: totals.protein + (ing.protein || 0),
      carbs: totals.carbs + (ing.carbs || 0),
      fats: totals.fats + (ing.fats || 0),
      fiber: totals.fiber + (ing.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );
}

export default function Foods() {
  const { user, loading: authLoading } = useAuth();
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0 });
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [suggestionOffsets, setSuggestionOffsets] = useState({ breakfast: 0, lunch: 0, snacks: 0, dinner: 0 });
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [baseNutritionData, setBaseNutritionData] = useState<BaseNutritionData | null>(null);
  const [formData, setFormData] = useState(emptyFormData());
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const nutritionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [multiMode, setMultiMode] = useState(false);
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState(emptyIngredientDraft());
  const [ingredientLookupLoading, setIngredientLookupLoading] = useState(false);
  const [ingredientLookupFailed, setIngredientLookupFailed] = useState(false);
  const [ingredientBaseData, setIngredientBaseData] = useState<BaseNutritionData | null>(null);
  const ingredientLookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await foodAPI.getAll(selectedDate);
      setFoods(data);
      try {
        const statsData = await foodAPI.getStats(selectedDate);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    } catch (error: any) {
      console.error('Failed to load foods:', error);
      if (error.response?.status === 401) {
        setFoods([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFoods();
    }
  }, [loadFoods, authLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFoods();
    } finally {
      setRefreshing(false);
    }
  };

  const foodSuggestions = useMemo(() => {
    if (!showModal || manualEntry) return [];
    const query = formData.foodName.trim();
    return query.length > 0 ? getNutritionSuggestions(query) : [];
  }, [formData.foodName, showModal, manualEntry]);

  const showSuggestions = !suggestionsDismissed && foodSuggestions.length > 0 && !manualEntry;

  useEffect(() => {
    if (editingFood || manualEntry || !formData.foodName.trim() || !showModal) {
      return;
    }

    if (nutritionTimeoutRef.current) {
      clearTimeout(nutritionTimeoutRef.current);
    }

    nutritionTimeoutRef.current = setTimeout(async () => {
      const foodName = formData.foodName.trim();
      if (foodName.length < 2) return;

      setNutritionLoading(true);
      setNutritionError(null);

      try {
        const result = getNutritionFromStaticOnly(foodName);
        if (result) {
          const { nutritionData, isPer100g } = result;
          setBaseNutritionData({
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.carbs || 0,
            fats: nutritionData.fats || 0,
            fiber: nutritionData.fiber || 0,
            sugar: nutritionData.sugar || 0,
            per100g: isPer100g,
          });
          const defaultQuantity = isPer100g ? '100' : '1';
          setFormData((prev) => ({
            ...prev,
            calories: nutritionData.calories.toString(),
            protein: nutritionData.protein.toString(),
            carbs: nutritionData.carbs?.toString() || '',
            fats: nutritionData.fats?.toString() || '',
            fiber: nutritionData.fiber?.toString() || '',
            sugar: nutritionData.sugar?.toString() || '0',
            quantity: defaultQuantity,
            foodName: nutritionData.foodName || prev.foodName,
          }));
        } else {
          setNutritionError(null);
        }
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
        setNutritionError(null);
      } finally {
        setNutritionLoading(false);
      }
    }, 800);

    return () => {
      if (nutritionTimeoutRef.current) {
        clearTimeout(nutritionTimeoutRef.current);
      }
    };
  }, [formData.foodName, editingFood, showModal, manualEntry]);

  // Debounced nutrition auto-fill for the ingredient being drafted (multi-ingredient mode).
  // Checks the local food database first, then falls back to the USDA API search —
  // same lookup the single-item form uses — so unusual ingredients still resolve.
  useEffect(() => {
    if (!multiMode || !showModal || !ingredientDraft.name.trim()) return;

    if (ingredientLookupTimeoutRef.current) {
      clearTimeout(ingredientLookupTimeoutRef.current);
    }

    ingredientLookupTimeoutRef.current = setTimeout(async () => {
      const name = ingredientDraft.name.trim();
      if (name.length < 2) return;

      setIngredientLookupLoading(true);
      setIngredientLookupFailed(false);
      try {
        const result = await getNutritionForAutoFill(name, true);
        if (result) {
          const { nutritionData, isPer100g } = result;
          const baseData: BaseNutritionData = {
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.carbs || 0,
            fats: nutritionData.fats || 0,
            fiber: nutritionData.fiber || 0,
            sugar: nutritionData.sugar || 0,
            per100g: isPer100g,
          };
          setIngredientBaseData(baseData);
          setIngredientDraft((prev) => ({
            ...prev,
            quantity: isPer100g ? '100' : '1',
            calories: nutritionData.calories.toString(),
            protein: nutritionData.protein.toString(),
            carbs: nutritionData.carbs?.toString() || '',
            fats: nutritionData.fats?.toString() || '',
            fiber: nutritionData.fiber?.toString() || '',
          }));
        } else {
          setIngredientBaseData(null);
          setIngredientLookupFailed(true);
        }
      } catch (error) {
        console.error('Error fetching ingredient nutrition data:', error);
        setIngredientBaseData(null);
        setIngredientLookupFailed(true);
      } finally {
        setIngredientLookupLoading(false);
      }
    }, 800);

    return () => {
      if (ingredientLookupTimeoutRef.current) {
        clearTimeout(ingredientLookupTimeoutRef.current);
      }
    };
  }, [ingredientDraft.name, multiMode, showModal]);

  const handleIngredientQuantityChange = (text: string) => {
    setIngredientDraft((prev) => ({ ...prev, quantity: text }));
    if (!ingredientBaseData) return;
    const quantity = parseFloat(text) || 1;
    const multiplier = ingredientBaseData.per100g ? quantity / 100 : quantity;
    setIngredientDraft((prev) => ({
      ...prev,
      quantity: text,
      calories: Math.round(ingredientBaseData.calories * multiplier).toString(),
      protein: (Math.round(ingredientBaseData.protein * multiplier * 10) / 10).toString(),
      carbs: (Math.round(ingredientBaseData.carbs * multiplier * 10) / 10).toString(),
      fats: (Math.round(ingredientBaseData.fats * multiplier * 10) / 10).toString(),
      fiber: (Math.round(ingredientBaseData.fiber * multiplier * 10) / 10).toString(),
    }));
  };

  const handleAddIngredient = () => {
    const name = ingredientDraft.name.trim();
    if (!name || !ingredientDraft.calories || !ingredientDraft.protein) {
      Alert.alert(
        'Missing fields',
        'Ingredient name, calories, and protein are required. If auto-fill couldn’t find this ingredient, enter the values manually.'
      );
      return;
    }
    setIngredients((prev) => [
      ...prev,
      {
        name,
        quantity: Number(ingredientDraft.quantity) || 1,
        calories: Number(ingredientDraft.calories) || 0,
        protein: Number(ingredientDraft.protein) || 0,
        carbs: ingredientDraft.carbs ? Number(ingredientDraft.carbs) : 0,
        fats: ingredientDraft.fats ? Number(ingredientDraft.fats) : 0,
        fiber: ingredientDraft.fiber ? Number(ingredientDraft.fiber) : 0,
      },
    ]);
    setIngredientDraft(emptyIngredientDraft());
    setIngredientBaseData(null);
    setIngredientLookupFailed(false);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const ingredientTotals = useMemo(() => sumIngredients(ingredients), [ingredients]);

  const dayType: DayType = foods.length > 0 && foods.some((f) => f.dayType === 'fasting') ? 'fasting' : 'normal';
  const calorieTarget = dayType === 'fasting' ? user?.fastingCalorieTarget || 1600 : user?.dailyCalorieTarget || 2000;
  const proteinTarget = dayType === 'fasting' ? user?.fastingProteinTarget || 70 : user?.dailyProteinTarget || 90;
  const carbsTarget = dayType === 'fasting' ? user?.fastingCarbsTarget || 170 : user?.dailyCarbsTarget || 240;
  const fatsTarget = dayType === 'fasting' ? user?.fastingFatsTarget || 55 : user?.dailyFatsTarget || 60;
  const fiberTarget = dayType === 'fasting' ? user?.fastingFiberTarget || 22 : user?.dailyFiberTarget || 28;

  const remainingNutrients = useMemo(
    () => ({
      calories: Math.max(0, calorieTarget - stats.totalCalories),
      protein: Math.max(0, proteinTarget - stats.totalProtein),
      carbs: Math.max(0, carbsTarget - (stats.totalCarbs || 0)),
      fats: Math.max(0, fatsTarget - (stats.totalFats || 0)),
      fiber: Math.max(0, fiberTarget - (stats.totalFiber || 0)),
      sugar: 0,
    }),
    [calorieTarget, proteinTarget, carbsTarget, fatsTarget, fiberTarget, stats]
  );

  const suggestionsByCategory: Record<Category, FoodSuggestion[]> = {
    breakfast: useMemo(
      () => getMealSuggestions('breakfast', remainingNutrients, suggestionOffsets.breakfast),
      [remainingNutrients, suggestionOffsets.breakfast]
    ),
    lunch: useMemo(
      () => getMealSuggestions('lunch', remainingNutrients, suggestionOffsets.lunch),
      [remainingNutrients, suggestionOffsets.lunch]
    ),
    snacks: useMemo(
      () => getMealSuggestions('snacks', remainingNutrients, suggestionOffsets.snacks),
      [remainingNutrients, suggestionOffsets.snacks]
    ),
    dinner: useMemo(
      () => getMealSuggestions('dinner', remainingNutrients, suggestionOffsets.dinner),
      [remainingNutrients, suggestionOffsets.dinner]
    ),
  };

  const handleRefreshSuggestions = (category: Category) => {
    const categoryFoods = FOOD_BY_CATEGORY[category] || [];
    const maxOffset = Math.max(1, categoryFoods.length - 2);
    setSuggestionOffsets((prev) => ({ ...prev, [category]: (prev[category] + 3) % maxOffset }));
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
      await loadFoods();
    } catch (error) {
      console.error('Failed to add food suggestion:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    } finally {
      setAddingSuggestion(null);
    }
  };

  const recalculateNutrition = (quantityValue: string, baseData: BaseNutritionData | null) => {
    if (!baseData || manualEntry) return;
    const quantity = parseFloat(quantityValue) || 1;
    const multiplier = baseData.per100g ? quantity / 100 : quantity;
    setFormData((prev) => ({
      ...prev,
      calories: Math.round(baseData.calories * multiplier).toString(),
      protein: (Math.round(baseData.protein * multiplier * 10) / 10).toString(),
      carbs: (Math.round(baseData.carbs * multiplier * 10) / 10).toString(),
      fats: (Math.round(baseData.fats * multiplier * 10) / 10).toString(),
      fiber: (Math.round(baseData.fiber * multiplier * 10) / 10).toString(),
    }));
  };

  const handleSearchAPI = async () => {
    const foodName = formData.foodName.trim();
    if (!foodName || foodName.length < 2) {
      setNutritionError('Please enter a food name to search.');
      return;
    }
    setNutritionLoading(true);
    setNutritionError(null);
    try {
      const result = await getNutritionForAutoFill(foodName, true);
      if (result) {
        const { nutritionData, isPer100g } = result;
        setBaseNutritionData({
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs || 0,
          fats: nutritionData.fats || 0,
          fiber: nutritionData.fiber || 0,
          sugar: nutritionData.sugar || 0,
          per100g: isPer100g,
        });
        const defaultQuantity = isPer100g ? '100' : '1';
        setFormData((prev) => ({
          ...prev,
          calories: nutritionData.calories.toString(),
          protein: nutritionData.protein.toString(),
          carbs: nutritionData.carbs?.toString() || '',
          fats: nutritionData.fats?.toString() || '',
          fiber: nutritionData.fiber?.toString() || '',
          sugar: nutritionData.sugar?.toString() || '',
          quantity: defaultQuantity,
          foodName: nutritionData.foodName || prev.foodName,
        }));
      } else {
        setNutritionError('Food not found in API. Try a different name or use static data.');
      }
    } catch (error) {
      console.error('Error searching API:', error);
      setNutritionError('Unable to search API. Please try again.');
    } finally {
      setNutritionLoading(false);
    }
  };

  const handleSuggestionSelect = async (foodName: string) => {
    setFormData((prev) => ({ ...prev, foodName }));
    setSuggestionsDismissed(true);

    if (!manualEntry) {
      setNutritionLoading(true);
      setNutritionError(null);
      try {
        // Determine the unit (per-100g/ml vs per-unit) first, then fetch nutrition
        // at the matching quantity — otherwise a per100g food's returned values and
        // its displayed quantity (100) fall out of sync (e.g. milk would show "100"
        // but with calories computed as if quantity were 1).
        const baseData = getBaseNutritionData(foodName);
        const lookupQuantity = baseData?.per100g ? 100 : 1;
        const nutritionData = await getNutritionForFood(foodName, lookupQuantity);
        if (nutritionData) {
          if (baseData) {
            setBaseNutritionData(baseData);
          } else {
            setBaseNutritionData({
              calories: nutritionData.calories,
              protein: nutritionData.protein,
              carbs: nutritionData.carbs || 0,
              fats: nutritionData.fats || 0,
              fiber: nutritionData.fiber || 0,
              sugar: nutritionData.sugar || 0,
              per100g: false,
            });
          }
          const defaultQuantity = baseData?.per100g ? '100' : '1';
          setFormData((prev) => ({
            ...prev,
            foodName,
            calories: nutritionData.calories.toString(),
            protein: nutritionData.protein.toString(),
            carbs: (nutritionData.carbs || 0).toString(),
            fats: (nutritionData.fats || 0).toString(),
            fiber: (nutritionData.fiber || 0).toString(),
            sugar: (nutritionData.sugar || 0).toString(),
            quantity: defaultQuantity,
          }));
        }
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
        setNutritionError('Unable to fetch nutrition data. Please enter manually.');
      } finally {
        setNutritionLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (multiMode) {
      if (!formData.foodName.trim() || ingredients.length === 0) {
        Alert.alert('Missing fields', 'Meal name and at least one ingredient are required.');
        return;
      }
    } else if (!formData.foodName.trim() || !formData.calories || !formData.protein) {
      Alert.alert('Missing fields', 'Food name, calories, and protein are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = multiMode
        ? {
            ...formData,
            protein: ingredientTotals.protein,
            calories: ingredientTotals.calories,
            carbs: ingredientTotals.carbs,
            fats: ingredientTotals.fats,
            fiber: ingredientTotals.fiber,
            sugar: 0,
            quantity: Number(formData.quantity) || 1,
            ingredients,
          }
        : {
            ...formData,
            protein: Number(formData.protein),
            calories: Number(formData.calories),
            carbs: formData.carbs ? Number(formData.carbs) : 0,
            fats: formData.fats ? Number(formData.fats) : 0,
            fiber: formData.fiber ? Number(formData.fiber) : 0,
            sugar: 0,
            quantity: Number(formData.quantity),
            ingredients: undefined,
          };
      if (editingFood) {
        await foodAPI.update(editingFood._id, payload);
      } else {
        await foodAPI.create(payload as any);
      }
      setShowModal(false);
      setEditingFood(null);
      resetForm();
      await loadFoods();
    } catch (error) {
      console.error('Failed to save food:', error);
      Alert.alert('Error', 'Failed to save food entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (food: FoodEntry) => {
    setEditingFood(food);
    setFormData({
      foodName: food.foodName,
      protein: food.protein.toString(),
      calories: food.calories.toString(),
      carbs: (food.carbs || 0).toString(),
      fats: (food.fats || 0).toString(),
      fiber: (food.fiber || 0).toString(),
      sugar: (food.sugar || 0).toString(),
      quantity: food.quantity.toString(),
      date: formatDate(food.date),
      category: food.category || 'lunch',
      dayType: food.dayType || 'normal',
    });
    setNutritionLoading(false);
    setNutritionError(null);
    setManualEntry(true);
    setBaseNutritionData(null);
    setMultiMode(!!food.ingredients && food.ingredients.length > 0);
    setIngredients(food.ingredients || []);
    setIngredientDraft(emptyIngredientDraft());
    setIngredientBaseData(null);
    setIngredientLookupFailed(false);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete entry', 'Are you sure you want to delete this food entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await foodAPI.delete(id);
            await loadFoods();
          } catch (error) {
            console.error('Failed to delete food:', error);
            Alert.alert('Error', 'Failed to delete food entry');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleMigrate = () => {
    Alert.alert('Update entries', 'This will update carbs, fats, and fiber for all existing food entries. Proceed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Proceed',
        onPress: async () => {
          setMigrating(true);
          try {
            const response = await foodAPI.migrate();
            Alert.alert('Done', response.message || 'Migration complete');
            await loadFoods();
          } catch (error) {
            console.error('Failed to migrate nutrition data:', error);
            Alert.alert('Error', 'Failed to migrate nutrition data.');
          } finally {
            setMigrating(false);
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData(emptyFormData());
    setNutritionLoading(false);
    setNutritionError(null);
    setManualEntry(false);
    setBaseNutritionData(null);
    setMultiMode(false);
    setIngredients([]);
    setIngredientDraft(emptyIngredientDraft());
    setIngredientBaseData(null);
    setIngredientLookupFailed(false);
  };

  const openModal = () => {
    resetForm();
    setEditingFood(null);
    setShowModal(true);
  };

  const groupedFoods = useMemo(() => {
    const categories: Record<Category, FoodEntry[]> = { breakfast: [], lunch: [], snacks: [], dinner: [] };
    foods.forEach((food) => {
      const category = (food.category || 'lunch') as Category;
      (categories[category] || categories.lunch).push(food);
    });
    return categories;
  }, [foods]);

  const calculateCategoryTotals = (categoryFoods: FoodEntry[]) =>
    categoryFoods.reduce(
      (totals, food) => ({ calories: totals.calories + food.calories, protein: totals.protein + food.protein }),
      { calories: 0, protein: 0 }
    );

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
        <View className="mb-1 flex-row items-center gap-3">
          <Text className="text-2xl font-bold text-gray-900">Food Entries</Text>
          <Pressable onPress={handleRefresh} disabled={refreshing} className="rounded-lg p-2">
            <Ionicons name="refresh" size={20} color="#4b5563" />
          </Pressable>
        </View>
        <Text className="mb-4 text-sm text-gray-600">Manage your daily food intake</Text>

        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="mb-3 flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3"
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

        <View className="mb-6 flex-row gap-3">
          <Pressable
            onPress={handleMigrate}
            disabled={migrating}
            className="flex-1 items-center rounded-xl bg-green-600 py-3 disabled:opacity-50"
          >
            <Text className="text-sm font-medium text-white">{migrating ? 'Migrating...' : 'Update Entries'}</Text>
          </Pressable>
          <Pressable onPress={openModal} className="flex-1 items-center rounded-xl bg-blue-600 py-3">
            <Text className="text-sm font-medium text-white">+ Add Food Entry</Text>
          </Pressable>
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

        {foods.length === 0 ? (
          <View className="items-center rounded-xl bg-white px-6 py-8 shadow-sm">
            <Text className="text-center text-gray-500">No food entries for this date. Add one to get started!</Text>
          </View>
        ) : (
          <View className="gap-4">
            {(Object.keys(CATEGORY_CONFIG) as Category[]).map((categoryKey) => {
              const config = CATEGORY_CONFIG[categoryKey];
              const categoryFoods = groupedFoods[categoryKey];
              const totals = calculateCategoryTotals(categoryFoods);

              return (
                <View key={categoryKey} className={`overflow-hidden rounded-xl border-l-4 bg-white shadow-sm ${config.border}`}>
                  <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
                    <Text className="text-lg font-semibold text-gray-900">
                      {config.emoji} {config.label}
                    </Text>
                    {categoryFoods.length > 0 && (
                      <Text className="text-xs text-gray-600">
                        {totals.calories} cal, {totals.protein.toFixed(1)}g protein
                      </Text>
                    )}
                  </View>
                  {categoryFoods.length === 0 ? (
                    <Text className="px-4 py-4 text-sm italic text-gray-500">
                      No {config.label.toLowerCase()} entries
                    </Text>
                  ) : (
                    <View className="divide-y divide-gray-200">
                      {categoryFoods.map((food) => (
                        <View key={food._id} className="gap-3 px-4 py-4">
                          <Text className="text-base font-medium text-gray-900">{food.foodName}</Text>
                          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                            <Text className="text-xs text-gray-500">Cal: {food.calories}</Text>
                            <Text className="text-xs text-gray-500">Prot: {food.protein}g</Text>
                            {!!food.carbs && <Text className="text-xs text-gray-500">Carbs: {food.carbs}g</Text>}
                            {!!food.fats && <Text className="text-xs text-gray-500">Fats: {food.fats}g</Text>}
                            {!!food.fiber && <Text className="text-xs text-gray-500">Fiber: {food.fiber}g</Text>}
                            <Text className="text-xs text-gray-500">Qty: {food.quantity}</Text>
                            {!!food.dayType && (
                              <View
                                className={`rounded px-2 py-0.5 ${food.dayType === 'fasting' ? 'bg-purple-100' : 'bg-gray-100'}`}
                              >
                                <Text
                                  className={`text-xs capitalize ${food.dayType === 'fasting' ? 'text-purple-700' : 'text-gray-700'}`}
                                >
                                  {food.dayType}
                                </Text>
                              </View>
                            )}
                          </View>
                          {!!food.ingredients && food.ingredients.length > 0 && (
                            <View className="gap-1 rounded-lg bg-gray-50 px-3 py-2">
                              {food.ingredients.map((ing, i) => (
                                <Text key={i} className="text-xs text-gray-600">
                                  • {ing.name} ({ing.quantity}) — {ing.calories} cal, {ing.protein}g protein
                                </Text>
                              ))}
                            </View>
                          )}
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() => handleEdit(food)}
                              className="flex-1 items-center rounded-lg bg-blue-50 py-2"
                            >
                              <Text className="text-sm font-medium text-blue-600">Edit</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(food._id)}
                              disabled={deletingId === food._id}
                              className="flex-1 items-center rounded-lg bg-red-50 py-2 disabled:opacity-50"
                            >
                              <Text className="text-sm font-medium text-red-600">
                                {deletingId === food._id ? 'Deleting...' : 'Delete'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[90%] rounded-t-2xl bg-white">
            <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
              <Text className="text-xl font-semibold text-gray-900">
                {editingFood ? 'Edit Food Entry' : 'Add Food Entry'}
              </Text>
              <Pressable
                onPress={() => {
                  setShowModal(false);
                  setEditingFood(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>

            <ScrollView className="px-5 py-4" keyboardShouldPersistTaps="handled">
              <View className="mb-4 flex-row gap-1 rounded-xl bg-gray-100 p-1">
                <Pressable
                  onPress={() => setMultiMode(false)}
                  className={`flex-1 items-center rounded-lg py-2 ${!multiMode ? 'bg-white' : ''}`}
                  style={!multiMode ? styles.segmentShadow : undefined}
                >
                  <Text className={`text-sm font-medium ${!multiMode ? 'text-gray-900' : 'text-gray-500'}`}>
                    Single Item
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMultiMode(true)}
                  className={`flex-1 items-center rounded-lg py-2 ${multiMode ? 'bg-white' : ''}`}
                  style={multiMode ? styles.segmentShadow : undefined}
                >
                  <Text className={`text-sm font-medium ${multiMode ? 'text-gray-900' : 'text-gray-500'}`}>
                    Multiple Ingredients
                  </Text>
                </Pressable>
              </View>

              <View className="mb-4">
                <Text className="mb-1 text-sm font-medium text-gray-700">
                  {multiMode ? 'Meal Name' : 'Food Name'}
                </Text>
                {multiMode && (
                  <TextInput
                    placeholder='e.g., "Oats meal" or "Sabji with roti"'
                    value={formData.foodName}
                    onChangeText={(text) => setFormData({ ...formData, foodName: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                )}
              </View>

              {multiMode && (
                <View className="mb-4 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {ingredients.length > 0 && (
                    <View className="gap-2">
                      {ingredients.map((ing, index) => (
                        <View
                          key={index}
                          className="flex-row items-center justify-between rounded-lg bg-white px-3 py-2"
                        >
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-900">
                              {ing.name} ({ing.quantity})
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {ing.calories} cal, {ing.protein}g protein
                            </Text>
                          </View>
                          <Pressable onPress={() => handleRemoveIngredient(index)} className="px-2 py-1">
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </Pressable>
                        </View>
                      ))}
                      <View className="flex-row justify-between border-t border-gray-200 pt-2">
                        <Text className="text-sm font-semibold text-gray-700">Total</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {ingredientTotals.calories} cal, {ingredientTotals.protein.toFixed(1)}g protein
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text className="text-xs font-medium text-gray-700">Add ingredient</Text>
                  <TextInput
                    placeholder="Ingredient name, e.g. almonds"
                    value={ingredientDraft.name}
                    onChangeText={(text) => {
                      setIngredientDraft((prev) => ({ ...prev, name: text, calories: '', protein: '', carbs: '', fats: '', fiber: '' }));
                      setIngredientBaseData(null);
                      setIngredientLookupFailed(false);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
                  />

                  {!!ingredientDraft.name.trim() && (
                    <View>
                      <Text className="mb-1 text-xs font-medium text-gray-700">Quantity (count, grams, or ml)</Text>
                      <TextInput
                        placeholder="e.g., 5 (count), 50 (grams), or 150 (ml)"
                        keyboardType="decimal-pad"
                        value={ingredientDraft.quantity}
                        onChangeText={handleIngredientQuantityChange}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
                      />
                    </View>
                  )}

                  {ingredientLookupLoading && (
                    <Text className="text-xs text-blue-600">⏳ Looking up nutrition...</Text>
                  )}
                  {!ingredientLookupLoading && !ingredientLookupFailed && ingredientDraft.calories && (
                    <Text className="text-xs text-green-600">✓ Nutrition auto-filled: {ingredientDraft.calories} cal, {ingredientDraft.protein}g protein</Text>
                  )}

                  {!ingredientLookupLoading && ingredientLookupFailed && (
                    <View className="gap-2">
                      <Text className="text-xs text-amber-600">
                        Couldn&apos;t find nutrition data for this ingredient — enter it manually below.
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        <TextInput
                          placeholder="Calories"
                          keyboardType="decimal-pad"
                          value={ingredientDraft.calories}
                          onChangeText={(text) => setIngredientDraft((prev) => ({ ...prev, calories: text }))}
                          className="min-w-[30%] flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
                        />
                        <TextInput
                          placeholder="Protein (g)"
                          keyboardType="decimal-pad"
                          value={ingredientDraft.protein}
                          onChangeText={(text) => setIngredientDraft((prev) => ({ ...prev, protein: text }))}
                          className="min-w-[30%] flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
                        />
                        <TextInput
                          placeholder="Carbs (g)"
                          keyboardType="decimal-pad"
                          value={ingredientDraft.carbs}
                          onChangeText={(text) => setIngredientDraft((prev) => ({ ...prev, carbs: text }))}
                          className="min-w-[30%] flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
                        />
                        <TextInput
                          placeholder="Fats (g)"
                          keyboardType="decimal-pad"
                          value={ingredientDraft.fats}
                          onChangeText={(text) => setIngredientDraft((prev) => ({ ...prev, fats: text }))}
                          className="min-w-[30%] flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
                        />
                        <TextInput
                          placeholder="Fiber (g)"
                          keyboardType="decimal-pad"
                          value={ingredientDraft.fiber}
                          onChangeText={(text) => setIngredientDraft((prev) => ({ ...prev, fiber: text }))}
                          className="min-w-[30%] flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
                        />
                      </View>
                    </View>
                  )}

                  <Pressable
                    onPress={handleAddIngredient}
                    disabled={ingredientLookupLoading}
                    className="items-center rounded-xl bg-blue-100 py-2.5 disabled:opacity-50"
                  >
                    <Text className="text-sm font-medium text-blue-700">+ Add ingredient</Text>
                  </Pressable>
                </View>
              )}

              {!multiMode && (
              <>
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-gray-700">Food Name</Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      setManualEntry(!manualEntry);
                      setNutritionError(null);
                      if (!manualEntry) {
                        setFormData((prev) => ({ ...prev, calories: '', protein: '' }));
                      }
                    }}
                    className={`rounded-lg px-3 py-1.5 ${manualEntry ? 'bg-blue-100' : 'bg-gray-100'}`}
                  >
                    <Text className={`text-xs font-medium ${manualEntry ? 'text-blue-700' : 'text-gray-600'}`}>
                      {manualEntry ? '✓ Manual Entry' : 'Auto-fill'}
                    </Text>
                  </Pressable>
                  {!manualEntry && (
                    <Pressable
                      onPress={handleSearchAPI}
                      disabled={nutritionLoading || !formData.foodName.trim()}
                      className="rounded-lg bg-green-100 px-3 py-1.5 disabled:opacity-50"
                    >
                      <Text className="text-xs font-medium text-green-700">
                        {nutritionLoading ? 'Searching...' : 'Search API'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <TextInput
                placeholder={manualEntry ? 'Enter food name' : 'Type food name or select from suggestions'}
                value={formData.foodName}
                onChangeText={(text) => {
                  setFormData({ ...formData, foodName: text });
                  setSuggestionsDismissed(false);
                }}
                className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
              />

              {showSuggestions && foodSuggestions.length > 0 && !manualEntry && (
                <View className="mt-1 max-h-48 rounded-xl border border-gray-300 bg-white">
                  <FlatList
                    data={foodSuggestions}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => handleSuggestionSelect(item)} className="px-4 py-2.5">
                        <Text className="text-sm text-gray-900">{item}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              )}

              {!!nutritionError && !manualEntry && (
                <Text className="mt-1 text-xs text-amber-600">{nutritionError}</Text>
              )}
              {!nutritionLoading && !nutritionError && !manualEntry && formData.foodName && formData.calories && (
                <Text className="mt-1 text-xs text-green-600">✓ Nutrition data auto-filled</Text>
              )}
              {manualEntry && (
                <Text className="mt-1 text-xs text-gray-500">Manual entry mode - enter nutrition values manually</Text>
              )}

              <View className="mt-4 flex-row flex-wrap gap-3">
                <View className="flex-1 basis-[45%]">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Calories</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={formData.calories}
                    onChangeText={(text) => setFormData({ ...formData, calories: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View className="flex-1 basis-[45%]">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Protein (g)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={formData.protein}
                    onChangeText={(text) => setFormData({ ...formData, protein: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View className="flex-1 basis-[45%]">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Carbs (g)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={formData.carbs}
                    onChangeText={(text) => setFormData({ ...formData, carbs: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View className="flex-1 basis-[45%]">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Fats (g)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={formData.fats}
                    onChangeText={(text) => setFormData({ ...formData, fats: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View className="flex-1 basis-[45%]">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Fiber (g)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={formData.fiber}
                    onChangeText={(text) => setFormData({ ...formData, fiber: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
              </View>

              <View className="mt-4">
                <Text className="mb-1 text-sm font-medium text-gray-700">Quantity or Grams</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={formData.quantity}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, quantity: text }));
                    if (baseNutritionData && !manualEntry) {
                      recalculateNutrition(text, baseNutritionData);
                    }
                  }}
                  placeholder="e.g., 2 (quantity) or 200 (grams)"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
                <Text className="mt-1 text-xs text-gray-500">
                  {baseNutritionData
                    ? baseNutritionData.per100g
                      ? `Enter grams (e.g., 200 for 200g ${formData.foodName}). Nutrition auto-calculates.`
                      : `Enter quantity (e.g., 2 for 2 ${formData.foodName}). Nutrition auto-calculates.`
                    : 'Enter quantity or grams. Nutrition auto-calculates when a food is selected.'}
                </Text>
              </View>
              </>
              )}

              <View className="mt-4">
                <Text className="mb-1 text-sm font-medium text-gray-700">Date</Text>
                <Pressable
                  onPress={() => setShowFormDatePicker(true)}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                >
                  <Text className="text-base text-gray-900">{formData.date}</Text>
                </Pressable>
                {showFormDatePicker && (
                  <DateTimePicker
                    value={new Date(formData.date)}
                    mode="date"
                    onChange={(event, date) => {
                      setShowFormDatePicker(Platform.OS === 'ios');
                      if (event.type === 'set' && date) {
                        setFormData((prev) => ({ ...prev, date: date.toISOString().split('T')[0] }));
                      } else {
                        setShowFormDatePicker(false);
                      }
                    }}
                  />
                )}
              </View>

              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Category</Text>
                  <View className="rounded-xl border border-gray-300">
                    <Picker
                      selectedValue={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as Category })}
                    >
                      <Picker.Item label="Breakfast" value="breakfast" />
                      <Picker.Item label="Lunch" value="lunch" />
                      <Picker.Item label="Snacks" value="snacks" />
                      <Picker.Item label="Dinner" value="dinner" />
                    </Picker>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-sm font-medium text-gray-700">Day Type</Text>
                  <View className="rounded-xl border border-gray-300">
                    <Picker
                      selectedValue={formData.dayType}
                      onValueChange={(value) => setFormData({ ...formData, dayType: value as DayType })}
                    >
                      <Picker.Item label="Normal" value="normal" />
                      <Picker.Item label="Fasting" value="fasting" />
                    </Picker>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 border-t border-gray-200 px-5 py-4">
              <Pressable
                onPress={() => {
                  setShowModal(false);
                  setEditingFood(null);
                  resetForm();
                }}
                className="flex-1 items-center rounded-xl border border-gray-300 py-3"
              >
                <Text className="font-medium text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                className="flex-1 items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50"
              >
                <Text className="font-medium text-white">
                  {submitting ? (editingFood ? 'Updating...' : 'Adding...') : editingFood ? 'Update' : 'Add'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  segmentShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
