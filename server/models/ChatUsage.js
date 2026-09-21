import mongoose from 'mongoose';

const chatUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD, server-local calendar day
    required: true
  },
  totalTokens: {
    type: Number,
    default: 0
  }
});

chatUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('ChatUsage', chatUsageSchema);
