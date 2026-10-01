import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordInput } from '@/components/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { isTokenValid } from '@/utils/token';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user, loading: authLoading } = useAuth();

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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(username, password, name);
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      console.error('Register error:', err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Make sure the backend is running.');
      } else if (err.response?.status === 409) {
        setError('That username is already taken.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
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
              Create your account to start tracking
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
                <Text className="mb-2 text-sm font-medium text-gray-700">Name</Text>
                <TextInput
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Username</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Choose a username"
                  value={username}
                  onChangeText={setUsername}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Password</Text>
                <PasswordInput
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Confirm Password</Text>
                <PasswordInput
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
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
                {loading ? 'Creating account...' : 'Sign up'}
              </Text>
            </Pressable>

            <View className="flex-row justify-center">
              <Text className="text-sm text-gray-600">Already have an account? </Text>
              <Link href="/login" className="text-sm font-medium text-blue-600">
                Sign in
              </Link>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
