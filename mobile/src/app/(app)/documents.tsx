import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { documentsAPI, DocumentItem, DocumentSource } from '@/utils/api';

interface QAExchange {
  question: string;
  answer: string;
  sources: DocumentSource[];
}

const STATUS_COLOR: Record<DocumentItem['status'], string> = {
  ready: '#16a34a',
  failed: '#dc2626',
  processing: '#ca8a04',
};

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [exchanges, setExchanges] = useState<QAExchange[]>([]);
  const [askError, setAskError] = useState('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const docs = await documentsAPI.list();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain' });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadError('');
    setUploading(true);
    try {
      await documentsAPI.upload({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'text/plain' });
      await loadDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
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

  const handleAsk = async () => {
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

  const toggleSources = (index: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const readyDocCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-gray-900">Documents Q&amp;A</Text>
        <Text className="mb-4 mt-1 text-sm text-gray-600">
          Upload your own text documents (diet plans, doctor&apos;s notes, articles) and ask questions — answers are
          grounded strictly in what you&apos;ve uploaded.
        </Text>

        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 font-semibold text-gray-900">Upload a document</Text>
          <Pressable
            onPress={handlePickDocument}
            disabled={uploading}
            className="items-center rounded-xl bg-blue-50 px-4 py-3 disabled:opacity-50"
          >
            <Text className="text-sm font-medium text-blue-700">
              {uploading ? 'Processing…' : 'Choose a .txt file'}
            </Text>
          </Pressable>
          <Text className="mt-2 text-xs text-gray-400">Plain text (.txt) files only, up to 2MB, for now.</Text>
          {!!uploadError && (
            <View className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <Text className="text-sm text-red-700">{uploadError}</Text>
            </View>
          )}
        </View>

        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 font-semibold text-gray-900">Your documents</Text>
          {loadingDocs ? (
            <ActivityIndicator color="#2563eb" />
          ) : documents.length === 0 ? (
            <Text className="text-sm text-gray-500">No documents uploaded yet.</Text>
          ) : (
            <View className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <View key={doc._id} className="flex-row items-center justify-between gap-3 py-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                      {doc.filename}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''} · {(doc.sizeBytes / 1024).toFixed(1)} KB
                      {' · '}
                      <Text style={{ color: STATUS_COLOR[doc.status] }}>{doc.status}</Text>
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDelete(doc._id)}>
                    <Text className="text-xs font-medium text-red-600">Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 font-semibold text-gray-900">Ask a question</Text>

          {readyDocCount === 0 ? (
            <Text className="text-sm text-gray-500">Upload a document above to start asking questions.</Text>
          ) : (
            <>
              <View className="mb-4 gap-4">
                {exchanges.map((ex, i) => (
                  <View key={i} className={i > 0 ? 'gap-2 border-t border-dashed border-gray-200 pt-4' : 'gap-2'}>
                    <Text className="text-xs font-medium text-gray-400">Question {i + 1}</Text>
                    <View className="items-end">
                      <View className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2">
                        <Text className="text-sm text-white">{ex.question}</Text>
                      </View>
                    </View>
                    <View className="items-start">
                      <View className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-50 px-3 py-2">
                        <Text className="text-sm text-gray-900">{ex.answer}</Text>
                        {ex.sources.length > 0 && (
                          <Pressable
                            onPress={() => toggleSources(i)}
                            className="mt-2 border-t border-gray-200 pt-2"
                          >
                            <Text className="text-xs font-medium text-gray-500">
                              Based on {ex.sources.length} excerpt{ex.sources.length !== 1 ? 's' : ''} from your
                              documents (tap to {expandedSources.has(i) ? 'hide' : 'view'})
                            </Text>
                            {expandedSources.has(i) && (
                              <View className="mt-1.5 gap-1">
                                {ex.sources.map((s, j) => (
                                  <Text key={j} className="text-xs text-gray-400">
                                    {s.filename} (chunk {s.chunkIndex + 1}, relevance {s.relevance})
                                  </Text>
                                ))}
                              </View>
                            )}
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                {asking && (
                  <View className="items-start">
                    <View className="rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-50 px-3 py-2">
                      <Text className="text-sm text-gray-400">Thinking…</Text>
                    </View>
                  </View>
                )}
              </View>

              {!!askError && (
                <View className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <Text className="text-sm text-red-700">{askError}</Text>
                </View>
              )}

              <View className="flex-row items-center gap-2">
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask something about your uploaded documents..."
                  editable={!asking}
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm text-gray-900"
                />
                <Pressable
                  onPress={handleAsk}
                  disabled={asking || !question.trim()}
                  className="rounded-full bg-blue-600 px-5 py-2.5 disabled:opacity-40"
                >
                  <Text className="text-sm font-medium text-white">Ask</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
