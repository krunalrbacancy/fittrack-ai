import express from 'express';
import { protect } from '../middleware/auth.js';
import WorkoutLog from '../models/WorkoutLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/workout
// @desc    Get all workout logs for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { limit } = req.query;
    const query = WorkoutLog.find({ userId: req.user._id }).sort({ date: -1 });
    
    if (limit) {
      query.limit(Number(limit));
    }

    const workouts = await query;
    res.json(workouts);
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/workout
// @desc    Create workout log
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { date, workoutType, duration, notes } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Please provide date' });
    }

    const workoutLog = await WorkoutLog.create({
      userId: req.user._id,
      date: new Date(date),
      workoutType: workoutType || '',
      duration: duration ? Number(duration) : 0,
      notes: notes || ''
    });

    res.status(201).json(workoutLog);
  } catch (error) {
    console.error('Create workout log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/workout/:id
// @desc    Update workout log
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { date, workoutType, duration, notes } = req.body;

    const workoutLog = await WorkoutLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workoutLog) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    workoutLog.date = date ? new Date(date) : workoutLog.date;
    workoutLog.workoutType = workoutType !== undefined ? workoutType : workoutLog.workoutType;
    workoutLog.duration = duration !== undefined ? Number(duration) : workoutLog.duration;
    workoutLog.notes = notes !== undefined ? notes : workoutLog.notes;

    await workoutLog.save();

    res.json(workoutLog);
  } catch (error) {
    console.error('Update workout log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/workout/:id
// @desc    Delete workout log
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const workoutLog = await WorkoutLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!workoutLog) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    await workoutLog.deleteOne();

    res.json({ message: 'Workout log deleted' });
  } catch (error) {
    console.error('Delete workout log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

