import mongoose from 'mongoose';

const waistLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  waist: {
    type: Number, // in cm
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
waistLogSchema.index({ userId: 1, date: -1 });

export default mongoose.model('WaistLog', waistLogSchema);


