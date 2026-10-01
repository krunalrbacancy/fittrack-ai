import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordInput } from '@/components/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { isTokenValid } from '@/utils/token';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { login, loginAsGuest, user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!authLoading && (user || (token && isTokenValid(token)))) {
        router.replace('/(app)/dashboard');
      }
    };
    checkAuth();
  }, [user, authLoading]);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Make sure the backend is running.');
      } else if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Invalid credentials');
      } else if (err.response?.status === 500) {
        setError('Server error. Check backend logs and MongoDB connection.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await loginAsGuest();
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      console.error('Guest login error:', err);
      setError('Could not start the guest demo. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-indigo-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <View className="flex-1 justify-center px-6 py-8">
        <View className="gap-6 rounded-2xl bg-white p-6 shadow-xl">
          <View>
            <Text className="text-center text-3xl font-extrabold text-gray-900">FitTrack AI</Text>
            <Text className="mt-2 text-center text-sm text-gray-600">
              Sign in to track your fitness journey
            </Text>
          </View>

          <View className="gap-5">
            {!!error && (
              <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            )}

            <View className="gap-4">
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Username</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter username"
                  value={username}
                  onChangeText={setUsername}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Password</Text>
                <PasswordInput
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="items-center rounded-xl bg-blue-600 py-3 active:bg-blue-800 disabled:opacity-50"
            >
              <Text className="text-base font-medium text-white">
                {loading ? 'Signing in...' : 'Sign in'}
              </Text>
            </Pressable>

            <View className="flex-row justify-center">
              <Text className="text-sm text-gray-600">Don&apos;t have an account? </Text>
              <Link href="/register" className="text-sm font-medium text-blue-600">
                Sign up
              </Link>
            </View>
          </View>

          <View className="gap-4">
            <View className="h-px bg-gray-200" />
            <Pressable
              onPress={handleGuestLogin}
              disabled={guestLoading}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 active:bg-gray-100 disabled:opacity-50"
            >
              <Text className="text-base font-medium text-gray-700">
                {guestLoading ? 'Loading demo...' : '👀 Try as Guest'}
              </Text>
            </Pressable>
            <Text className="text-center text-xs text-gray-500">
              Explore the app and chatbot with sample data. No account needed.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
