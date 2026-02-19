import express from 'express';
import { protect } from '../middleware/auth.js';
import WeightLog from '../models/WeightLog.js';
import WaistLog from '../models/WaistLog.js';
import FoodEntry from '../models/FoodEntry.js';
import WorkoutLog from '../models/WorkoutLog.js';
import StepsLog from '../models/StepsLog.js';
import User from '../models/User.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/reports/weekly
// @desc    Get report data for custom date range (defaults to last 7 days if not provided)
// @access  Private
router.get('/weekly', async (req, res) => {
  try {
    let startDate, endDate;
    
    if (req.query.startDate && req.query.endDate) {
      // Use custom date range
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      // Validate date range
      if (startDate > endDate) {
        return res.status(400).json({ message: 'Start date must be before or equal to end date' });
      }
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to last 7 days
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get weight logs for date range
    const weightLogs = await WeightLog.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Get waist logs for date range
    const waistLogs = await WaistLog.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Get food entries for protein average
    const foodEntries = await FoodEntry.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Get workout logs for date range
    const workoutLogs = await WorkoutLog.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Get steps logs for date range
    const stepsLogs = await StepsLog.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Get user goals
    const user = await User.findById(req.user._id).select('targetWeight targetWaist dailyProteinTarget dailyCalorieTarget');

    // Helper function to find closest log to a specific date
    const findClosestLog = (logs, targetDate) => {
      if (logs.length === 0) return null;
      const targetTime = targetDate.getTime();
      let closest = logs[0];
      let minDiff = Math.abs(closest.date.getTime() - targetTime);
      
      for (const log of logs) {
        const diff = Math.abs(log.date.getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = log;
        }
      }
      return closest;
    };

    // Helper function to get logs for a specific date
    const getLogsForDate = (logs, targetDate) => {
      const dateStr = targetDate.toISOString().split('T')[0];
      return logs.filter(log => log.date.toISOString().split('T')[0] === dateStr);
    };

    // Helper function to find closest log within date range (for startDate, prefer on or before; for endDate, prefer on or after)
    const findClosestLogInRange = (logs, targetDate, isStartDate) => {
      if (logs.length === 0) return null;
      const targetTime = targetDate.getTime();
      let closest = null;
      let minDiff = Infinity;
      
      for (const log of logs) {
        const logTime = log.date.getTime();
        const diff = logTime - targetTime;
        
        // For startDate: prefer entries on or before the date
        // For endDate: prefer entries on or after the date
        if (isStartDate) {
          if (diff <= 0 && Math.abs(diff) < minDiff) {
            minDiff = Math.abs(diff);
            closest = log;
          } else if (diff > 0 && closest === null) {
            // If no entry before, take the first one after
            if (Math.abs(diff) < minDiff) {
              minDiff = Math.abs(diff);
              closest = log;
            }
          }
        } else {
          if (diff >= 0 && Math.abs(diff) < minDiff) {
            minDiff = Math.abs(diff);
            closest = log;
          } else if (diff < 0 && closest === null) {
            // If no entry after, take the last one before
            if (Math.abs(diff) < minDiff) {
              minDiff = Math.abs(diff);
              closest = log;
            }
          }
        }
      }
      
      return closest;
    };

    // Calculate weight at startDate and endDate
    let weightStart = null;
    let weightEnd = null;
    if (weightLogs.length > 0) {
      const startWeightLog = findClosestLog(weightLogs, startDate);
      const endWeightLog = findClosestLog(weightLogs, endDate);
      if (startWeightLog) weightStart = Math.round(startWeightLog.weight * 10) / 10;
      if (endWeightLog) weightEnd = Math.round(endWeightLog.weight * 10) / 10;
    }

    // Calculate waist at startDate and endDate
    let waistStart = null;
    let waistEnd = null;
    if (waistLogs.length > 0) {
      const startWaistLog = findClosestLog(waistLogs, startDate);
      const endWaistLog = findClosestLog(waistLogs, endDate);
      if (startWaistLog) waistStart = Math.round(startWaistLog.waist * 10) / 10;
      if (endWaistLog) waistEnd = Math.round(endWaistLog.waist * 10) / 10;
    }

    // Calculate protein at startDate and endDate
    // Group food entries by date and calculate daily totals
    const foodsByDate = {};
    foodEntries.forEach(food => {
      const dateStr = food.date.toISOString().split('T')[0];
      if (!foodsByDate[dateStr]) {
        foodsByDate[dateStr] = [];
      }
      foodsByDate[dateStr].push(food);
    });
    
    // Calculate daily protein totals
    const dailyProteinTotals = {};
    Object.keys(foodsByDate).forEach(dateStr => {
      dailyProteinTotals[dateStr] = foodsByDate[dateStr].reduce((sum, food) => sum + (food.protein || 0), 0);
    });
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get protein for exact dates first, or closest available date within range
    let proteinStart = 0;
    let proteinEnd = 0;
    
    // For startDate: prefer exact match, then first available date in range
    if (dailyProteinTotals[startDateStr] !== undefined) {
      proteinStart = dailyProteinTotals[startDateStr];
    } else {
      const sortedDates = Object.keys(dailyProteinTotals).sort();
      // Since we only query within range, use the first date in range that has data
      if (sortedDates.length > 0) {
        proteinStart = dailyProteinTotals[sortedDates[0]];
      }
    }
    
    // For endDate: prefer exact match, then last available date in range
    if (dailyProteinTotals[endDateStr] !== undefined) {
      proteinEnd = dailyProteinTotals[endDateStr];
    } else {
      const sortedDates = Object.keys(dailyProteinTotals).sort();
      // Since we only query within range, use the last date in range that has data
      if (sortedDates.length > 0) {
        proteinEnd = dailyProteinTotals[sortedDates[sortedDates.length - 1]];
      }
    }
    
    proteinStart = Math.round(proteinStart * 10) / 10;
    proteinEnd = Math.round(proteinEnd * 10) / 10;

    // Calculate workout at startDate and endDate
    let workoutStart = null;
    let workoutEnd = null;
    let workoutStartIsDuration = false;
    let workoutEndIsDuration = false;
    
    // Try exact date match first
    const startDateWorkouts = getLogsForDate(workoutLogs, startDate);
    const endDateWorkouts = getLogsForDate(workoutLogs, endDate);
    
    if (startDateWorkouts.length > 0) {
      const totalDuration = startDateWorkouts.reduce((sum, log) => sum + (log.duration || 0), 0);
      if (totalDuration > 0) {
        workoutStart = totalDuration;
        workoutStartIsDuration = true;
      } else {
        workoutStart = startDateWorkouts.length;
      }
    } else if (workoutLogs.length > 0) {
      // Find the first (earliest) workout log in the range
      const sortedWorkouts = [...workoutLogs].sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedWorkouts.length > 0) {
        const firstWorkout = sortedWorkouts[0];
        const firstDateWorkouts = getLogsForDate(workoutLogs, firstWorkout.date);
        const totalDuration = firstDateWorkouts.reduce((sum, log) => sum + (log.duration || 0), 0);
        if (totalDuration > 0) {
          workoutStart = totalDuration;
          workoutStartIsDuration = true;
        } else {
          workoutStart = firstDateWorkouts.length;
        }
      }
    }
    
    if (endDateWorkouts.length > 0) {
      const totalDuration = endDateWorkouts.reduce((sum, log) => sum + (log.duration || 0), 0);
      if (totalDuration > 0) {
        workoutEnd = totalDuration;
        workoutEndIsDuration = true;
      } else {
        workoutEnd = endDateWorkouts.length;
      }
    } else if (workoutLogs.length > 0) {
      // Find the last (latest) workout log in the range
      const sortedWorkouts = [...workoutLogs].sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedWorkouts.length > 0) {
        const lastWorkout = sortedWorkouts[sortedWorkouts.length - 1];
        const lastDateWorkouts = getLogsForDate(workoutLogs, lastWorkout.date);
        const totalDuration = lastDateWorkouts.reduce((sum, log) => sum + (log.duration || 0), 0);
        if (totalDuration > 0) {
          workoutEnd = totalDuration;
          workoutEndIsDuration = true;
        } else {
          workoutEnd = lastDateWorkouts.length;
        }
      }
    }

    // Calculate steps at startDate and endDate
    let stepsStart = null;
    let stepsEnd = null;
    
    // Try exact date match first
    const startDateSteps = getLogsForDate(stepsLogs, startDate);
    const endDateSteps = getLogsForDate(stepsLogs, endDate);
    
    if (startDateSteps.length > 0) {
      stepsStart = startDateSteps.reduce((sum, log) => sum + log.steps, 0);
    } else if (stepsLogs.length > 0) {
      // For startDate: find the first (earliest) step log in the range
      const sortedSteps = [...stepsLogs].sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedSteps.length > 0) {
        stepsStart = sortedSteps[0].steps;
      }
    }
    
    if (endDateSteps.length > 0) {
      stepsEnd = endDateSteps.reduce((sum, log) => sum + log.steps, 0);
    } else if (stepsLogs.length > 0) {
      // For endDate: find the last (latest) step log in the range
      const sortedSteps = [...stepsLogs].sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedSteps.length > 0) {
        stepsEnd = sortedSteps[sortedSteps.length - 1].steps;
      }
    }

    // Calculate changes and percentages
    const calculateChange = (start, end, isLowerBetter = false) => {
      if (start === null || end === null) return null;
      const change = end - start;
      const percent = start !== 0 ? ((change / start) * 100) : (end !== 0 ? 100 : 0);
      const isPositive = isLowerBetter ? change < 0 : change > 0;
      return {
        absolute: Math.round(change * 10) / 10,
        percent: Math.round(percent * 10) / 10,
        isPositive
      };
    };

    const weightChange = calculateChange(weightStart, weightEnd, true); // Lower is better
    const waistChange = calculateChange(waistStart, waistEnd, true); // Lower is better
    const proteinChange = calculateChange(proteinStart, proteinEnd, false); // Higher is better
    const stepsChange = calculateChange(stepsStart, stepsEnd, false); // Higher is better
    const workoutChange = calculateChange(workoutStart, workoutEnd, false); // Higher is better

    // Generate trend data for sparklines (daily data points)
    const generateTrendData = (logs, valueKey, dateRange) => {
      const trend = [];
      const dataMap = {};
      
      if (!logs || logs.length === 0) return trend;
      
      logs.forEach(log => {
        if (!log || !log.date) return;
        const dateStr = log.date.toISOString().split('T')[0];
        if (!dataMap[dateStr]) {
          dataMap[dateStr] = [];
        }
        const value = log[valueKey];
        if (value !== null && value !== undefined) {
          dataMap[dateStr].push(value);
        }
      });

      // Create daily averages/sums
      Object.keys(dataMap).sort().forEach(dateStr => {
        const values = dataMap[dateStr];
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          trend.push({
            date: dateStr,
            value: Math.round((sum / values.length) * 10) / 10
          });
        }
      });

      return trend;
    };

    // Generate trend data for protein (daily totals)
    const proteinTrend = [];
    const proteinByDate = {};
    if (foodEntries && foodEntries.length > 0) {
      foodEntries.forEach(food => {
        if (!food || !food.date) return;
        const dateStr = food.date.toISOString().split('T')[0];
        if (!proteinByDate[dateStr]) {
          proteinByDate[dateStr] = 0;
        }
        proteinByDate[dateStr] += food.protein || 0;
      });
      Object.keys(proteinByDate).sort().forEach(dateStr => {
        proteinTrend.push({
          date: dateStr,
          value: Math.round(proteinByDate[dateStr] * 10) / 10
        });
      });
    }

    // Generate trend data for calories (daily totals)
    const caloriesTrend = [];
    const caloriesByDate = {};
    if (foodEntries && foodEntries.length > 0) {
      foodEntries.forEach(food => {
        if (!food || !food.date) return;
        const dateStr = food.date.toISOString().split('T')[0];
        if (!caloriesByDate[dateStr]) {
          caloriesByDate[dateStr] = 0;
        }
        caloriesByDate[dateStr] += food.calories || 0;
      });
      Object.keys(caloriesByDate).sort().forEach(dateStr => {
        caloriesTrend.push({
          date: dateStr,
          value: Math.round(caloriesByDate[dateStr])
        });
      });
    }

    const weightTrend = generateTrendData(weightLogs, 'weight', { startDate, endDate });
    const waistTrend = generateTrendData(waistLogs, 'waist', { startDate, endDate });
    const stepsTrend = generateTrendData(stepsLogs, 'steps', { startDate, endDate });
    
    // Workout trend (daily duration totals)
    const workoutTrend = [];
    const workoutByDate = {};
    if (workoutLogs && workoutLogs.length > 0) {
      workoutLogs.forEach(log => {
        if (!log || !log.date) return;
        const dateStr = log.date.toISOString().split('T')[0];
        if (!workoutByDate[dateStr]) {
          workoutByDate[dateStr] = 0;
        }
        workoutByDate[dateStr] += log.duration || 0;
      });
      Object.keys(workoutByDate).sort().forEach(dateStr => {
        workoutTrend.push({
          date: dateStr,
          value: workoutByDate[dateStr]
        });
      });
    }

    // Calculate weekly averages
    const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Average calories
    const totalCalories = (foodEntries && foodEntries.length > 0) 
      ? foodEntries.reduce((sum, food) => sum + ((food && food.calories) || 0), 0)
      : 0;
    const avgCalories = daysInRange > 0 ? Math.round(totalCalories / daysInRange) : 0;

    // Average protein
    const totalProtein = (foodEntries && foodEntries.length > 0)
      ? foodEntries.reduce((sum, food) => sum + ((food && food.protein) || 0), 0)
      : 0;
    const avgProtein = daysInRange > 0 ? Math.round((totalProtein / daysInRange) * 10) / 10 : 0;

    // Average steps (use daysInRange for consistency with calories/protein)
    const totalSteps = (stepsLogs && stepsLogs.length > 0)
      ? stepsLogs.reduce((sum, log) => sum + ((log && log.steps) || 0), 0)
      : 0;
    const avgSteps = daysInRange > 0 ? Math.round(totalSteps / daysInRange) : 0;

    // Total workout minutes
    const totalWorkoutMinutes = (workoutLogs && workoutLogs.length > 0)
      ? workoutLogs.reduce((sum, log) => sum + ((log && log.duration) || 0), 0)
      : 0;

    // Determine status for each metric
    const getStatus = (change, isLowerBetter = false) => {
      if (!change) return 'stable';
      const threshold = 2; // 2% change threshold
      if (Math.abs(change.percent) < threshold) return 'stable';
      return (isLowerBetter ? change.isPositive : change.isPositive) ? 'improving' : 'needsAttention';
    };

    // Goal progress calculations
    let weightGoalProgress = null;
    if (user.targetWeight && weightStart !== null && weightEnd !== null) {
      const isLosing = weightStart > user.targetWeight;
      const totalNeeded = Math.abs(weightStart - user.targetWeight);
      const progressMade = Math.abs(weightStart - weightEnd);
      
      // Check if moving in correct direction
      const movingCorrectly = isLosing 
        ? (weightEnd < weightStart) 
        : (weightEnd > weightStart);
      
      if (totalNeeded > 0 && movingCorrectly) {
        weightGoalProgress = Math.min(100, (progressMade / totalNeeded) * 100);
      } else if (weightStart === user.targetWeight) {
        weightGoalProgress = 100;
      } else {
        weightGoalProgress = 0;
      }
    }

    const proteinGoalProgress = user.dailyProteinTarget && avgProtein > 0
      ? Math.min(100, (avgProtein / user.dailyProteinTarget) * 100)
      : null;

    // Waist goal progress calculation (similar to weight)
    let waistGoalProgress = null;
    if (user.targetWaist && waistStart !== null && waistEnd !== null) {
      const isLosing = waistStart > user.targetWaist;
      const totalNeeded = Math.abs(waistStart - user.targetWaist);
      const progressMade = Math.abs(waistStart - waistEnd);
      
      // Check if moving in correct direction
      const movingCorrectly = isLosing 
        ? (waistEnd < waistStart) 
        : (waistEnd > waistStart);
      
      if (totalNeeded > 0 && movingCorrectly) {
        waistGoalProgress = Math.min(100, (progressMade / totalNeeded) * 100);
      } else if (waistStart === user.targetWaist) {
        waistGoalProgress = 100;
      } else {
        waistGoalProgress = 0;
      }
    }

    res.json({
      weightStart,
      weightEnd,
      weightChange,
      weightTrend,
      weightStatus: getStatus(weightChange, true),
      weightGoalProgress,
      waistStart,
      waistEnd,
      waistChange,
      waistTrend,
      waistStatus: getStatus(waistChange, true),
      waistGoalProgress,
      proteinStart,
      proteinEnd,
      proteinChange,
      proteinTrend,
      proteinStatus: getStatus(proteinChange, false),
      proteinGoalProgress,
      workoutStart,
      workoutEnd,
      workoutStartIsDuration,
      workoutEndIsDuration,
      workoutChange,
      workoutTrend,
      workoutStatus: getStatus(workoutChange, false),
      stepsStart,
      stepsEnd,
      stepsChange,
      stepsTrend,
      stepsStatus: getStatus(stepsChange, false),
      // Weekly averages
      avgCalories,
      avgProtein,
      avgSteps,
      totalWorkoutMinutes,
      caloriesTrend,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

