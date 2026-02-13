import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Fixed login credentials
const FIXED_USERNAME = 'admin';
const FIXED_PASSWORD = 'admin123';

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Check fixed credentials
    if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
      // Find or create user
      let user = await User.findOne({ username: FIXED_USERNAME });
      
      if (!user) {
        // Create default user if doesn't exist
        user = await User.create({
          username: FIXED_USERNAME,
          password: await bcrypt.hash(FIXED_PASSWORD, 10)
        });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          age: user.age,
          height: user.height,
          currentWeight: user.currentWeight,
          targetWeight: user.targetWeight,
          goal: user.goal,
          dailyCalorieTarget: user.dailyCalorieTarget,
          dailyProteinTarget: user.dailyProteinTarget,
          fastingCalorieTarget: user.fastingCalorieTarget
        }
      });
    } else {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

