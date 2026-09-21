import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { documentsAPI, DocumentItem, DocumentSource } from '../utils/api';

interface QAExchange {
  question: string;
  answer: string;
  sources: DocumentSource[];
}

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [exchanges, setExchanges] = useState<QAExchange[]>([]);
  const [askError, setAskError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const docs = await documentsAPI.list();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      await documentsAPI.upload(file);
      await loadDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsAPI.remove(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAskError('');
    setAsking(true);
    setQuestion('');

    try {
      const { answer, sources } = await documentsAPI.ask(trimmed);
      setExchanges((prev) => [...prev, { question: trimmed, answer, sources }]);
    } catch (err: any) {
      console.error('Ask error:', err);
      setAskError(err.response?.data?.message || 'Failed to get an answer. Please try again.');
    } finally {
      setAsking(false);
    }
  };

  const readyDocCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents Q&amp;A</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload your own text documents (diet plans, doctor's notes, articles) and ask questions —
            answers are grounded strictly in what you've uploaded.
          </p>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Upload a document</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100 disabled:opacity-50"
            />
            {uploading && <span className="text-sm text-gray-500">Processing…</span>}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Plain text (.txt) files only, up to 2MB, for now.{' '}
            <a
              href="/sample-fitness-plan.txt"
              download
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Download a sample file
            </a>{' '}
            to try it out.
          </p>
          {uploadError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {uploadError}
            </div>
          )}
        </div>

        {/* Document list */}
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Your documents</h2>
          {loadingDocs ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y">
              {documents.map((doc) => (
                <li key={doc._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''} ·{' '}
                      {(doc.sizeBytes / 1024).toFixed(1)} KB ·{' '}
                      <span
                        className={
                          doc.status === 'ready'
                            ? 'text-green-600'
                            : doc.status === 'failed'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }
                      >
                        {doc.status}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium shrink-0"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Q&A */}
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Ask a question</h2>

          {readyDocCount === 0 ? (
            <p className="text-sm text-gray-500">Upload a document above to start asking questions.</p>
          ) : (
            <>
              <div className="space-y-6 mb-4 max-h-96 overflow-y-auto">
                {exchanges.map((ex, i) => (
                  <div
                    key={i}
                    className={i > 0 ? 'space-y-2 pt-4 border-t border-dashed border-gray-200' : 'space-y-2'}
                  >
                    <p className="text-xs text-gray-400 font-medium">Question {i + 1}</p>
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white px-3 py-2 rounded-2xl rounded-br-sm text-sm max-w-[85%]">
                        {ex.question}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-gray-50 border px-3 py-2 rounded-2xl rounded-bl-sm text-sm max-w-[85%]">
                        <p className="whitespace-pre-wrap">{ex.answer}</p>
                        {ex.sources.length > 0 && (
                          <details className="mt-2 pt-2 border-t border-gray-200">
                            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
                              Based on {ex.sources.length} excerpt{ex.sources.length !== 1 ? 's' : ''} from your documents (click to view)
                            </summary>
                            <div className="mt-1.5 space-y-1">
                              {ex.sources.map((s, j) => (
                                <p key={j} className="text-xs text-gray-400">
                                  {s.filename} (chunk {s.chunkIndex + 1}, relevance {s.relevance})
                                </p>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {asking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>

              {askError && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {askError}
                </div>
              )}

              <form onSubmit={handleAsk} className="flex items-center gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something about your uploaded documents..."
                  disabled={asking}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  Ask
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
