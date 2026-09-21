import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  sizeBytes: {
    type: Number,
    required: true
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing'
  }
}, {
  timestamps: true
});

documentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Document', documentSchema);
