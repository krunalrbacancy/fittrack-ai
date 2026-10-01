import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatMessage } from '@/types';
import { chatAPI, ChatImageAsset, ChatModelOption, ChatUsage } from '@/utils/api';

// Lightweight renderer for the small subset of markdown Gemini tends to use
// (bold, headers, bullet lists, horizontal rules) — avoids pulling in a full markdown lib.
function renderInline(text: string, baseKey: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${baseKey}-${i}`} className="font-bold">
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={`${baseKey}-${i}`}>{part}</Text>;
  });
}

function renderMessageContent(content: string, textColorClass: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} className="my-1 gap-0.5">
          {listBuffer.map((item, i) => (
            <Text key={i} className={textColorClass}>
              • {renderInline(item, `li-${elements.length}-${i}`)}
            </Text>
          ))}
        </View>
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
        <Text key={idx} className={`mb-1 mt-2 font-semibold ${textColorClass}`}>
          {renderInline(heading, `h-${idx}`)}
        </Text>
      );
      return;
    }

    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<View key={idx} className="my-2 h-px bg-gray-200" />);
      return;
    }

    if (trimmed === '') {
      elements.push(<View key={idx} className="h-2" />);
      return;
    }

    elements.push(
      <Text key={idx} className={`leading-relaxed ${textColorClass}`}>
        {renderInline(line, `p-${idx}`)}
      </Text>
    );
  });

  flushList();
  return elements;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [selectedImage, setSelectedImage] = useState<ChatImageAsset | null>(null);
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const hasLoadedHistory = useRef(false);
  const flatListRef = useRef<FlatList>(null);

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

  const scrollToEnd = () => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage({ uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' });
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is needed to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage({ uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' });
    }
  };

  const handleAttachPhoto = () => {
    Alert.alert('Attach a meal photo', undefined, [
      { text: 'Take Photo', onPress: pickFromCamera },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage) || sending) return;

    setError('');
    const userMessage: ChatMessage = {
      _id: `local-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      imagePreviewUrl: selectedImage?.uri,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setSending(true);
    scrollToEnd();

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
      scrollToEnd();
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

  return (
    <>
      <View pointerEvents="box-none" className="absolute bottom-24 right-4 z-50">
        <Pressable
          onPress={() => setIsOpen(true)}
          className="h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg active:bg-blue-800"
          accessibilityLabel="Open AI coach chat"
        >
          <Text className="text-2xl">🤖</Text>
        </Pressable>
      </View>

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView className="flex-1 bg-gray-50">
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-center justify-between gap-2 bg-blue-600 px-4 py-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">FitTrack AI Coach</Text>
                {usage ? (
                  <Text className="text-xs text-blue-100" numberOfLines={1}>
                    {usage.tokensRemaining.toLocaleString()} of {usage.dailyBudget.toLocaleString()} tokens left today
                  </Text>
                ) : (
                  <Text className="text-xs text-blue-100" numberOfLines={1}>
                    Ask about your progress, diet or workouts
                  </Text>
                )}
              </View>
              <Pressable onPress={handleClear}>
                <Text className="text-xs text-blue-100 underline">Clear</Text>
              </Pressable>
              <Pressable onPress={() => setIsOpen(false)} className="p-1" accessibilityLabel="Close chat">
                <Ionicons name="close" size={22} color="white" />
              </Pressable>
            </View>

            <FlatList
              ref={flatListRef}
              className="flex-1 bg-gray-50"
              contentContainerStyle={{ padding: 12, gap: 12 }}
              data={messages}
              keyExtractor={(item) => item._id}
              onContentSizeChange={scrollToEnd}
              ListEmptyComponent={
                loadingHistory ? (
                  <Text className="mt-8 text-center text-xs text-gray-400">Loading conversation...</Text>
                ) : (
                  <Text className="mt-8 text-center text-sm text-gray-500">
                    Hi! Ask me things like &quot;how&apos;s my week going?&quot; or &quot;suggest a high-protein
                    snack&quot;.
                  </Text>
                )
              }
              renderItem={({ item: m }) => {
                const isUser = m.role === 'user';
                const imageUri = m.imagePreviewUrl || m.imageDataUrl;
                const textColorClass = isUser ? 'text-white' : 'text-gray-800';
                return (
                  <View className={isUser ? 'items-end' : 'items-start'}>
                    <View
                      className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                        isUser ? 'rounded-br-sm bg-blue-600' : 'rounded-bl-sm border border-gray-200 bg-white'
                      }`}
                    >
                      {!!imageUri && (
                        <Image source={{ uri: imageUri }} className="mb-2 h-40 w-40 rounded-xl" resizeMode="cover" />
                      )}
                      {isUser
                        ? !(m.content === '[Photo of a meal]' && imageUri) && (
                            <Text className="text-sm text-white">{m.content}</Text>
                          )
                        : renderMessageContent(m.content, 'text-sm ' + textColorClass)}
                    </View>
                    {!isUser && typeof m.totalTokens === 'number' && (
                      <Text className="mt-0.5 px-1 text-[11px] text-gray-400">{m.totalTokens} tokens</Text>
                    )}
                  </View>
                );
              }}
              ListFooterComponent={
                sending ? (
                  <View className="items-start">
                    <View className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2">
                      <Text className="text-sm text-gray-400">Typing...</Text>
                    </View>
                  </View>
                ) : null
              }
            />

            {!!error && (
              <View className="border-t border-red-100 bg-red-50 px-3 py-1.5">
                <Text className="text-xs text-red-600">{error}</Text>
              </View>
            )}

            {!!selectedImage && (
              <View className="flex-row items-center gap-2 border-t border-gray-200 bg-white px-3 pt-2">
                <Image source={{ uri: selectedImage.uri }} className="h-12 w-12 rounded-lg" resizeMode="cover" />
                <Text className="flex-1 text-xs text-gray-500">Photo attached — add a caption or just send</Text>
                <Pressable onPress={() => setSelectedImage(null)}>
                  <Text className="text-xs text-gray-400">Remove</Text>
                </Pressable>
              </View>
            )}

            <View className={`flex-row items-center gap-2 bg-white p-2 ${selectedImage ? '' : 'border-t border-gray-200'}`}>
              <Pressable
                onPress={handleAttachPhoto}
                disabled={sending || usage?.tokensRemaining === 0}
                className="h-9 w-9 items-center justify-center rounded-full disabled:opacity-40"
                accessibilityLabel="Attach a meal photo"
              >
                <Ionicons name="camera-outline" size={22} color="#6b7280" />
              </Pressable>
              <TextInput
                value={input}
                onChangeText={setInput}
                multiline
                placeholder={
                  usage?.tokensRemaining === 0
                    ? 'Daily budget used up'
                    : selectedImage
                      ? 'Add a caption (optional)...'
                      : 'Type a message...'
                }
                editable={!sending && usage?.tokensRemaining !== 0}
                className="max-h-28 flex-1 rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <Pressable onPress={() => setShowModelMenu(true)} className="shrink-0 rounded-full bg-gray-100 px-2.5 py-2">
                <Text className="text-xs text-gray-600">
                  {modelOptions.find((m) => m.id === selectedModel)?.label || 'Auto'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSend}
                disabled={sending || (!input.trim() && !selectedImage) || usage?.tokensRemaining === 0}
                className="h-9 w-9 items-center justify-center rounded-full bg-blue-600 disabled:opacity-40"
                accessibilityLabel="Send"
              >
                {sending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={16} color="white" />}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showModelMenu} transparent animationType="fade" onRequestClose={() => setShowModelMenu(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowModelMenu(false)}>
          <View className="rounded-t-2xl bg-white p-2 pb-8">
            {modelOptions.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => handleModelChange(m.id)}
                className={`rounded-xl px-4 py-3 ${m.id === selectedModel ? 'bg-blue-50' : ''}`}
              >
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm font-medium text-gray-900">{m.label}</Text>
                  {m.id === selectedModel && <Text className="text-blue-600">✓</Text>}
                </View>
                <Text className="text-xs text-gray-500">{m.description}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
