import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getOrResetGuestAccount } from '../utils/seedGuest.js';

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

const toUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  name: user.name,
  age: user.age,
  gender: user.gender,
  height: user.height,
  activityLevel: user.activityLevel,
  currentWeight: user.currentWeight,
  targetWeight: user.targetWeight,
  targetWaist: user.targetWaist,
  goal: user.goal,
  goalType: user.goalType,
  onboardingCompleted: user.onboardingCompleted,
  isGuest: user.isGuest,
  dailyCalorieTarget: user.dailyCalorieTarget,
  dailyProteinTarget: user.dailyProteinTarget,
  dailyCarbsTarget: user.dailyCarbsTarget,
  dailyFatsTarget: user.dailyFatsTarget,
  dailyFiberTarget: user.dailyFiberTarget,
  dailySugarTarget: user.dailySugarTarget,
  fastingCalorieTarget: user.fastingCalorieTarget,
  fastingProteinTarget: user.fastingProteinTarget,
  fastingCarbsTarget: user.fastingCarbsTarget,
  fastingFatsTarget: user.fastingFatsTarget,
  fastingFiberTarget: user.fastingFiberTarget,
  fastingSugarTarget: user.fastingSugarTarget
});

// @route   POST /api/auth/register
// @desc    Create a new user account
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ username: username.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Username is already taken' });
    }

    const user = await User.create({
      username: username.trim().toLowerCase(),
      password: await bcrypt.hash(password, 10),
      name: name || ''
    });

    const token = signToken(user._id);

    res.status(201).json({ token, user: toUserResponse(user) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id);

    res.json({ token, user: toUserResponse(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/guest
// @desc    Log in as the shared demo guest account (seeded with sample data)
// @access  Public
router.post('/guest', async (req, res) => {
  try {
    const guest = await getOrResetGuestAccount();
    const token = signToken(guest._id);

    res.json({ token, user: toUserResponse(guest) });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
