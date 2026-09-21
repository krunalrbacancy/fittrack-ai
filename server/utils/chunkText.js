const CHUNK_SIZE_WORDS = 200;
const CHUNK_OVERLAP_WORDS = 40;

// Splits text into overlapping word-count-based chunks. Overlap keeps context
// from being harshly severed mid-thought at a chunk boundary.
export const chunkText = (text) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start = end - CHUNK_OVERLAP_WORDS;
  }

  return chunks;
};
