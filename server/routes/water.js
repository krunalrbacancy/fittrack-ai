import express from 'express';
import { protect } from '../middleware/auth.js';
import WaterLog from '../models/WaterLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/water
// @desc    Get all water logs for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let query = { userId: req.user._id };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const waterLogs = await WaterLog.find(query).sort({ date: -1 });
    res.json(waterLogs);
  } catch (error) {
    console.error('Get water logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/water/stats
// @desc    Get daily water stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const waterLogs = await WaterLog.find({
      userId: req.user._id,
      date: { $gte: targetDate, $lte: endDate }
    });

    const totalWater = waterLogs.reduce((sum, log) => sum + log.amount, 0);

    res.json({
      totalWater,
      logCount: waterLogs.length
    });
  } catch (error) {
    console.error('Get water stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/water
// @desc    Create water log
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { amount, date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid amount' });
    }

    const waterLog = await WaterLog.create({
      userId: req.user._id,
      amount: Number(amount),
      date: date ? new Date(date) : new Date()
    });

    res.status(201).json(waterLog);
  } catch (error) {
    console.error('Create water log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/water/:id
// @desc    Update water log
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { amount, date } = req.body;

    const waterLog = await WaterLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!waterLog) {
      return res.status(404).json({ message: 'Water log not found' });
    }

    waterLog.amount = amount !== undefined ? Number(amount) : waterLog.amount;
    waterLog.date = date ? new Date(date) : waterLog.date;

    await waterLog.save();

    res.json(waterLog);
  } catch (error) {
    console.error('Update water log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/water/:id
// @desc    Delete water log
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const waterLog = await WaterLog.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!waterLog) {
      return res.status(404).json({ message: 'Water log not found' });
    }

    await waterLog.deleteOne();

    res.json({ message: 'Water log deleted' });
  } catch (error) {
    console.error('Delete water log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

