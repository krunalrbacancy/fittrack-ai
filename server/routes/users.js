import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', async (req, res) => {
  try {
    const {
      name,
      age,
      height,
      currentWeight,
      targetWeight,
      goal,
      dailyCalorieTarget,
      dailyProteinTarget,
      fastingCalorieTarget
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        age,
        height,
        currentWeight,
        targetWeight,
        goal,
        dailyCalorieTarget,
        dailyProteinTarget,
        fastingCalorieTarget
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

