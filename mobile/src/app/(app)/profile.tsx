import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { TrainingLevel } from '@/types';
import { calculateBMI, getBMICategory } from '@/utils/calculations';
import { userAPI } from '@/utils/api';

const TRAINING_LEVEL_OPTIONS: { value: TrainingLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const emptyFormData = () => ({
  name: '',
  age: '',
  height: '',
  currentWeight: '',
  targetWeight: '',
  targetWaist: '',
  goal: 'Reduce Belly Fat',
  trainingLevel: 'beginner' as TrainingLevel,
  dailyCalorieTarget: '2000',
  dailyProteinTarget: '90',
  dailyCarbsTarget: '240',
  dailyFatsTarget: '60',
  dailyFiberTarget: '28',
  fastingCalorieTarget: '1600',
  fastingProteinTarget: '70',
  fastingCarbsTarget: '170',
  fastingFatsTarget: '55',
  fastingFiberTarget: '22',
});

type FormData = ReturnType<typeof emptyFormData>;

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [formData, setFormData] = useState<FormData>(emptyFormData());
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (user) {
      // Syncs editable form state from the user object on load/refresh; the
      // form then diverges from `user` as the person edits fields, so this
      // can't be a derived useMemo value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: user.name || '',
        age: user.age?.toString() || '',
        height: user.height?.toString() || '',
        currentWeight: user.currentWeight?.toString() || '',
        targetWeight: user.targetWeight?.toString() || '',
        targetWaist: user.targetWaist?.toString() || '',
        goal: user.goal || 'Reduce Belly Fat',
        trainingLevel: (user.trainingLevel as TrainingLevel) || 'beginner',
        dailyCalorieTarget: user.dailyCalorieTarget?.toString() || '2000',
        dailyProteinTarget: user.dailyProteinTarget?.toString() || '90',
        dailyCarbsTarget: user.dailyCarbsTarget?.toString() || '240',
        dailyFatsTarget: user.dailyFatsTarget?.toString() || '60',
        dailyFiberTarget: user.dailyFiberTarget?.toString() || '28',
        fastingCalorieTarget: user.fastingCalorieTarget?.toString() || '1600',
        fastingProteinTarget: user.fastingProteinTarget?.toString() || '70',
        fastingCarbsTarget: user.fastingCarbsTarget?.toString() || '170',
        fastingFatsTarget: user.fastingFatsTarget?.toString() || '55',
        fastingFiberTarget: user.fastingFiberTarget?.toString() || '22',
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await updateUser({
        name: formData.name,
        age: formData.age ? Number(formData.age) : null,
        height: formData.height ? Number(formData.height) : null,
        currentWeight: formData.currentWeight ? Number(formData.currentWeight) : null,
        targetWeight: formData.targetWeight ? Number(formData.targetWeight) : null,
        targetWaist: formData.targetWaist ? Number(formData.targetWaist) : null,
        goal: formData.goal,
        trainingLevel: formData.trainingLevel,
        dailyCalorieTarget: Number(formData.dailyCalorieTarget),
        dailyProteinTarget: Number(formData.dailyProteinTarget),
        dailyCarbsTarget: Number(formData.dailyCarbsTarget),
        dailyFatsTarget: Number(formData.dailyFatsTarget),
        dailyFiberTarget: Number(formData.dailyFiberTarget),
        fastingCalorieTarget: Number(formData.fastingCalorieTarget),
        fastingProteinTarget: Number(formData.fastingProteinTarget),
        fastingCarbsTarget: Number(formData.fastingCarbsTarget),
        fastingFatsTarget: Number(formData.fastingFatsTarget),
        fastingFiberTarget: Number(formData.fastingFiberTarget),
      });
      setMessage({ text: 'Profile updated successfully!', success: true });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ text: 'Failed to update profile', success: false });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateTargets = async () => {
    setRecalculating(true);
    setMessage(null);
    try {
      const updatedUser = await userAPI.recalculateTargets(formData.trainingLevel);
      setFormData((prev) => ({
        ...prev,
        trainingLevel: (updatedUser.trainingLevel as TrainingLevel) || prev.trainingLevel,
        dailyCalorieTarget: updatedUser.dailyCalorieTarget?.toString() || prev.dailyCalorieTarget,
        dailyProteinTarget: updatedUser.dailyProteinTarget?.toString() || prev.dailyProteinTarget,
        dailyCarbsTarget: updatedUser.dailyCarbsTarget?.toString() || prev.dailyCarbsTarget,
        dailyFatsTarget: updatedUser.dailyFatsTarget?.toString() || prev.dailyFatsTarget,
        dailyFiberTarget: updatedUser.dailyFiberTarget?.toString() || prev.dailyFiberTarget,
        fastingCalorieTarget: updatedUser.fastingCalorieTarget?.toString() || prev.fastingCalorieTarget,
        fastingProteinTarget: updatedUser.fastingProteinTarget?.toString() || prev.fastingProteinTarget,
        fastingCarbsTarget: updatedUser.fastingCarbsTarget?.toString() || prev.fastingCarbsTarget,
        fastingFatsTarget: updatedUser.fastingFatsTarget?.toString() || prev.fastingFatsTarget,
        fastingFiberTarget: updatedUser.fastingFiberTarget?.toString() || prev.fastingFiberTarget,
      }));
      setMessage({ text: 'Targets recalculated!', success: true });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to recalculate targets:', error);
      setMessage({ text: error.response?.data?.message || 'Failed to recalculate targets', success: false });
    } finally {
      setRecalculating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const bmi = user?.height && user?.currentWeight ? calculateBMI(user.currentWeight, user.height) : 0;

  const field = (key: keyof FormData, label: string, opts: { keyboardType?: 'default' | 'number-pad' | 'decimal-pad'; hint?: string } = {}) => (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        value={formData[key]}
        onChangeText={(text) => setFormData({ ...formData, [key]: text })}
        keyboardType={opts.keyboardType || 'default'}
        className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
      />
      {!!opts.hint && <Text className="mt-1 text-xs text-gray-500">{opts.hint}</Text>}
    </View>
  );

  const summaryItems = [
    { label: 'Name', value: user?.name },
    { label: 'Age', value: user?.age ? `${user.age} years` : undefined },
    { label: 'Height', value: user?.height ? `${user.height} cm` : undefined },
    { label: 'Current Weight', value: user?.currentWeight ? `${user.currentWeight} kg` : undefined },
    { label: 'Target Weight', value: user?.targetWeight ? `${user.targetWeight} kg` : undefined },
    { label: 'Target Waist', value: user?.targetWaist ? `${user.targetWaist} cm` : undefined },
    { label: 'BMI', value: bmi > 0 ? `${bmi} (${getBMICategory(bmi)})` : undefined },
    { label: 'Goal', value: user?.goal || 'Not set' },
  ].filter((item) => item.value);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-gray-900">User Profile</Text>
        <Text className="mb-4 mt-1 text-sm text-gray-600">Manage your profile and goals</Text>

        {!!message && (
          <View className={`mb-4 rounded-xl p-4 ${message.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <Text className={`text-sm ${message.success ? 'text-green-700' : 'text-red-700'}`}>{message.text}</Text>
          </View>
        )}

        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-900">Profile Summary</Text>
          <View className="flex-row flex-wrap gap-4">
            {summaryItems.map((item) => (
              <View key={item.label} className="min-w-[40%] flex-1">
                <Text className="text-xs text-gray-500">{item.label}</Text>
                <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="rounded-xl bg-white p-4 shadow-sm">
          {field('name', 'Name')}
          {field('age', 'Age', { keyboardType: 'number-pad' })}
          {field('height', 'Height (cm)', { keyboardType: 'decimal-pad' })}
          {field('currentWeight', 'Current Weight (kg)', { keyboardType: 'decimal-pad' })}
          {field('targetWeight', 'Target Weight (kg)', { keyboardType: 'decimal-pad' })}
          {field('targetWaist', 'Target Waist (cm)', { keyboardType: 'decimal-pad' })}
          {field('goal', 'Goal')}

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Training Level</Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 rounded-xl border border-gray-300">
                <Picker
                  selectedValue={formData.trainingLevel}
                  onValueChange={(value) => setFormData({ ...formData, trainingLevel: value as TrainingLevel })}
                >
                  {TRAINING_LEVEL_OPTIONS.map((opt) => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
              <Pressable
                onPress={handleRecalculateTargets}
                disabled={recalculating}
                className="rounded-xl bg-blue-50 px-4 py-3 disabled:opacity-50"
              >
                <Text className="text-sm font-medium text-blue-600">
                  {recalculating ? 'Updating...' : 'Recalculate'}
                </Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-xs text-gray-500">
              Changes your protein target based on training experience (Beginner 1.0g/kg, Intermediate 1.4g/kg,
              Advanced 1.8g/kg).
            </Text>
          </View>

          {field('dailyCalorieTarget', 'Daily Calorie Target', { keyboardType: 'number-pad' })}
          {field('dailyProteinTarget', 'Daily Protein Target (g)', { keyboardType: 'decimal-pad' })}
          {field('dailyCarbsTarget', 'Daily Carbs Target (g)', { keyboardType: 'decimal-pad' })}
          {field('dailyFatsTarget', 'Daily Fats Target (g)', { keyboardType: 'decimal-pad' })}
          {field('dailyFiberTarget', 'Daily Fiber Target (g)', { keyboardType: 'decimal-pad' })}
          {field('fastingCalorieTarget', 'Fasting Calorie Target', {
            keyboardType: 'number-pad',
            hint: 'Calories allowed on fasting days',
          })}
          {field('fastingProteinTarget', 'Fasting Protein Target (g)', {
            keyboardType: 'decimal-pad',
            hint: 'Protein target on fasting days',
          })}
          {field('fastingCarbsTarget', 'Fasting Carbs Target (g)', {
            keyboardType: 'decimal-pad',
            hint: 'Carbs target on fasting days',
          })}
          {field('fastingFatsTarget', 'Fasting Fats Target (g)', {
            keyboardType: 'decimal-pad',
            hint: 'Fats target on fasting days',
          })}
          {field('fastingFiberTarget', 'Fasting Fiber Target (g)', {
            keyboardType: 'decimal-pad',
            hint: 'Fiber target on fasting days',
          })}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="mt-2 items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50"
          >
            <Text className="text-base font-medium text-white">{loading ? 'Saving...' : 'Save Profile'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleLogout} className="mt-6 items-center rounded-xl bg-red-500 py-3 active:bg-red-600">
          <Text className="text-base font-medium text-white">Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
