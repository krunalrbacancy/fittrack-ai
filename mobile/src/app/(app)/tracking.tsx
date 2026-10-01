import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';

import { useAuth } from '@/context/AuthContext';
import { StepsLog, WaistLog, WeightLog, WorkoutLog } from '@/types';
import { stepsAPI, waistAPI, weightAPI, workoutAPI } from '@/utils/api';
import { calculateBMI, formatDate, getBMICategory, getTodayDate } from '@/utils/calculations';

type TabType = 'weight' | 'waist' | 'workout' | 'steps';
type TrackingItem = WeightLog | WaistLog | WorkoutLog | StepsLog;

const TABS: { id: TabType; label: string; icon: string; color: string }[] = [
  { id: 'weight', label: 'Weight', icon: '⚖️', color: '#2563eb' },
  { id: 'waist', label: 'Waist', icon: '📏', color: '#16a34a' },
  { id: 'workout', label: 'Workout', icon: '💪', color: '#ea580c' },
  { id: 'steps', label: 'Steps', icon: '👣', color: '#db2777' },
];

export default function Tracking() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('weight');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);

  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [waistLogs, setWaistLogs] = useState<WaistLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [stepsLogs, setStepsLogs] = useState<StepsLog[]>([]);

  const [weightForm, setWeightForm] = useState({ weight: '', date: getTodayDate(), notes: '' });
  const [waistForm, setWaistForm] = useState({ waist: '', date: getTodayDate(), notes: '' });
  const [workoutForm, setWorkoutForm] = useState({ date: getTodayDate(), workoutType: '', duration: '', notes: '' });
  const [stepsForm, setStepsForm] = useState({ steps: '', date: getTodayDate(), notes: '' });

  const [editingWeight, setEditingWeight] = useState<WeightLog | null>(null);
  const [editingWaist, setEditingWaist] = useState<WaistLog | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);
  const [editingSteps, setEditingSteps] = useState<StepsLog | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [weightsData, waistData, workoutData, stepsData] = await Promise.all([
        weightAPI.getAll(30),
        waistAPI.getAll(30),
        workoutAPI.getAll(30),
        stepsAPI.getAll(30),
      ]);
      setWeights(weightsData);
      setWaistLogs(waistData);
      setWorkoutLogs(workoutData);
      setStepsLogs(stepsData);
    } catch (error) {
      console.error('Failed to load tracking data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllData();
  }, [loadAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
    } finally {
      setRefreshing(false);
    }
  };

  const resetForms = () => {
    setWeightForm({ weight: '', date: getTodayDate(), notes: '' });
    setWaistForm({ waist: '', date: getTodayDate(), notes: '' });
    setWorkoutForm({ date: getTodayDate(), workoutType: '', duration: '', notes: '' });
    setStepsForm({ steps: '', date: getTodayDate(), notes: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWeight(null);
    setEditingWaist(null);
    setEditingWorkout(null);
    setEditingSteps(null);
    resetForms();
  };

  const openModal = () => setShowModal(true);

  const handleWeightSubmit = async () => {
    if (submitting || !weightForm.weight) return;
    setSubmitting(true);
    try {
      if (editingWeight) {
        await weightAPI.update(editingWeight._id, { ...weightForm, weight: Number(weightForm.weight) });
      } else {
        await weightAPI.create({ ...weightForm, weight: Number(weightForm.weight) } as any);
        if (formatDate(weightForm.date) === getTodayDate()) {
          await updateUser({ currentWeight: Number(weightForm.weight) });
        }
      }
      closeModal();
      await loadAllData();
    } catch (error) {
      console.error('Failed to save weight:', error);
      Alert.alert('Error', 'Failed to save weight entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaistSubmit = async () => {
    if (submitting || !waistForm.waist) return;
    setSubmitting(true);
    try {
      if (editingWaist) {
        await waistAPI.update(editingWaist._id, { ...waistForm, waist: Number(waistForm.waist) });
      } else {
        await waistAPI.create({ ...waistForm, waist: Number(waistForm.waist) });
      }
      closeModal();
      await loadAllData();
    } catch (error) {
      console.error('Failed to save waist:', error);
      Alert.alert('Error', 'Failed to save waist entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkoutSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...workoutForm, duration: workoutForm.duration ? Number(workoutForm.duration) : 0 };
      if (editingWorkout) {
        await workoutAPI.update(editingWorkout._id, payload);
      } else {
        await workoutAPI.create(payload);
      }
      closeModal();
      await loadAllData();
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStepsSubmit = async () => {
    if (submitting || !stepsForm.steps) return;
    setSubmitting(true);
    try {
      const payload = { ...stepsForm, steps: Number(stepsForm.steps) };
      if (editingSteps) {
        await stepsAPI.update(editingSteps._id, payload);
      } else {
        await stepsAPI.create(payload);
      }
      closeModal();
      await loadAllData();
    } catch (error) {
      console.error('Failed to save steps:', error);
      Alert.alert('Error', 'Failed to save steps entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (type: TabType, item: TrackingItem) => {
    if (type === 'weight') {
      const w = item as WeightLog;
      setEditingWeight(w);
      setWeightForm({ weight: w.weight.toString(), date: formatDate(w.date), notes: w.notes || '' });
    } else if (type === 'waist') {
      const w = item as WaistLog;
      setEditingWaist(w);
      setWaistForm({ waist: w.waist.toString(), date: formatDate(w.date), notes: w.notes || '' });
    } else if (type === 'workout') {
      const w = item as WorkoutLog;
      setEditingWorkout(w);
      setWorkoutForm({
        date: formatDate(w.date),
        workoutType: w.workoutType || '',
        duration: w.duration?.toString() || '',
        notes: w.notes || '',
      });
    } else {
      const s = item as StepsLog;
      setEditingSteps(s);
      setStepsForm({ steps: s.steps.toString(), date: formatDate(s.date), notes: s.notes || '' });
    }
    setShowModal(true);
  };

  const handleDelete = (type: TabType, id: string) => {
    Alert.alert('Delete entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            if (type === 'weight') await weightAPI.delete(id);
            else if (type === 'waist') await waistAPI.delete(id);
            else if (type === 'workout') await workoutAPI.delete(id);
            else await stepsAPI.delete(id);
            await loadAllData();
          } catch (error) {
            console.error('Failed to delete entry:', error);
            Alert.alert('Error', 'Failed to delete entry');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const currentWeight = weights.length > 0 ? weights[0]?.weight : user?.currentWeight || 0;
  const targetWeight = user?.targetWeight || 0;
  const height = user?.height || 0;
  const bmi = calculateBMI(currentWeight, height);
  const weightDifference = currentWeight - targetWeight;
  const currentWaist = waistLogs.length > 0 ? waistLogs[0]?.waist : 0;
  const targetWaist = user?.targetWaist || 0;
  const waistDifference = currentWaist - targetWaist;
  const workoutDays = new Set(workoutLogs.map((log) => new Date(log.date).toISOString().split('T')[0])).size;
  const avgSteps =
    stepsLogs.length > 0 ? Math.round(stepsLogs.reduce((sum, log) => sum + log.steps, 0) / stepsLogs.length) : 0;

  const weightChartData = useMemo(
    () =>
      weights
        .slice()
        .reverse()
        .map((w) => ({ value: w.weight, label: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })),
    [weights]
  );
  const waistChartData = useMemo(
    () =>
      waistLogs
        .slice()
        .reverse()
        .map((w) => ({ value: w.waist, label: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })),
    [waistLogs]
  );
  const stepsChartData = useMemo(
    () =>
      stepsLogs
        .slice()
        .reverse()
        .map((s) => ({ value: s.steps, label: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })),
    [stepsLogs]
  );

  const getCurrentData = (): TrackingItem[] => {
    switch (activeTab) {
      case 'weight':
        return weights;
      case 'waist':
        return waistLogs;
      case 'workout':
        return workoutLogs;
      case 'steps':
        return stepsLogs;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const currentData = getCurrentData();
  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text className="mb-1 text-2xl font-bold text-gray-900">Tracking</Text>
        <Text className="mb-4 text-sm text-gray-600">Track your weight, waist, workouts, and steps</Text>

        <View className="mb-4 flex-row gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                closeModal();
              }}
              className="flex-1 items-center rounded-lg py-2.5"
              style={activeTab === tab.id ? { backgroundColor: tab.color } : undefined}
            >
              <Text className="text-base">{tab.icon}</Text>
              <Text className={`mt-0.5 text-xs font-medium ${activeTab === tab.id ? 'text-white' : 'text-gray-600'}`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={openModal} className="mb-4 items-center rounded-xl bg-blue-600 py-3">
          <Text className="text-base font-medium text-white">Add {activeTabMeta.label} Entry</Text>
        </Pressable>

        {activeTab === 'weight' && (
          <View className="mb-4 flex-row flex-wrap gap-3">
            {[
              { label: 'Current Weight', value: currentWeight > 0 ? `${currentWeight} kg` : 'N/A' },
              { label: 'Target Weight', value: targetWeight > 0 ? `${targetWeight} kg` : 'N/A' },
              {
                label: 'Difference',
                value:
                  targetWeight > 0 && currentWeight > 0
                    ? `${weightDifference > 0 ? '+' : ''}${weightDifference.toFixed(1)} kg`
                    : 'N/A',
                color: weightDifference > 0 ? '#dc2626' : weightDifference < 0 ? '#16a34a' : undefined,
              },
              { label: 'BMI', value: bmi > 0 ? `${bmi} (${getBMICategory(bmi)})` : 'N/A' },
            ].map((stat) => (
              <View key={stat.label} className="min-w-[45%] flex-1 rounded-xl border border-gray-200 bg-white p-4">
                <Text className="text-xs font-medium text-gray-500">{stat.label}</Text>
                <Text className="mt-1 text-xl font-semibold" style={stat.color ? { color: stat.color } : { color: '#111827' }}>
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'waist' && (
          <View className="mb-4 flex-row flex-wrap gap-3">
            {[
              { label: 'Current Waist', value: currentWaist > 0 ? `${currentWaist} cm` : 'N/A' },
              { label: 'Target Waist', value: targetWaist > 0 ? `${targetWaist} cm` : 'N/A' },
              {
                label: 'Difference',
                value:
                  targetWaist > 0 && currentWaist > 0
                    ? `${waistDifference > 0 ? '+' : ''}${waistDifference.toFixed(1)} cm`
                    : 'N/A',
                color: waistDifference > 0 ? '#dc2626' : waistDifference < 0 ? '#16a34a' : undefined,
              },
            ].map((stat) => (
              <View key={stat.label} className="min-w-[45%] flex-1 rounded-xl border border-gray-200 bg-white p-4">
                <Text className="text-xs font-medium text-gray-500">{stat.label}</Text>
                <Text className="mt-1 text-xl font-semibold" style={stat.color ? { color: stat.color } : { color: '#111827' }}>
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'workout' && (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-xs font-medium text-gray-500">Total Workout Days</Text>
            <Text className="mt-1 text-xl font-semibold text-gray-900">
              {workoutDays} {workoutDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

        {activeTab === 'steps' && (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-xs font-medium text-gray-500">Average Steps</Text>
            <Text className="mt-1 text-xl font-semibold text-gray-900">
              {avgSteps > 0 ? avgSteps.toLocaleString() : 'N/A'}
            </Text>
          </View>
        )}

        {activeTab === 'weight' && weightChartData.length > 0 && (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="mb-4 text-base font-semibold text-gray-900">Weight Progress</Text>
            <LineChart
              data={weightChartData}
              color="#3b82f6"
              thickness={2}
              dataPointsRadius={3}
              height={220}
              noOfSections={4}
              yAxisTextStyle={{ fontSize: 10, color: '#6b7280' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#6b7280' }}
              spacing={40}
              initialSpacing={16}
            />
          </View>
        )}
        {activeTab === 'waist' && waistChartData.length > 0 && (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="mb-4 text-base font-semibold text-gray-900">Waist Progress</Text>
            <LineChart
              data={waistChartData}
              color="#10b981"
              thickness={2}
              dataPointsRadius={3}
              height={220}
              noOfSections={4}
              yAxisTextStyle={{ fontSize: 10, color: '#6b7280' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#6b7280' }}
              spacing={40}
              initialSpacing={16}
            />
          </View>
        )}
        {activeTab === 'steps' && stepsChartData.length > 0 && (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <Text className="mb-4 text-base font-semibold text-gray-900">Steps Progress</Text>
            <LineChart
              data={stepsChartData}
              color="#ec4899"
              thickness={2}
              dataPointsRadius={3}
              height={220}
              noOfSections={4}
              yAxisTextStyle={{ fontSize: 10, color: '#6b7280' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#6b7280' }}
              spacing={40}
              initialSpacing={16}
            />
          </View>
        )}

        {currentData.length === 0 ? (
          <View className="items-center rounded-xl border border-gray-200 bg-white p-8">
            <Text className="text-gray-500">No entries yet. Add one to get started!</Text>
          </View>
        ) : (
          <View className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {currentData.map((item) => (
              <View key={item._id} className="flex-row items-center justify-between gap-3 px-4 py-4">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {activeTab === 'weight' && `${(item as WeightLog).weight} kg`}
                    {activeTab === 'waist' && `${(item as WaistLog).waist} cm`}
                    {activeTab === 'workout' &&
                      `${(item as WorkoutLog).workoutType || 'Workout'}${
                        (item as WorkoutLog).duration ? ` (${(item as WorkoutLog).duration} min)` : ''
                      }`}
                    {activeTab === 'steps' && `${(item as StepsLog).steps.toLocaleString()} steps`}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap gap-x-3">
                    <Text className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</Text>
                    {!!item.notes && <Text className="text-sm text-gray-500">Notes: {item.notes}</Text>}
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Pressable onPress={() => handleEdit(activeTab, item)} className="rounded-lg px-3 py-1.5">
                    <Text className="text-sm font-medium text-blue-600">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(activeTab, item._id)}
                    disabled={deletingId === item._id}
                    className="rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    <Text className="text-sm font-medium text-red-600">
                      {deletingId === item._id ? 'Deleting...' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-white px-5 pb-8 pt-6">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-gray-900">
                {activeTab === 'weight' && (editingWeight ? 'Edit Weight Entry' : 'Add Weight Entry')}
                {activeTab === 'waist' && (editingWaist ? 'Edit Waist Entry' : 'Add Waist Entry')}
                {activeTab === 'workout' && (editingWorkout ? 'Edit Workout Entry' : 'Add Workout Entry')}
                {activeTab === 'steps' && (editingSteps ? 'Edit Steps Entry' : 'Add Steps Entry')}
              </Text>
              <Pressable onPress={closeModal}>
                <Text className="text-2xl text-gray-400">×</Text>
              </Pressable>
            </View>

            {activeTab === 'weight' && (
              <View className="gap-4">
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Weight (kg)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={weightForm.weight}
                    onChangeText={(text) => setWeightForm({ ...weightForm, weight: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <DateField
                  label="Date"
                  value={weightForm.date}
                  onChange={(date) => setWeightForm({ ...weightForm, date })}
                  show={showFormDatePicker}
                  setShow={setShowFormDatePicker}
                />
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Notes (optional)</Text>
                  <TextInput
                    value={weightForm.notes}
                    onChangeText={(text) => setWeightForm({ ...weightForm, notes: text })}
                    multiline
                    numberOfLines={3}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <ModalActions
                  submitting={submitting}
                  onCancel={closeModal}
                  onSubmit={handleWeightSubmit}
                  label={editingWeight ? 'Update' : 'Add'}
                />
              </View>
            )}

            {activeTab === 'waist' && (
              <View className="gap-4">
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Waist (cm)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={waistForm.waist}
                    onChangeText={(text) => setWaistForm({ ...waistForm, waist: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <DateField
                  label="Date"
                  value={waistForm.date}
                  onChange={(date) => setWaistForm({ ...waistForm, date })}
                  show={showFormDatePicker}
                  setShow={setShowFormDatePicker}
                />
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Notes (optional)</Text>
                  <TextInput
                    value={waistForm.notes}
                    onChangeText={(text) => setWaistForm({ ...waistForm, notes: text })}
                    multiline
                    numberOfLines={3}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <ModalActions
                  submitting={submitting}
                  onCancel={closeModal}
                  onSubmit={handleWaistSubmit}
                  label={editingWaist ? 'Update' : 'Add'}
                />
              </View>
            )}

            {activeTab === 'workout' && (
              <View className="gap-4">
                <DateField
                  label="Date"
                  value={workoutForm.date}
                  onChange={(date) => setWorkoutForm({ ...workoutForm, date })}
                  show={showFormDatePicker}
                  setShow={setShowFormDatePicker}
                />
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Workout Type (optional)</Text>
                  <TextInput
                    value={workoutForm.workoutType}
                    onChangeText={(text) => setWorkoutForm({ ...workoutForm, workoutType: text })}
                    placeholder="e.g., Cardio, Strength Training, Yoga"
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Duration (minutes, optional)</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={workoutForm.duration}
                    onChangeText={(text) => setWorkoutForm({ ...workoutForm, duration: text })}
                    placeholder="e.g., 30"
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Notes (optional)</Text>
                  <TextInput
                    value={workoutForm.notes}
                    onChangeText={(text) => setWorkoutForm({ ...workoutForm, notes: text })}
                    multiline
                    numberOfLines={3}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <ModalActions
                  submitting={submitting}
                  onCancel={closeModal}
                  onSubmit={handleWorkoutSubmit}
                  label={editingWorkout ? 'Update' : 'Add'}
                />
              </View>
            )}

            {activeTab === 'steps' && (
              <View className="gap-4">
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Steps</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={stepsForm.steps}
                    onChangeText={(text) => setStepsForm({ ...stepsForm, steps: text })}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <DateField
                  label="Date"
                  value={stepsForm.date}
                  onChange={(date) => setStepsForm({ ...stepsForm, date })}
                  show={showFormDatePicker}
                  setShow={setShowFormDatePicker}
                />
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-700">Notes (optional)</Text>
                  <TextInput
                    value={stepsForm.notes}
                    onChangeText={(text) => setStepsForm({ ...stepsForm, notes: text })}
                    multiline
                    numberOfLines={3}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900"
                  />
                </View>
                <ModalActions
                  submitting={submitting}
                  onCancel={closeModal}
                  onSubmit={handleStepsSubmit}
                  label={editingSteps ? 'Update' : 'Add'}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DateField({
  label,
  value,
  onChange,
  show,
  setShow,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  show: boolean;
  setShow: (show: boolean) => void;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <Pressable onPress={() => setShow(true)} className="rounded-xl border border-gray-300 px-4 py-3">
        <Text className="text-base text-gray-900">{value}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={new Date(value)}
          mode="date"
          onChange={(event, date) => {
            setShow(Platform.OS === 'ios');
            if (event.type === 'set' && date) {
              onChange(date.toISOString().split('T')[0]);
            } else {
              setShow(false);
            }
          }}
        />
      )}
    </View>
  );
}

function ModalActions({
  submitting,
  onCancel,
  onSubmit,
  label,
}: {
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  label: string;
}) {
  return (
    <View className="flex-row gap-3 pt-2">
      <Pressable onPress={onSubmit} disabled={submitting} className="flex-1 items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50">
        <Text className="font-medium text-white">{submitting ? 'Saving...' : label}</Text>
      </Pressable>
      <Pressable onPress={onCancel} className="flex-1 items-center rounded-xl bg-gray-200 py-3">
        <Text className="font-medium text-gray-700">Cancel</Text>
      </Pressable>
    </View>
  );
}
