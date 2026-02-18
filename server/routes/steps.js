import express from 'express';
import { protect } from '../middleware/auth.js';
import StepsLog from '../models/StepsLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/steps
// @desc    Get all steps logs for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { limit } = req.query;
    const query = StepsLog.find({ userId: req.user._id }).sort({ date: -1 });
    
    if (limit) {
      query.limit(Number(limit));
    }

    const stepsLogs = await query;
    res.json(stepsLogs);
  } catch (error) {
    console.error('Get steps logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/steps
// @desc    Create steps log
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { steps, date, notes } = req.body;

    if (!steps) {
      return res.status(400).json({ message: 'Please provide steps count' });
    }

    const stepsLog = await StepsLog.create({
      userId: req.user._id,
      steps: Number(steps),
      date: date ? new Date(date) : new Date(),
      notes: notes || ''
    });

    res.status(201).json(stepsLog);
  } catch (error) {
    console.error('Create steps log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/steps/:id
// @desc    Update steps log
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { steps, date, notes } = req.body;

    const stepsLog = await StepsLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!stepsLog) {
      return res.status(404).json({ message: 'Steps log not found' });
    }

    stepsLog.steps = steps !== undefined ? Number(steps) : stepsLog.steps;
    stepsLog.date = date ? new Date(date) : stepsLog.date;
    stepsLog.notes = notes !== undefined ? notes : stepsLog.notes;

    await stepsLog.save();

    res.json(stepsLog);
  } catch (error) {
    console.error('Update steps log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/steps/:id
// @desc    Delete steps log
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const stepsLog = await StepsLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!stepsLog) {
      return res.status(404).json({ message: 'Steps log not found' });
    }

    await stepsLog.deleteOne();

    res.json({ message: 'Steps log deleted' });
  } catch (error) {
    console.error('Delete steps log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;


