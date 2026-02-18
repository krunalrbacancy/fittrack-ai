import mongoose from 'mongoose';

const stepsLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  steps: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
stepsLogSchema.index({ userId: 1, date: -1 });

export default mongoose.model('StepsLog', stepsLogSchema);

