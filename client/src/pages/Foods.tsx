import React, { useEffect, useState } from 'react';
import { foodAPI } from '../utils/api';
import { FoodEntry } from '../types';
import { Layout } from '../components/Layout';
import { getTodayDate, formatDate } from '../utils/calculations';

export const Foods: React.FC = () => {
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [formData, setFormData] = useState({
    foodName: '',
    protein: '',
    calories: '',
    quantity: '1',
    date: getTodayDate(),
    category: 'lunch' as 'breakfast' | 'lunch' | 'snacks' | 'dinner',
    dayType: 'normal' as 'normal' | 'fasting',
  });

  useEffect(() => {
    loadFoods();
  }, [selectedDate]);

  const loadFoods = async () => {
    try {
      const data = await foodAPI.getAll(selectedDate);
      setFoods(data);
    } catch (error) {
      console.error('Failed to load foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFood) {
        await foodAPI.update(editingFood._id, {
          ...formData,
          protein: Number(formData.protein),
          calories: Number(formData.calories),
          quantity: Number(formData.quantity),
          category: formData.category,
          dayType: formData.dayType,
        });
      } else {
        await foodAPI.create({
          ...formData,
          protein: Number(formData.protein),
          calories: Number(formData.calories),
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
    }
  };

  const handleEdit = (food: FoodEntry) => {
    setEditingFood(food);
    setFormData({
      foodName: food.foodName,
      protein: food.protein.toString(),
      calories: food.calories.toString(),
      quantity: food.quantity.toString(),
      date: formatDate(food.date),
      category: food.category || 'lunch',
      dayType: food.dayType || 'normal',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this food entry?')) return;
    try {
      await foodAPI.delete(id);
      loadFoods();
    } catch (error) {
      console.error('Failed to delete food:', error);
      alert('Failed to delete food entry');
    }
  };

  const resetForm = () => {
    setFormData({
      foodName: '',
      protein: '',
      calories: '',
      quantity: '1',
      date: getTodayDate(),
      category: 'lunch',
      dayType: 'normal',
    });
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
              onClick={openModal}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-xl text-base font-medium transition-colors touch-manipulation"
            >
              + Add Food Entry
            </button>
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
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                              >
                                Delete
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
              <div className="relative z-10 inline-block w-full sm:w-auto sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all max-h-[85vh] sm:max-h-[90vh] flex flex-col">
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
                        <label className="block text-sm font-medium text-gray-700">Food Name</label>
                        <input
                          type="text"
                          required
                          value={formData.foodName}
                          onChange={(e) => setFormData({ ...formData, foodName: e.target.value })}
                          className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
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
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Quantity</label>
                          <input
                            type="number"
                            required
                            min="0.1"
                            step="0.1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
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
                      className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation"
                    >
                      {editingFood ? 'Update' : 'Add'}
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

