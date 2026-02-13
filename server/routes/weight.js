import express from 'express';
import { protect } from '../middleware/auth.js';
import WeightLog from '../models/WeightLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/weight
// @desc    Get all weight logs for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { limit } = req.query;
    const query = WeightLog.find({ userId: req.user._id }).sort({ date: -1 });
    
    if (limit) {
      query.limit(Number(limit));
    }

    const weights = await query;
    res.json(weights);
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/weight
// @desc    Create weight log
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { weight, date, notes } = req.body;

    if (!weight) {
      return res.status(400).json({ message: 'Please provide weight' });
    }

    const weightLog = await WeightLog.create({
      userId: req.user._id,
      weight: Number(weight),
      date: date ? new Date(date) : new Date(),
      notes: notes || ''
    });

    res.status(201).json(weightLog);
  } catch (error) {
    console.error('Create weight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/weight/:id
// @desc    Update weight log
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { weight, date, notes } = req.body;

    const weightLog = await WeightLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!weightLog) {
      return res.status(404).json({ message: 'Weight log not found' });
    }

    weightLog.weight = weight !== undefined ? Number(weight) : weightLog.weight;
    weightLog.date = date ? new Date(date) : weightLog.date;
    weightLog.notes = notes !== undefined ? notes : weightLog.notes;

    await weightLog.save();

    res.json(weightLog);
  } catch (error) {
    console.error('Update weight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/weight/:id
// @desc    Delete weight log
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const weightLog = await WeightLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!weightLog) {
      return res.status(404).json({ message: 'Weight log not found' });
    }

    await weightLog.deleteOne();

    res.json({ message: 'Weight log deleted' });
  } catch (error) {
    console.error('Delete weight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

