import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import foodRoutes from './routes/foods.js';
import weightRoutes from './routes/weight.js';
import waterRoutes from './routes/water.js';
import waistRoutes from './routes/waist.js';
import workoutRoutes from './routes/workout.js';
import stepsRoutes from './routes/steps.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/waist', waistRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/steps', stepsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

