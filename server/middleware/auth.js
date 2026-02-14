import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Optional auth middleware - uses default user if no token provided
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (req.user) {
          return next();
        }
      } catch (error) {
        // Token invalid, fall through to default user
        console.log('Token invalid, using default user');
      }
    }

    // No token or invalid token - use default/demo user
    // Try to find the 'admin' user (same as login), or create it
    let defaultUser = await User.findOne({ username: 'admin' });

    if (!defaultUser) {
      // Create a default admin user if it doesn't exist (same as auth route)
      defaultUser = await User.create({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        name: 'Admin User',
        dailyCalorieTarget: 2000,
        dailyProteinTarget: 150,
        fastingCalorieTarget: 500,
        fastingProteinTarget: 50
      });
    }

    req.user = defaultUser;
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
