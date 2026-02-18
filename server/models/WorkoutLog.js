import mongoose from 'mongoose';

const workoutLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  workoutType: {
    type: String,
    default: ''
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
workoutLogSchema.index({ userId: 1, date: -1 });

export default mongoose.model('WorkoutLog', workoutLogSchema);

