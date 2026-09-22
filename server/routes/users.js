import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import { calculateNutritionTargets } from '../utils/nutritionTargets.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
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
      gender,
      height,
      activityLevel,
      trainingLevel,
      currentWeight,
      targetWeight,
      targetWaist,
      goal,
      goalType,
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
        gender,
        height,
        activityLevel,
        trainingLevel,
        currentWeight,
        targetWeight,
        targetWaist,
        goal,
        goalType,
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

const GOAL_LABELS = {
  lose: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain: 'Gain Muscle'
};

// @route   POST /api/users/onboarding
// @desc    Complete the post-signup survey and set initial nutrition targets
// @access  Private
router.post('/onboarding', protect, async (req, res) => {
  try {
    const { age, gender, height, currentWeight, targetWeight, targetWaist, activityLevel, goalType, trainingLevel } = req.body;

    if (!age || !gender || !height || !currentWeight || !activityLevel || !goalType) {
      return res.status(400).json({ message: 'Please answer all survey questions' });
    }

    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender value' });
    }
    if (!['sedentary', 'light', 'moderate', 'active', 'veryActive'].includes(activityLevel)) {
      return res.status(400).json({ message: 'Invalid activity level' });
    }
    if (!['lose', 'maintain', 'gain'].includes(goalType)) {
      return res.status(400).json({ message: 'Invalid goal' });
    }
    if (trainingLevel && !['beginner', 'intermediate', 'advanced'].includes(trainingLevel)) {
      return res.status(400).json({ message: 'Invalid training level' });
    }

    const targets = calculateNutritionTargets({
      gender,
      weightKg: Number(currentWeight),
      heightCm: Number(height),
      age: Number(age),
      activityLevel,
      goal: goalType,
      trainingLevel: trainingLevel || 'beginner'
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        age: Number(age),
        gender,
        height: Number(height),
        currentWeight: Number(currentWeight),
        targetWeight: targetWeight ? Number(targetWeight) : null,
        targetWaist: targetWaist ? Number(targetWaist) : null,
        activityLevel,
        trainingLevel: trainingLevel || 'beginner',
        goalType,
        goal: GOAL_LABELS[goalType],
        onboardingCompleted: true,
        ...targets
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/recalculate-targets
// @desc    Recompute nutrition targets from the user's current profile data
//          (optionally overriding trainingLevel before saving it)
// @access  Private
router.post('/recalculate-targets', protect, async (req, res) => {
  try {
    const { trainingLevel } = req.body;

    if (trainingLevel && !['beginner', 'intermediate', 'advanced'].includes(trainingLevel)) {
      return res.status(400).json({ message: 'Invalid training level' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.age || !user.gender || !user.height || !user.currentWeight || !user.activityLevel || !user.goalType) {
      return res.status(400).json({ message: 'Complete onboarding before recalculating targets' });
    }

    const effectiveTrainingLevel = trainingLevel || user.trainingLevel || 'beginner';

    const targets = calculateNutritionTargets({
      gender: user.gender,
      weightKg: user.currentWeight,
      heightCm: user.height,
      age: user.age,
      activityLevel: user.activityLevel,
      goal: user.goalType,
      trainingLevel: effectiveTrainingLevel
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { trainingLevel: effectiveTrainingLevel, ...targets },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error('Recalculate targets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

