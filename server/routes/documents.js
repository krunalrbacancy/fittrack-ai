import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { getAI, embedText, cosineSimilarity } from '../utils/embeddings.js';
import { chunkText } from '../utils/chunkText.js';

const router = express.Router();

router.use(protect);

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — plenty for plain text notes/plans
const TOP_K_CHUNKS = 5;
const MIN_RELEVANCE_SCORE = 0.5;
const GENERATION_MODEL = 'gemini-flash-lite-latest';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/plain' && !file.originalname.toLowerCase().endsWith('.txt')) {
      return cb(new Error('Only .txt files are supported right now'));
    }
    cb(null, true);
  }
});

// @route   POST /api/documents/upload
// @desc    Upload a .txt document; extracts text, chunks it, embeds each chunk, stores it
// @access  Private
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const aiClient = getAI();
    if (!aiClient) {
      return res.status(503).json({ message: 'Document RAG is not configured on the server' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const text = req.file.buffer.toString('utf-8').trim();
    if (!text) {
      return res.status(400).json({ message: 'The uploaded file is empty' });
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return res.status(400).json({ message: 'Could not extract any text from this file' });
    }

    const document = await Document.create({
      userId: req.user._id,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
      chunkCount: chunks.length,
      status: 'processing'
    });

    try {
      // Embed all chunks in parallel — each is an independent embedding call
      const embeddings = await Promise.all(chunks.map((chunk) => embedText(aiClient, chunk)));

      const chunkDocs = chunks.map((chunk, i) => ({
        documentId: document._id,
        userId: req.user._id,
        chunkIndex: i,
        text: chunk,
        embedding: embeddings[i]
      }));

      const failedCount = chunkDocs.filter((c) => !c.embedding).length;
      if (failedCount === chunkDocs.length) {
        throw new Error('Embedding failed for all chunks');
      }

      await DocumentChunk.insertMany(chunkDocs.filter((c) => c.embedding));
      document.status = 'ready';
      await document.save();
    } catch (error) {
      document.status = 'failed';
      await document.save();
      throw error;
    }

    res.status(201).json({
      id: document._id,
      filename: document.filename,
      sizeBytes: document.sizeBytes,
      chunkCount: document.chunkCount,
      status: document.status
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ message: error.message || 'Failed to process document' });
  }
});

// @route   GET /api/documents
// @desc    List the current user's uploaded documents
// @access  Private
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document and all of its chunks
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await Promise.all([
      DocumentChunk.deleteMany({ documentId: document._id, userId: req.user._id }),
      Document.deleteOne({ _id: document._id })
    ]);

    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/documents/ask
// @desc    RAG query: retrieve the most relevant chunks across the user's documents
//          and generate a grounded answer using only that retrieved context
// @access  Private
router.post('/ask', async (req, res) => {
  try {
    const aiClient = getAI();
    if (!aiClient) {
      return res.status(503).json({ message: 'Document RAG is not configured on the server' });
    }

    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const readyDocumentIds = await Document.find({ userId: req.user._id, status: 'ready' }).distinct('_id');
    if (readyDocumentIds.length === 0) {
      return res.status(400).json({ message: 'Upload at least one document first' });
    }

    const queryEmbedding = await embedText(aiClient, question.trim());
    if (!queryEmbedding) {
      return res.status(500).json({ message: 'Failed to process the question' });
    }

    const chunks = await DocumentChunk.find({ userId: req.user._id, documentId: { $in: readyDocumentIds } })
      .select('+embedding')
      .populate('documentId', 'filename');

    const scored = chunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K_CHUNKS)
      .filter((s) => s.score >= MIN_RELEVANCE_SCORE);

    if (scored.length === 0) {
      return res.json({
        answer: "I couldn't find anything in your uploaded documents relevant to that question.",
        sources: []
      });
    }

    const contextBlock = scored
      .map((s, i) => `[Excerpt ${i + 1} from "${s.chunk.documentId.filename}"]\n${s.chunk.text}`)
      .join('\n\n');

    const prompt = `You are a document Q&A assistant. Answer the user's question using ONLY the excerpts below. If the excerpts don't contain the answer, say so plainly instead of guessing or using outside knowledge.

${contextBlock}

Question: ${question.trim()}`;

    const response = await aiClient.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt
    });

    const answer = response.text || "Sorry, I couldn't generate an answer. Please try again.";

    res.json({
      answer,
      sources: scored.map((s) => ({
        filename: s.chunk.documentId.filename,
        chunkIndex: s.chunk.chunkIndex,
        excerpt: s.chunk.text.slice(0, 200),
        relevance: Math.round(s.score * 100) / 100
      }))
    });
  } catch (error) {
    console.error('Document ask error:', error);
    res.status(500).json({ message: 'Failed to answer the question' });
  }
});

export default router;
