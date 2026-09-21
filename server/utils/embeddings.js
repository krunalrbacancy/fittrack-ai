import { GoogleGenAI } from '@google/genai';

let ai;
export const getAI = () => {
  if (ai === undefined) {
    ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  }
  return ai;
};

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

export const embedText = async (aiClient, text) => {
  try {
    const res = await aiClient.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS }
    });
    return res.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error('Embedding error:', error.message);
    return null;
  }
};

export const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
