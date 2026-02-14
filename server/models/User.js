import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  age: {
    type: Number,
    default: null
  },
  height: {
    type: Number, // in cm
    default: null
  },
  currentWeight: {
    type: Number, // in kg
    default: null
  },
  targetWeight: {
    type: Number, // in kg
    default: null
  },
  goal: {
    type: String,
    default: 'Reduce Belly Fat'
  },
  dailyCalorieTarget: {
    type: Number,
    default: 2000
  },
  dailyProteinTarget: {
    type: Number, // in grams
    default: 90
  },
  dailyCarbsTarget: {
    type: Number, // in grams
    default: 240
  },
  dailyFatsTarget: {
    type: Number, // in grams
    default: 60
  },
  dailyFiberTarget: {
    type: Number, // in grams
    default: 28
  },
  fastingCalorieTarget: {
    type: Number,
    default: 1600
  },
  fastingProteinTarget: {
    type: Number, // in grams
    default: 70
  },
  fastingCarbsTarget: {
    type: Number, // in grams
    default: 170
  },
  fastingFatsTarget: {
    type: Number, // in grams
    default: 55
  },
  fastingFiberTarget: {
    type: Number, // in grams
    default: 22
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);

