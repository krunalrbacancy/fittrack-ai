import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { foodAPI } from '../utils/api';
import { FoodEntry } from '../types';
import { Layout } from '../components/Layout';
import { getTodayDate, formatDate } from '../utils/calculations';
import { getFoodSuggestions as getNutritionSuggestions, getNutritionForFood, getBaseNutritionData, getNutritionForAutoFill, getNutritionFromStaticOnly } from '../utils/nutrition';
import { getFoodSuggestions as getMealSuggestions, FOOD_BY_CATEGORY } from '../utils/foodSuggestions';
import { useAuth } from '../context/AuthContext';

export const Foods: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0 });
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [suggestionOffsets, setSuggestionOffsets] = useState({
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  });
  const nutritionTimeoutRef = useRef<number | null>(null);
  const [foodSuggestions, setFoodSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [baseNutritionData, setBaseNutritionData] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    per100g: boolean;
  } | null>(null);
  const [formData, setFormData] = useState({
    foodName: '',
    protein: '',
    calories: '',
    carbs: '',
    fats: '',
    fiber: '',
    quantity: '1',
    date: getTodayDate(),
    category: 'lunch' as 'breakfast' | 'lunch' | 'snacks' | 'dinner',
    dayType: 'normal' as 'normal' | 'fasting',
  });

  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await foodAPI.getAll(selectedDate);
      setFoods(data);

      // Load stats for suggestions
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
    // Only load data when auth is ready
    if (!authLoading) {
      loadFoods();
    }
  }, [loadFoods, authLoading]);

  // Refresh data when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFoods();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadFoods]);

  // Update suggestions when food name changes
  useEffect(() => {
    if (!showModal || manualEntry) {
      setFoodSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = formData.foodName.trim();
    if (query.length > 0) {
      const suggestions = getNutritionSuggestions(query);
      setFoodSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setFoodSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.foodName, showModal, manualEntry]);

  // Auto-fill nutrition data when food name changes (debounced)
  useEffect(() => {
    // Only lookup if not editing, not in manual mode, and food name is not empty
    if (editingFood || manualEntry || !formData.foodName.trim() || !showModal) {
      return;
    }

    // Clear previous timeout
    if (nutritionTimeoutRef.current) {
      clearTimeout(nutritionTimeoutRef.current);
    }

    // Debounce the lookup by 800ms
    nutritionTimeoutRef.current = window.setTimeout(async () => {
      const foodName = formData.foodName.trim();
      if (foodName.length < 2) {
        return; // Don't search for very short inputs
      }

      setNutritionLoading(true);
      setNutritionError(null);

      try {
        // Use static database only (no API call)
        const result = getNutritionFromStaticOnly(foodName);

        if (result) {
          const { nutritionData, isPer100g } = result;
          
          // Set base nutrition data (per 100g values)
          setBaseNutritionData({
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.carbs || 0,
            fats: nutritionData.fats || 0,
            fiber: nutritionData.fiber || 0,
            per100g: isPer100g,
          });

          // Set default quantity: 100g for per100g foods, 1 for per-unit foods
          const defaultQuantity = isPer100g ? '100' : '1';

          // Auto-fill the form with nutrition data (already per 100g or per unit)
          setFormData(prev => ({
            ...prev,
            calories: nutritionData.calories.toString(),
            protein: nutritionData.protein.toString(),
            carbs: nutritionData.carbs?.toString() || '',
            fats: nutritionData.fats?.toString() || '',
            fiber: nutritionData.fiber?.toString() || '',
            quantity: defaultQuantity,
            foodName: nutritionData.foodName || prev.foodName,
          }));
        } else {
          // Don't show error for static lookup - user can click "Search API" if needed
          setNutritionError(null);
        }
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
        setNutritionError(null);
      } finally {
        setNutritionLoading(false);
      }
    }, 800);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (nutritionTimeoutRef.current) {
        clearTimeout(nutritionTimeoutRef.current);
      }
    };
  }, [formData.foodName, editingFood, showModal, manualEntry]);

  // Calculate remaining nutrients for suggestions
  const dayType = foods.length > 0 && foods.some(f => f.dayType === 'fasting') ? 'fasting' : 'normal';
  const calorieTarget = dayType === 'fasting' ? (user?.fastingCalorieTarget || 1600) : (user?.dailyCalorieTarget || 2000);
  const proteinTarget = dayType === 'fasting' ? (user?.fastingProteinTarget || 70) : (user?.dailyProteinTarget || 90);
  const carbsTarget = dayType === 'fasting' ? (user?.fastingCarbsTarget || 170) : (user?.dailyCarbsTarget || 240);
  const fatsTarget = dayType === 'fasting' ? (user?.fastingFatsTarget || 55) : (user?.dailyFatsTarget || 60);
  const fiberTarget = dayType === 'fasting' ? (user?.fastingFiberTarget || 22) : (user?.dailyFiberTarget || 28);

  const remainingNutrients = useMemo(() => ({
    calories: Math.max(0, calorieTarget - stats.totalCalories),
    protein: Math.max(0, proteinTarget - stats.totalProtein),
    carbs: Math.max(0, carbsTarget - (stats.totalCarbs || 0)),
    fats: Math.max(0, fatsTarget - (stats.totalFats || 0)),
    fiber: Math.max(0, fiberTarget - (stats.totalFiber || 0)),
  }), [calorieTarget, proteinTarget, carbsTarget, fatsTarget, fiberTarget, stats]);

  const breakfastSuggestions = useMemo(() => getMealSuggestions('breakfast', remainingNutrients, suggestionOffsets.breakfast), [remainingNutrients, suggestionOffsets.breakfast]);
  const lunchSuggestions = useMemo(() => getMealSuggestions('lunch', remainingNutrients, suggestionOffsets.lunch), [remainingNutrients, suggestionOffsets.lunch]);
  const snacksSuggestions = useMemo(() => getMealSuggestions('snacks', remainingNutrients, suggestionOffsets.snacks), [remainingNutrients, suggestionOffsets.snacks]);
  const dinnerSuggestions = useMemo(() => getMealSuggestions('dinner', remainingNutrients, suggestionOffsets.dinner), [remainingNutrients, suggestionOffsets.dinner]);

  // Handle refresh suggestions
  const handleRefreshSuggestions = (category: 'breakfast' | 'lunch' | 'snacks' | 'dinner') => {
    const categoryFoods = FOOD_BY_CATEGORY[category] || [];
    const maxOffset = Math.max(1, categoryFoods.length - 2); // Ensure we can cycle through
    
    setSuggestionOffsets(prev => ({
      ...prev,
      [category]: (prev[category] + 3) % maxOffset,
    }));
  };

  // Handle adding a food suggestion
  const handleAddSuggestion = async (suggestion: any, category: string) => {
    if (addingSuggestion) return;
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

      // Reload foods and stats
      await loadFoods();
    } catch (error) {
      console.error('Failed to add food suggestion:', error);
      alert('Failed to add food. Please try again.');
    } finally {
      setAddingSuggestion(null);
    }
  };

  // Recalculate nutrition based on quantity
  const recalculateNutrition = (quantityValue: string, baseData: typeof baseNutritionData) => {
    if (!baseData || manualEntry) return;

    const quantity = parseFloat(quantityValue) || 1;
    let multiplier = quantity;

    // If food is per100g, treat input as grams (divide by 100 to get multiplier)
    // If food is per unit, treat input as quantity (use directly as multiplier)
    if (baseData.per100g) {
      // For weight-based foods, input is in grams
      multiplier = quantity / 100;
    } else {
      // For unit-based foods, input is quantity
      multiplier = quantity;
    }

    setFormData(prev => ({
      ...prev,
      calories: Math.round(baseData.calories * multiplier).toString(),
      protein: (Math.round(baseData.protein * multiplier * 10) / 10).toString(),
      carbs: (Math.round(baseData.carbs * multiplier * 10) / 10).toString(),
      fats: (Math.round(baseData.fats * multiplier * 10) / 10).toString(),
      fiber: (Math.round(baseData.fiber * multiplier * 10) / 10).toString(),
    }));
  };

  // Handle API search button click
  const handleSearchAPI = async () => {
    const foodName = formData.foodName.trim();
    if (!foodName || foodName.length < 2) {
      setNutritionError('Please enter a food name to search.');
      return;
    }

    setNutritionLoading(true);
    setNutritionError(null);

    try {
      // Search API with useAPI flag set to true
      const result = await getNutritionForAutoFill(foodName, true);

      if (result) {
        const { nutritionData, isPer100g } = result;
        
        // Set base nutrition data
        setBaseNutritionData({
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs || 0,
          fats: nutritionData.fats || 0,
          fiber: nutritionData.fiber || 0,
          per100g: isPer100g,
        });

        // Set default quantity: 100g for per100g foods, 1 for per-unit foods
        const defaultQuantity = isPer100g ? '100' : '1';

        // Auto-fill the form with nutrition data
        setFormData(prev => ({
          ...prev,
          calories: nutritionData.calories.toString(),
          protein: nutritionData.protein.toString(),
          carbs: nutritionData.carbs?.toString() || '',
          fats: nutritionData.fats?.toString() || '',
          fiber: nutritionData.fiber?.toString() || '',
          quantity: defaultQuantity,
          // Update food name if API returned a better formatted name
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

  // Handle food suggestion selection
  const handleSuggestionSelect = async (foodName: string) => {
    setFormData(prev => ({ ...prev, foodName }));
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Auto-fill nutrition data for selected food
    if (!manualEntry) {
      setNutritionLoading(true);
      setNutritionError(null);

      try {
        // Get nutrition data for the selected food (default quantity 1)
        const nutritionData = await getNutritionForFood(foodName, 1);

        if (nutritionData) {
          // Get base nutrition data to determine if it's per100g
          const baseData = getBaseNutritionData(foodName);

          if (baseData) {
            // Store base nutrition data
            setBaseNutritionData(baseData);
          } else {
            // If not in local DB, assume per unit (not per100g)
            setBaseNutritionData({
              calories: nutritionData.calories,
              protein: nutritionData.protein,
              carbs: nutritionData.carbs || 0,
              fats: nutritionData.fats || 0,
              fiber: nutritionData.fiber || 0,
              per100g: false,
            });
          }

          // Set default quantity based on food type
          const defaultQuantity = baseData?.per100g ? '100' : '1';

          setFormData(prev => ({
            ...prev,
            foodName,
            calories: nutritionData.calories.toString(),
            protein: nutritionData.protein.toString(),
            carbs: (nutritionData.carbs || 0).toString(),
            fats: (nutritionData.fats || 0).toString(),
            fiber: (nutritionData.fiber || 0).toString(),
            quantity: defaultQuantity, // Default to 100g for weight-based, 1 for unit-based
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

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || foodSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < foodSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(foodSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);
    try {
      if (editingFood) {
        await foodAPI.update(editingFood._id, {
          ...formData,
          protein: Number(formData.protein),
          calories: Number(formData.calories),
          carbs: formData.carbs ? Number(formData.carbs) : 0,
          fats: formData.fats ? Number(formData.fats) : 0,
          fiber: formData.fiber ? Number(formData.fiber) : 0,
          quantity: Number(formData.quantity),
          category: formData.category,
          dayType: formData.dayType,
        });
      } else {
        await foodAPI.create({
          ...formData,
          protein: Number(formData.protein),
          calories: Number(formData.calories),
          carbs: formData.carbs ? Number(formData.carbs) : 0,
          fats: formData.fats ? Number(formData.fats) : 0,
          fiber: formData.fiber ? Number(formData.fiber) : 0,
          quantity: Number(formData.quantity),
          category: formData.category,
          dayType: formData.dayType,
        } as any);
      }
      setShowModal(false);
      setEditingFood(null);
      resetForm();
      loadFoods();
    } catch (error) {
      console.error('Failed to save food:', error);
      alert('Failed to save food entry');
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
      quantity: food.quantity.toString(),
      date: formatDate(food.date),
      category: food.category || 'lunch',
      dayType: food.dayType || 'normal',
    });
    setNutritionLoading(false);
    setNutritionError(null);
    setManualEntry(true); // Enable manual mode when editing
    setBaseNutritionData(null); // Clear base data when editing
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this food entry?')) return;
    if (deletingId) return; // Prevent multiple deletions
    setDeletingId(id);
    try {
      await foodAPI.delete(id);
      loadFoods();
    } catch (error) {
      console.error('Failed to delete food:', error);
      alert('Failed to delete food entry');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('This will update carbs, fats, and fiber for all existing food entries. Proceed?')) return;
    if (migrating) return; // Prevent multiple migrations
    setMigrating(true);
    try {
      const response = await foodAPI.migrate();
      alert(response.message || 'Migration complete');
      loadFoods(); // Reload foods to show updated data
    } catch (error) {
      console.error('Failed to migrate nutrition data:', error);
      alert('Failed to migrate nutrition data. Check console for details.');
    } finally {
      setMigrating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      foodName: '',
      protein: '',
      calories: '',
      carbs: '',
      fats: '',
      fiber: '',
      quantity: '1',
      date: getTodayDate(),
      category: 'lunch',
      dayType: 'normal',
    });
    setNutritionLoading(false);
    setNutritionError(null);
    setManualEntry(false);
    setBaseNutritionData(null);
  };

  const openModal = () => {
    resetForm();
    setEditingFood(null);
    setShowModal(true);
  };

  // Group foods by category
  const groupFoodsByCategory = () => {
    const categories: { [key: string]: FoodEntry[] } = {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: [],
    };

    foods.forEach((food) => {
      const category = food.category || 'lunch';
      if (categories[category]) {
        categories[category].push(food);
      } else {
        categories.lunch.push(food); // Default to lunch if category is invalid
      }
    });

    return categories;
  };

  // Calculate totals for a category
  const calculateCategoryTotals = (categoryFoods: FoodEntry[]) => {
    return categoryFoods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.calories,
        protein: totals.protein + food.protein,
      }),
      { calories: 0, protein: 0 }
    );
  };

  // Category display configuration
  const categoryConfig = {
    breakfast: { label: 'Breakfast', emoji: '🌅', color: 'bg-yellow-50 border-yellow-200' },
    lunch: { label: 'Lunch', emoji: '☀️', color: 'bg-orange-50 border-orange-200' },
    snacks: { label: 'Snacks', emoji: '🍪', color: 'bg-purple-50 border-purple-200' },
    dinner: { label: 'Dinner', emoji: '🌙', color: 'bg-blue-50 border-blue-200' },
  };

  const groupedFoods = groupFoodsByCategory();

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Food Entries</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your daily food intake</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrating ? 'Migrating...' : 'Update Existing Entries'}
            </button>
            <button
              onClick={openModal}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-xl text-base font-medium transition-colors touch-manipulation"
            >
              + Add Food Entry
            </button>
          </div>
        </div>

        {/* Meal Suggestions */}
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

        {foods.length === 0 ? (
          <div className="bg-white shadow-md overflow-hidden rounded-xl">
            <div className="px-6 py-8 text-center text-gray-500">
              No food entries for this date. Add one to get started!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {Object.entries(categoryConfig).map(([categoryKey, config]) => {
              const categoryFoods = groupedFoods[categoryKey as keyof typeof groupedFoods];
              const totals = calculateCategoryTotals(categoryFoods);

              return (
                <div
                  key={categoryKey}
                  className={`bg-white shadow-md overflow-hidden rounded-xl border-l-4 ${config.color}`}
                >
                  <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <span>{config.emoji}</span>
                        <span>{config.label}</span>
                      </h2>
                      {categoryFoods.length > 0 && (
                        <div className="text-xs md:text-sm text-gray-600">
                          <span className="font-medium">{totals.calories}</span> cal,{' '}
                          <span className="font-medium">{totals.protein.toFixed(1)}g</span> protein
                        </div>
                      )}
                    </div>
                  </div>
                  {categoryFoods.length === 0 ? (
                    <div className="px-4 md:px-6 py-4 text-sm text-gray-500 italic">
                      No {config.label.toLowerCase()} entries
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {categoryFoods.map((food) => (
                        <li key={food._id} className="px-4 md:px-6 py-4 active:bg-gray-50">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">{food.foodName}</h3>
                              <div className="mt-2 flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                                <span>Cal: {food.calories}</span>
                                <span>Prot: {food.protein}g</span>
                                {food.carbs !== undefined && food.carbs > 0 && <span>Carbs: {food.carbs}g</span>}
                                {food.fats !== undefined && food.fats > 0 && <span>Fats: {food.fats}g</span>}
                                {food.fiber !== undefined && food.fiber > 0 && <span>Fiber: {food.fiber}g</span>}
                                <span>Qty: {food.quantity}</span>
                                {food.dayType && (
                                  <span className={`capitalize px-2 py-0.5 rounded text-xs ${
                                    food.dayType === 'fasting'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {food.dayType}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-3 sm:gap-2">
                              <button
                                onClick={() => handleEdit(food)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(food._id)}
                                disabled={deletingId === food._id}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 rounded-lg text-sm font-medium transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deletingId === food._id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end sm:items-center justify-center min-h-screen px-4 pt-4 pb-20 sm:pb-4 sm:pt-4">
              <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setShowModal(false)}></div>
              <div className="relative z-10 w-full sm:w-auto sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all max-h-[85vh] sm:max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh] md:max-h-[90vh]">
                  <div className="bg-white px-4 pt-6 pb-4 sm:p-6 sm:pb-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {editingFood ? 'Edit Food Entry' : 'Add Food Entry'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingFood(null);
                          resetForm();
                        }}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                      >
                        ×
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Food Name
                            {nutritionLoading && !manualEntry && (
                              <span className="ml-2 text-xs text-blue-600 flex items-center gap-1">
                                <span className="animate-spin">⏳</span> Looking up nutrition...
                              </span>
                            )}
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setManualEntry(!manualEntry);
                                setNutritionError(null);
                                if (!manualEntry) {
                                  // Clear auto-filled data when switching to manual
                                  setFormData(prev => ({
                                    ...prev,
                                    calories: '',
                                    protein: '',
                                  }));
                                }
                              }}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                manualEntry
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {manualEntry ? '✓ Manual Entry' : 'Auto-fill'}
                            </button>
                            {!manualEntry && (
                              <button
                                type="button"
                                onClick={handleSearchAPI}
                                disabled={nutritionLoading || !formData.foodName.trim()}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {nutritionLoading ? 'Searching...' : 'Search API'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative" ref={suggestionRef}>
                          <input
                            type="text"
                            required
                            placeholder={manualEntry ? "Enter food name" : "Type food name or select from suggestions"}
                            value={formData.foodName}
                            onChange={(e) => {
                              setFormData({ ...formData, foodName: e.target.value });
                              setSelectedSuggestionIndex(-1);
                            }}
                            onFocus={() => {
                              if (foodSuggestions.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            onKeyDown={handleKeyDown}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {showSuggestions && foodSuggestions.length > 0 && !manualEntry && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {foodSuggestions.map((suggestion, index) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => handleSuggestionSelect(suggestion)}
                                  className={`w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                                    index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <span className="text-sm text-gray-900">{suggestion}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {nutritionError && !manualEntry && (
                          <p className="mt-1 text-xs text-amber-600">{nutritionError}</p>
                        )}
                        {!nutritionLoading && !nutritionError && !manualEntry && formData.foodName && formData.calories && (
                          <p className="mt-1 text-xs text-green-600">✓ Nutrition data auto-filled</p>
                        )}
                        {manualEntry && (
                          <p className="mt-1 text-xs text-gray-500">Manual entry mode - enter nutrition values manually</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Calories</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.1"
                            value={formData.calories}
                            onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Protein (g)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.1"
                            value={formData.protein}
                            onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Carbs (g)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.carbs}
                            onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Fats (g)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.fats}
                            onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Fiber (g)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.fiber}
                            onChange={(e) => setFormData({ ...formData, fiber: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Quantity or Grams</label>
                          <input
                            type="number"
                            required
                            min="0.1"
                            step="0.1"
                            value={formData.quantity}
                            onChange={(e) => {
                              const newQuantity = e.target.value;
                              setFormData(prev => ({ ...prev, quantity: newQuantity }));
                              // Recalculate nutrition if base data exists
                              if (baseNutritionData && !manualEntry) {
                                recalculateNutrition(newQuantity, baseNutritionData);
                              }
                            }}
                            placeholder="e.g., 2 (for quantity) or 200 (for grams)"
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            {baseNutritionData
                              ? (baseNutritionData.per100g
                                  ? `Enter grams (e.g., 200 for 200g ${formData.foodName}). Nutrition auto-calculates.`
                                  : `Enter quantity (e.g., 2 for 2 ${formData.foodName}). Nutrition auto-calculates.`)
                              : 'Enter quantity (e.g., 2 eggs) or grams (e.g., 200g chicken). Nutrition will auto-calculate when food is selected.'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date</label>
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="snacks">Snacks</option>
                            <option value="dinner">Dinner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Day Type</label>
                          <select
                            value={formData.dayType}
                            onChange={(e) => setFormData({ ...formData, dayType: e.target.value as any })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="normal">Normal</option>
                            <option value="fasting">Fasting</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-4 sm:px-6 flex flex-col-reverse sm:flex-row-reverse gap-3 flex-shrink-0 border-t">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-transparent shadow-sm px-6 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          {editingFood ? 'Updating...' : 'Adding...'}
                        </>
                      ) : (
                        editingFood ? 'Update' : 'Add'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingFood(null);
                        resetForm();
                      }}
                      className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
    </Layout>
  );
};

