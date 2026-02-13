import express from 'express';
import { protect } from '../middleware/auth.js';
import FoodEntry from '../models/FoodEntry.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/foods
// @desc    Get all food entries for user
// @access  Private
router.get('/', async (req, res) => {
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
// @access  Private
router.get('/stats', async (req, res) => {
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

    res.json({
      totalCalories,
      totalProtein,
      foodCount: foods.length
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/foods/weekly
// @desc    Get weekly stats
// @access  Private
router.get('/weekly', async (req, res) => {
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
        dailyStats[dateKey] = { calories: 0, protein: 0 };
      }
      dailyStats[dateKey].calories += food.calories;
      dailyStats[dateKey].protein += food.protein;
    });

    res.json(dailyStats);
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/foods
// @desc    Create food entry
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { foodName, protein, calories, quantity, date, category, dayType } = req.body;

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
      dayType: dayType || 'normal'
    });

    res.status(201).json(foodEntry);
  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/foods/:id
// @desc    Update food entry
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { foodName, protein, calories, quantity, date, category, dayType } = req.body;

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

    await foodEntry.save();

    res.json(foodEntry);
  } catch (error) {
    console.error('Update food error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/foods/:id
// @desc    Delete food entry
// @access  Private
router.delete('/:id', async (req, res) => {
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

export default router;

