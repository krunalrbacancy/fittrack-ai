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
    default: 150
  },
  fastingCalorieTarget: {
    type: Number,
    default: 500
  },
  fastingProteinTarget: {
    type: Number, // in grams
    default: 70
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);

