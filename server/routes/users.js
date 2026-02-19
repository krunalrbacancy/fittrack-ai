import express from 'express';
import { optionalAuth, protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private (optional auth for read-only access)
router.get('/profile', optionalAuth, async (req, res) => {
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
// @access  Private (requires authentication for write operations)
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      name,
      age,
      height,
      currentWeight,
      targetWeight,
      targetWaist,
      goal,
      dailyCalorieTarget,
      dailyProteinTarget,
      dailyCarbsTarget,
      dailyFatsTarget,
      dailyFiberTarget,
      dailySugarTarget,
      fastingCalorieTarget,
      fastingProteinTarget,
      fastingCarbsTarget,
      fastingFatsTarget,
      fastingFiberTarget,
      fastingSugarTarget
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        age,
        height,
        currentWeight,
        targetWeight,
        targetWaist,
        goal,
        dailyCalorieTarget,
        dailyProteinTarget,
        dailyCarbsTarget,
        dailyFatsTarget,
        dailyFiberTarget,
        dailySugarTarget,
        fastingCalorieTarget,
        fastingProteinTarget,
        fastingCarbsTarget,
        fastingFatsTarget,
        fastingFiberTarget,
        fastingSugarTarget
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

