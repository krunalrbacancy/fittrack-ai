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
    const { foodName, protein, calories, quantity, date, category, dayType, carbs, fats, fiber } = req.body;

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
      fiber: fiber !== undefined ? Number(fiber) : 0
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
    const { foodName, protein, calories, quantity, date, category, dayType, carbs, fats, fiber } = req.body;

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

// @route   POST /api/foods/migrate
// @desc    Migrate existing food entries to add carbs, fats, fiber (set to 0 if missing)
// @access  Private (requires authentication for write operations)
router.post('/migrate', protect, async (req, res) => {
  try {
    const result = await FoodEntry.updateMany(
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

    res.json({
      message: 'Migration completed',
      updated: result.modifiedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

