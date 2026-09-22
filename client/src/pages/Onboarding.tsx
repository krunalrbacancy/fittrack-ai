import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import { ActivityLevel, GoalType, TrainingLevel } from '../types';

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

export const Onboarding: React.FC = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
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

  const canContinueFromStep1 = gender && age && height && currentWeight;
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
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8 safe-area-inset">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center">Let's set up your plan</h2>
          <p className="mt-1 text-sm text-gray-600 text-center">
            A few quick questions so we can suggest calorie and nutrition targets for you.
          </p>
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <div className="grid grid-cols-2 gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-3 rounded-xl border text-sm font-medium capitalize transition-colors ${
                      gender === g
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Years"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="cm"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current weight (kg)</label>
              <input
                type="number"
                min="20"
                max="300"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="kg"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">How active are you day-to-day?</label>
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActivityLevel(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  activityLevel === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className={`text-xs mt-0.5 ${activityLevel === opt.value ? 'text-blue-100' : 'text-gray-500'}`}>
                  {opt.hint}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">What's your training experience?</label>
            <p className="text-xs text-gray-500 -mt-2 mb-2">This helps set a protein target that fits your training.</p>
            {TRAINING_LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTrainingLevel(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  trainingLevel === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className={`text-xs mt-0.5 ${trainingLevel === opt.value ? 'text-blue-100' : 'text-gray-500'}`}>
                  {opt.hint}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">What's your main goal?</label>
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGoalType(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  goalType === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className={`text-xs mt-0.5 ${goalType === opt.value ? 'text-blue-100' : 'text-gray-500'}`}>
                    {opt.hint}
                  </p>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Optional: set target numbers to track your progress. You can skip these and add them later in your Profile.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target weight (kg)</label>
              <input
                type="number"
                min="20"
                max="300"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target waist (cm)</label>
              <input
                type="number"
                min="30"
                max="200"
                step="0.1"
                value={targetWaist}
                onChange={(e) => setTargetWaist(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (step === 1 && !canContinueFromStep1) ||
                (step === 2 && !canContinueFromStep2) ||
                (step === 3 && !canContinueFromStep3) ||
                (step === 4 && !canContinueFromStep4)
              }
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
