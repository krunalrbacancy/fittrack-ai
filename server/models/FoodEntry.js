import mongoose from 'mongoose';

const foodEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  protein: {
    type: Number, // in grams
    required: true,
    min: 0
  },
  calories: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.1
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    default: 'lunch'
  },
  dayType: {
    type: String,
    enum: ['normal', 'fasting'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Index for efficient queries
foodEntrySchema.index({ userId: 1, date: -1 });

export default mongoose.model('FoodEntry', foodEntrySchema);

