import express from 'express';
import { protect } from '../middleware/auth.js';
import WaistLog from '../models/WaistLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/waist
// @desc    Get all waist logs for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { limit } = req.query;
    const query = WaistLog.find({ userId: req.user._id }).sort({ date: -1 });
    
    if (limit) {
      query.limit(Number(limit));
    }

    const waistLogs = await query;
    res.json(waistLogs);
  } catch (error) {
    console.error('Get waist logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/waist
// @desc    Create waist log
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { waist, date, notes } = req.body;

    if (!waist) {
      return res.status(400).json({ message: 'Please provide waist measurement' });
    }

    const waistLog = await WaistLog.create({
      userId: req.user._id,
      waist: Number(waist),
      date: date ? new Date(date) : new Date(),
      notes: notes || ''
    });

    res.status(201).json(waistLog);
  } catch (error) {
    console.error('Create waist log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/waist/:id
// @desc    Update waist log
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { waist, date, notes } = req.body;

    const waistLog = await WaistLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!waistLog) {
      return res.status(404).json({ message: 'Waist log not found' });
    }

    waistLog.waist = waist !== undefined ? Number(waist) : waistLog.waist;
    waistLog.date = date ? new Date(date) : waistLog.date;
    waistLog.notes = notes !== undefined ? notes : waistLog.notes;

    await waistLog.save();

    res.json(waistLog);
  } catch (error) {
    console.error('Update waist log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/waist/:id
// @desc    Delete waist log
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const waistLog = await WaistLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!waistLog) {
      return res.status(404).json({ message: 'Waist log not found' });
    }

    await waistLog.deleteOne();

    res.json({ message: 'Waist log deleted' });
  } catch (error) {
    console.error('Delete waist log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

