import React, { useState, useEffect, useRef } from 'react';
import { chatAPI, ChatUsage, ChatModelOption } from '../utils/api';
import { ChatMessage } from '../types';

// Lightweight renderer for the small subset of markdown Gemini tends to use
// (bold, headers, bullet lists, horizontal rules) — avoids pulling in a full markdown lib.
const renderInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

const renderMessageContent = (content: string): React.ReactNode => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 my-1 space-y-0.5">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (/^(\*|-)\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^(\*|-)\s+/, ''));
      return;
    }
    flushList();

    if (/^#{1,4}\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^#{1,4}\s+/, '');
      elements.push(
        <p key={idx} className="font-semibold mt-2 mb-1">
          {renderInline(heading)}
        </p>
      );
      return;
    }

    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={idx} className="my-2 border-gray-200" />);
      return;
    }

    if (trimmed === '') {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    elements.push(
      <p key={idx} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  flushList();
  return elements;
};

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedHistory = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && !hasLoadedHistory.current) {
      hasLoadedHistory.current = true;
      setLoadingHistory(true);
      chatAPI
        .getHistory()
        .then(setMessages)
        .catch((err) => console.error('Failed to load chat history:', err))
        .finally(() => setLoadingHistory(false));
      chatAPI.getUsage().then(setUsage).catch((err) => console.error('Failed to load chat usage:', err));
      chatAPI
        .getModels()
        .then(({ models, selected }) => {
          setModelOptions(models);
          setSelectedModel(selected);
        })
        .catch((err) => console.error('Failed to load chat models:', err));
    }
  }, [isOpen]);

  // Auto-grow the textarea up to a max height, then scroll internally
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const handleModelChange = async (modelId: string) => {
    setShowModelMenu(false);
    if (modelId === selectedModel) return;
    const previous = selectedModel;
    setSelectedModel(modelId);
    try {
      await chatAPI.setModel(modelId);
    } catch (err) {
      console.error('Failed to set chat model:', err);
      setSelectedModel(previous);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = (revokeUrl = true) => {
    if (revokeUrl && imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage) || sending) return;

    setError('');
    const userMessage: ChatMessage = {
      _id: `local-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      imagePreviewUrl: imagePreviewUrl || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const imageToSend = selectedImage;
    // Keep the object URL alive so the sent message bubble can still show the thumbnail
    clearSelectedImage(false);
    setSending(true);

    try {
      const { reply, usage: messageUsage } = await chatAPI.sendMessage(trimmed, imageToSend);
      setMessages((prev) => [
        ...prev,
        {
          _id: `local-${Date.now()}-reply`,
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
          totalTokens: messageUsage?.totalTokens,
        },
      ]);
      if (messageUsage) {
        setUsage({
          tokensUsed: messageUsage.dailyBudget - messageUsage.tokensRemaining,
          dailyBudget: messageUsage.dailyBudget,
          tokensRemaining: messageUsage.tokensRemaining,
        });
      }
    } catch (err: any) {
      console.error('Chat send error:', err);
      if (err.response?.status === 429 && err.response?.data?.tokensRemaining !== undefined) {
        setUsage({
          tokensUsed: err.response.data.tokensUsed,
          dailyBudget: err.response.data.dailyBudget,
          tokensRemaining: err.response.data.tokensRemaining,
        });
        setError(err.response.data.message);
      } else if (err.response?.status === 503) {
        setError('AI chat is not configured yet.');
      } else {
        setError('Failed to get a response. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    try {
      await chatAPI.clearHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(true); // next open should start large again
  };

  return (
    <>
      {/* Floating toggle button — always present; the panel (higher z-index) sits above it when open */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] w-14 h-14">
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-blue-500 opacity-75 animate-ping pointer-events-none" />
        )}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xl flex items-center justify-center transition-transform duration-150 touch-manipulation hover:scale-110 active:scale-95"
          aria-label={isOpen ? 'Close AI coach chat' : 'Open AI coach chat'}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <span className="text-2xl">🤖</span>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed z-[70] bg-white shadow-2xl border flex flex-col overflow-hidden transition-all ${
            isExpanded
              ? 'inset-4 md:inset-10 rounded-2xl'
              : 'bottom-36 right-4 md:bottom-24 md:right-6 w-[calc(100vw-2rem)] max-w-sm h-[36rem] max-h-[70vh] rounded-2xl'
          }`}
        >
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <p className="font-semibold text-sm">FitTrack AI Coach</p>
              {usage ? (
                <p className="text-xs text-blue-100 truncate">
                  {usage.tokensRemaining.toLocaleString()} of {usage.dailyBudget.toLocaleString()} tokens left today
                </p>
              ) : (
                <p className="text-xs text-blue-100 truncate">Ask about your progress, diet or workouts</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleClear}
                className="text-xs text-blue-100 hover:text-white underline"
              >
                Clear
              </button>
              <button
                onClick={() => setIsExpanded((v) => !v)}
                className="text-blue-100 hover:text-white p-1"
                aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
              >
                {isExpanded ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75h4.5m-4.5 0v4.5m0-4.5L9 9m11.25-5.25h-4.5m4.5 0v4.5m0-4.5L15 9m-6.75 6.75h-4.5m4.5 0v4.5m0-4.5L3.75 20.25m11.25-5.25h4.5m-4.5 0v4.5m0-4.5l5.25 5.25" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleClose}
                className="text-blue-100 hover:text-white p-1"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {loadingHistory && (
              <p className="text-center text-xs text-gray-400">Loading conversation...</p>
            )}
            {!loadingHistory && messages.length === 0 && (
              <p className="text-center text-sm text-gray-500 mt-8">
                Hi! Ask me things like "how's my week going?" or "suggest a high-protein snack".
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m._id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    isExpanded ? 'max-w-[75%]' : 'max-w-[85%]'
                  } ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap'
                      : 'bg-white text-gray-800 border rounded-bl-sm'
                  }`}
                >
                  {(m.imagePreviewUrl || m.imageDataUrl) && (
                    <img
                      src={m.imagePreviewUrl || m.imageDataUrl}
                      alt="Sent meal photo"
                      className="w-40 h-40 object-cover rounded-xl mb-2"
                    />
                  )}
                  {m.role === 'assistant'
                    ? renderMessageContent(m.content)
                    : !(m.content === '[Photo of a meal]' && (m.imagePreviewUrl || m.imageDataUrl)) && m.content}
                </div>
                {m.role === 'assistant' && typeof m.totalTokens === 'number' && (
                  <p className="text-[11px] text-gray-400 mt-0.5 px-1">{m.totalTokens} tokens</p>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-400 border px-3 py-2 rounded-2xl rounded-bl-sm text-sm">
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-3 py-1.5 text-xs text-red-600 bg-red-50 border-t border-red-100 shrink-0">
              {error}
            </div>
          )}

          {imagePreviewUrl && (
            <div className="px-3 pt-2 border-t bg-white shrink-0 flex items-center gap-2">
              <img src={imagePreviewUrl} alt="Selected meal" className="w-12 h-12 rounded-lg object-cover border" />
              <p className="text-xs text-gray-500 flex-1">Photo attached — add a caption or just send</p>
              <button
                type="button"
                onClick={() => clearSelectedImage()}
                className="text-xs text-gray-400 hover:text-red-600"
                aria-label="Remove photo"
              >
                Remove
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className={`p-2 flex items-center gap-2 bg-white shrink-0 ${imagePreviewUrl ? '' : 'border-t'}`}>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending || usage?.tokensRemaining === 0}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors touch-manipulation shrink-0"
              aria-label="Attach a meal photo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={1}
              placeholder={
                usage?.tokensRemaining === 0
                  ? 'Daily budget used up'
                  : selectedImage
                    ? 'Add a caption (optional)...'
                    : 'Type a message...'
              }
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-2xl resize-none leading-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              disabled={sending || usage?.tokensRemaining === 0}
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowModelMenu((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-2 transition-colors"
              >
                {modelOptions.find((m) => m.id === selectedModel)?.label || 'Auto'}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showModelMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowModelMenu(false)} />
                  <div className="absolute right-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border py-1 z-20 text-gray-800">
                    {modelOptions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModelChange(m.id)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                          m.id === selectedModel ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {m.label}
                          {m.id === selectedModel && <span className="text-blue-600">✓</span>}
                        </p>
                        <p className="text-xs text-gray-500">{m.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || (!input.trim() && !selectedImage) || usage?.tokensRemaining === 0}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors touch-manipulation shrink-0"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.94 2.94a1.5 1.5 0 011.66-.32l12.5 5.5a1.5 1.5 0 010 2.76l-12.5 5.5a1.5 1.5 0 01-2.08-1.74L3.9 10 2.52 4.66a1.5 1.5 0 01.42-1.72z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
