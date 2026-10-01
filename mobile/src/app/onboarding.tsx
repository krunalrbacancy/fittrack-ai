import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { ActivityLevel, GoalType, TrainingLevel } from '@/types';
import { userAPI } from '@/utils/api';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: 'sedentary', label: 'Not very active', hint: 'Little or no exercise, desk job' },
  { value: 'light', label: 'Lightly active', hint: 'Light exercise 1-3 days a week' },
  { value: 'moderate', label: 'Moderately active', hint: 'Moderate exercise 3-5 days a week' },
  { value: 'active', label: 'Very active', hint: 'Hard exercise 6-7 days a week' },
  { value: 'veryActive', label: 'Extremely active', hint: 'Physical job or training twice a day' },
];

const TRAINING_LEVEL_OPTIONS: { value: TrainingLevel; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'New to structured training, or just getting started' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Training regularly for a while, comfortable with the basics' },
  { value: 'advanced', label: 'Advanced', hint: 'Serious, consistent strength training experience' },
];

const GOAL_OPTIONS: { value: GoalType; label: string; hint: string; icon: string }[] = [
  { value: 'lose', label: 'Lose weight', hint: 'Eat a bit less than you burn', icon: '📉' },
  { value: 'maintain', label: 'Stay the same', hint: 'Match what you eat to what you burn', icon: '⚖️' },
  { value: 'gain', label: 'Build muscle', hint: 'Eat a bit more to support growth', icon: '📈' },
];

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetWaist, setTargetWaist] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel | ''>('');
  const [goalType, setGoalType] = useState<GoalType | ''>('');

  const canContinueFromStep1 = !!(gender && age && height && currentWeight);
  const canContinueFromStep2 = !!activityLevel;
  const canContinueFromStep3 = !!trainingLevel;
  const canContinueFromStep4 = !!goalType;

  const handleNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const updatedUser = await userAPI.completeOnboarding({
        age: Number(age),
        gender: gender as 'male' | 'female',
        height: Number(height),
        currentWeight: Number(currentWeight),
        targetWeight: targetWeight ? Number(targetWeight) : null,
        targetWaist: targetWaist ? Number(targetWaist) : null,
        activityLevel: activityLevel as ActivityLevel,
        trainingLevel: trainingLevel as TrainingLevel,
        goalType: goalType as GoalType,
      });
      await updateUser(updatedUser);
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const PillButton = ({
    selected,
    onPress,
    label,
    hint,
    icon,
  }: {
    selected: boolean;
    onPress: () => void;
    label: string;
    hint: string;
    icon?: string;
  }) => (
    <Pressable
      onPress={onPress}
      className={`w-full flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
        selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
      }`}
    >
      {!!icon && <Text className="text-2xl">{icon}</Text>}
      <View className="flex-1">
        <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>{label}</Text>
        <Text className={`mt-0.5 text-xs ${selected ? 'text-blue-100' : 'text-gray-500'}`}>{hint}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
      >
        <View className="gap-6 rounded-2xl bg-white p-6 shadow-xl">
          <View>
            <Text className="text-center text-2xl font-extrabold text-gray-900">
              Let&apos;s set up your plan
            </Text>
            <Text className="mt-1 text-center text-sm text-gray-600">
              A few quick questions so we can suggest calorie and nutrition targets for you.
            </Text>
            <View className="mt-4 flex-row gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </View>
          </View>

          {!!error && (
            <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          {step === 1 && (
            <View className="gap-4">
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Gender</Text>
                <View className="flex-row gap-3">
                  {(['male', 'female'] as const).map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGender(g)}
                      className={`flex-1 items-center rounded-xl border py-3 ${
                        gender === g ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium capitalize ${gender === g ? 'text-white' : 'text-gray-700'}`}
                      >
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700">Age</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                    placeholder="Years"
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700">Height (cm)</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={height}
                    onChangeText={setHeight}
                    placeholder="cm"
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
              </View>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Current weight (kg)</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  placeholder="kg"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="gap-3">
              <Text className="mb-1 text-sm font-medium text-gray-700">How active are you day-to-day?</Text>
              {ACTIVITY_OPTIONS.map((opt) => (
                <PillButton
                  key={opt.value}
                  selected={activityLevel === opt.value}
                  onPress={() => setActivityLevel(opt.value)}
                  label={opt.label}
                  hint={opt.hint}
                />
              ))}
            </View>
          )}

          {step === 3 && (
            <View className="gap-3">
              <View>
                <Text className="mb-1 text-sm font-medium text-gray-700">What&apos;s your training experience?</Text>
                <Text className="mb-2 text-xs text-gray-500">
                  This helps set a protein target that fits your training.
                </Text>
              </View>
              {TRAINING_LEVEL_OPTIONS.map((opt) => (
                <PillButton
                  key={opt.value}
                  selected={trainingLevel === opt.value}
                  onPress={() => setTrainingLevel(opt.value)}
                  label={opt.label}
                  hint={opt.hint}
                />
              ))}
            </View>
          )}

          {step === 4 && (
            <View className="gap-3">
              <Text className="mb-1 text-sm font-medium text-gray-700">What&apos;s your main goal?</Text>
              {GOAL_OPTIONS.map((opt) => (
                <PillButton
                  key={opt.value}
                  selected={goalType === opt.value}
                  onPress={() => setGoalType(opt.value)}
                  label={opt.label}
                  hint={opt.hint}
                  icon={opt.icon}
                />
              ))}
            </View>
          )}

          {step === 5 && (
            <View className="gap-4">
              <Text className="text-sm text-gray-600">
                Optional: set target numbers to track your progress. You can skip these and add them later in your
                Profile.
              </Text>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Target weight (kg)</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  placeholder="Optional"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Target waist (cm)</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={targetWaist}
                  onChangeText={setTargetWaist}
                  placeholder="Optional"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                />
              </View>
            </View>
          )}

          <View className="flex-row gap-3">
            {step > 1 && (
              <Pressable
                onPress={handleBack}
                disabled={loading}
                className="flex-1 items-center rounded-xl border border-gray-300 py-3 disabled:opacity-50"
              >
                <Text className="font-medium text-gray-700">Back</Text>
              </Pressable>
            )}
            {step < TOTAL_STEPS ? (
              <Pressable
                onPress={handleNext}
                disabled={
                  (step === 1 && !canContinueFromStep1) ||
                  (step === 2 && !canContinueFromStep2) ||
                  (step === 3 && !canContinueFromStep3) ||
                  (step === 4 && !canContinueFromStep4)
                }
                className="flex-1 items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50"
              >
                <Text className="font-medium text-white">Continue</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className="flex-1 items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50"
              >
                <Text className="font-medium text-white">{loading ? 'Setting up...' : 'Finish'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
