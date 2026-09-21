import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true,
    select: false
  }
});

documentChunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 });

export default mongoose.model('DocumentChunk', documentChunkSchema);
