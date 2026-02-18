import express from 'express';
import { optionalAuth, protect } from '../middleware/auth.js';
import FoodEntry from '../models/FoodEntry.js';

const router = express.Router();

// @route   GET /api/foods
// @desc    Get all food entries for user
// @access  Private (optional auth for read-only access)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { date } = req.query;
    let query = { userId: req.user._id };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const foods = await FoodEntry.find(query).sort({ date: -1 });
    res.json(foods);
  } catch (error) {
    console.error('Get foods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/foods/stats
// @desc    Get daily stats
// @access  Private (optional auth for read-only access)
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const foods = await FoodEntry.find({
      userId: req.user._id,
      date: { $gte: targetDate, $lte: endDate }
    });

    const totalCalories = foods.reduce((sum, food) => sum + food.calories, 0);
    const totalProtein = foods.reduce((sum, food) => sum + food.protein, 0);
    const totalCarbs = foods.reduce((sum, food) => sum + (food.carbs || 0), 0);
    const totalFats = foods.reduce((sum, food) => sum + (food.fats || 0), 0);
    const totalFiber = foods.reduce((sum, food) => sum + (food.fiber || 0), 0);
    const totalSugar = foods.reduce((sum, food) => sum + (food.sugar || 0), 0);

    res.json({
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      totalFiber,
      totalSugar,
      foodCount: foods.length
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/foods/weekly
// @desc    Get weekly stats
// @access  Private (optional auth for read-only access)
router.get('/weekly', optionalAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const foods = await FoodEntry.find({
      userId: req.user._id,
      date: { $gte: weekAgo, $lte: today }
    });

    // Group by date
    const dailyStats = {};
    foods.forEach(food => {
      const dateKey = food.date.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0 };
      }
      dailyStats[dateKey].calories += food.calories;
      dailyStats[dateKey].protein += food.protein;
      dailyStats[dateKey].carbs += (food.carbs || 0);
      dailyStats[dateKey].fats += (food.fats || 0);
      dailyStats[dateKey].fiber += (food.fiber || 0);
      dailyStats[dateKey].sugar += (food.sugar || 0);
    });

    res.json(dailyStats);
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/foods
// @desc    Create food entry
// @access  Private (requires authentication for write operations)
router.post('/', protect, async (req, res) => {
  try {
    const { foodName, protein, calories, quantity, date, category, dayType, carbs, fats, fiber, sugar } = req.body;

    if (!foodName || protein === undefined || calories === undefined || !quantity) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const foodEntry = await FoodEntry.create({
      userId: req.user._id,
      foodName,
      protein: Number(protein),
      calories: Number(calories),
      quantity: Number(quantity),
      date: date ? new Date(date) : new Date(),
      category: category || 'lunch',
      dayType: dayType || 'normal',
      carbs: carbs !== undefined ? Number(carbs) : 0,
      fats: fats !== undefined ? Number(fats) : 0,
      fiber: fiber !== undefined ? Number(fiber) : 0,
      sugar: sugar !== undefined ? Number(sugar) : 0
    });

    res.status(201).json(foodEntry);
  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/foods/:id
// @desc    Update food entry
// @access  Private (requires authentication for write operations)
router.put('/:id', protect, async (req, res) => {
  try {
    const { foodName, protein, calories, quantity, date, category, dayType, carbs, fats, fiber, sugar } = req.body;

    const foodEntry = await FoodEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!foodEntry) {
      return res.status(404).json({ message: 'Food entry not found' });
    }

    foodEntry.foodName = foodName || foodEntry.foodName;
    foodEntry.protein = protein !== undefined ? Number(protein) : foodEntry.protein;
    foodEntry.calories = calories !== undefined ? Number(calories) : foodEntry.calories;
    foodEntry.quantity = quantity !== undefined ? Number(quantity) : foodEntry.quantity;
    foodEntry.date = date ? new Date(date) : foodEntry.date;
    if (category) foodEntry.category = category;
    if (dayType) foodEntry.dayType = dayType;
    foodEntry.carbs = carbs !== undefined ? Number(carbs) : (foodEntry.carbs || 0);
    foodEntry.fats = fats !== undefined ? Number(fats) : (foodEntry.fats || 0);
    foodEntry.fiber = fiber !== undefined ? Number(fiber) : (foodEntry.fiber || 0);
    foodEntry.sugar = sugar !== undefined ? Number(sugar) : (foodEntry.sugar || 0);

    await foodEntry.save();

    res.json(foodEntry);
  } catch (error) {
    console.error('Update food error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/foods/:id
// @desc    Delete food entry
// @access  Private (requires authentication for write operations)
router.delete('/:id', protect, async (req, res) => {
  try {
    const foodEntry = await FoodEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!foodEntry) {
      return res.status(404).json({ message: 'Food entry not found' });
    }

    await foodEntry.deleteOne();

    res.json({ message: 'Food entry deleted' });
  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple nutrition lookup for common foods
// Format: { key: { sugar: value, per100g: boolean } }
const COMMON_FOODS_SUGAR = {
  // Per unit foods
  'banana': { sugar: 14, per100g: false },
  'apple': { sugar: 19, per100g: false },
  'orange': { sugar: 12, per100g: false },
  'mango': { sugar: 14, per100g: false },
  'grapes': { sugar: 16, per100g: false },
  'strawberry': { sugar: 4.9, per100g: false },
  'strawberries': { sugar: 4.9, per100g: false },
  'watermelon': { sugar: 6.2, per100g: false },
  'papaya': { sugar: 7.8, per100g: false },
  'guava': { sugar: 8.9, per100g: false },
  'pineapple': { sugar: 10, per100g: false },
  'pomegranate': { sugar: 13.7, per100g: false },
  'kiwi': { sugar: 9, per100g: false },
  'pear': { sugar: 10, per100g: false },
  'peach': { sugar: 8.4, per100g: false },
  'cherry': { sugar: 8, per100g: false },
  'cherries': { sugar: 8, per100g: false },
  'blueberry': { sugar: 10, per100g: false },
  'blueberries': { sugar: 10, per100g: false },
  'coconut': { sugar: 6, per100g: false },
  'dates': { sugar: 63, per100g: false },
  'date': { sugar: 63, per100g: false },
  'milk': { sugar: 12, per100g: false },
  'yogurt': { sugar: 11, per100g: false },
  'bread': { sugar: 1.5, per100g: false },
  'egg': { sugar: 0.2, per100g: false },
  'eggs': { sugar: 0.2, per100g: false },
  'boiled egg': { sugar: 0.2, per100g: false },
  'omelet': { sugar: 0.5, per100g: false },
  'omlet': { sugar: 0.5, per100g: false },
  'roti': { sugar: 0.2, per100g: false },
  'chapati': { sugar: 0.2, per100g: false },
  'phulka': { sugar: 0.2, per100g: false },
  'oatmeal': { sugar: 1, per100g: false },
  // Per 100g foods
  'curd': { sugar: 3.4, per100g: true },
  'dahi': { sugar: 3.4, per100g: true },
  'rice': { sugar: 0.1, per100g: true },
  'dal': { sugar: 0.5, per100g: true },
  'lentil': { sugar: 0.5, per100g: true },
  'chana': { sugar: 1, per100g: true },
  'chickpea': { sugar: 1, per100g: true },
  'chickpeas': { sugar: 1, per100g: true },
  'chole': { sugar: 1, per100g: true },
  'sabji': { sugar: 2, per100g: true },
  'sabzi': { sugar: 2, per100g: true },
  'vegetable': { sugar: 2, per100g: true },
  'paneer chilla': { sugar: 1, per100g: true },
  'paneer chila': { sugar: 1, per100g: true },
  'moong chilla': { sugar: 1, per100g: true },
  'moong chila': { sugar: 1, per100g: true },
  'moong dal chilla': { sugar: 1, per100g: true },
  'broccoli': { sugar: 1.5, per100g: true },
  'spinach': { sugar: 0.4, per100g: true },
  'chicken': { sugar: 0, per100g: true },
  'chicken breast': { sugar: 0, per100g: true },
  'salmon': { sugar: 0, per100g: true },
};

// Helper function to get sugar value from food name
function getSugarFromFoodName(foodName, quantity) {
  const normalizedName = foodName.toLowerCase().trim();
  
  // Check for exact or partial matches
  for (const [key, foodData] of Object.entries(COMMON_FOODS_SUGAR)) {
    if (normalizedName.includes(key)) {
      const { sugar: sugarPerUnit, per100g } = foodData;
      
      if (per100g) {
        // For per100g foods, if quantity > 10, assume it's in grams, otherwise assume it's units of 100g
        const multiplier = quantity > 10 ? quantity / 100 : quantity;
        return Math.round(sugarPerUnit * multiplier * 10) / 10;
      } else {
        // For per-unit foods, multiply by quantity
        return Math.round(sugarPerUnit * quantity * 10) / 10;
      }
    }
  }
  
  return 0; // Default to 0 if not found
}

// @route   POST /api/foods/migrate
// @desc    Migrate existing food entries to add carbs, fats, fiber, and sugar (calculate sugar from food name)
// @access  Private (requires authentication for write operations)
router.post('/migrate', protect, async (req, res) => {
  try {
    // First, update entries missing carbs, fats, fiber (set to 0)
    const result1 = await FoodEntry.updateMany(
      {
        userId: req.user._id,
        $or: [
          { carbs: { $exists: false } },
          { carbs: null },
          { fats: { $exists: false } },
          { fats: null },
          { fiber: { $exists: false } },
          { fiber: null }
        ]
      },
      {
        $set: {
          carbs: 0,
          fats: 0,
          fiber: 0
        }
      }
    );

    // Then, update entries missing sugar (calculate from food name)
    const foodsWithoutSugar = await FoodEntry.find({
      userId: req.user._id,
      $or: [
        { sugar: { $exists: false } },
        { sugar: null },
        { sugar: 0 } // Also update entries with 0 sugar to recalculate
      ]
    });

    let sugarUpdated = 0;
    for (const food of foodsWithoutSugar) {
      const calculatedSugar = getSugarFromFoodName(food.foodName, food.quantity);
      if (calculatedSugar > 0 || food.sugar === undefined || food.sugar === null) {
        food.sugar = calculatedSugar;
        await food.save();
        sugarUpdated++;
      }
    }

    res.json({
      message: 'Migration completed',
      carbsFatsFiberUpdated: result1.modifiedCount,
      sugarUpdated: sugarUpdated
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

