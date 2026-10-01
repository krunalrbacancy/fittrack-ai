import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

export default function Landing() {
  const { loginAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      router.replace('/(app)/dashboard');
    } catch (err) {
      console.error('Guest login error:', err);
      setGuestLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <View className="flex-1 items-center justify-center px-6 py-8">
        <View className="w-full max-w-2xl items-center gap-4">
          <Text className="text-center text-5xl font-extrabold text-gray-900">FitTrack AI</Text>
          <Text className="text-center text-lg text-gray-600">
            Track your fitness journey with AI-powered insights
          </Text>
        </View>

        <View className="mt-8 w-full max-w-2xl gap-6 rounded-2xl bg-white p-8 shadow-xl">
          <Text className="text-center text-base text-gray-700">
            Monitor your calories, protein, water intake, and weight progress all in one place.
          </Text>

          <View className="gap-4">
            <Pressable
              onPress={() => router.push('/register')}
              className="items-center rounded-xl bg-blue-600 px-8 py-4 active:bg-blue-800"
            >
              <Text className="text-lg font-semibold text-white">Get Started</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/login')}
              className="items-center rounded-xl border border-blue-200 bg-white px-8 py-4 active:bg-gray-100"
            >
              <Text className="text-lg font-semibold text-blue-600">Sign In</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleGuestLogin} disabled={guestLoading} className="items-center">
            <Text className="text-sm text-gray-500 underline">
              {guestLoading ? 'Loading demo...' : 'Or try as Guest — explore with sample data'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
