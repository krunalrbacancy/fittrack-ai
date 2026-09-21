import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    default: undefined,
    select: false
  },
  imageDataUrl: {
    type: String,
    default: undefined
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ userId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
