import React, { useEffect, useState } from 'react';
import { weightAPI, waistAPI, workoutAPI, stepsAPI } from '../utils/api';
import { WeightLog, WaistLog, WorkoutLog, StepsLog } from '../types';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { calculateBMI, getBMICategory, formatDate, getTodayDate } from '../utils/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabType = 'weight' | 'waist' | 'workout' | 'steps';

export const Tracking: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('weight');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Data states
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [waistLogs, setWaistLogs] = useState<WaistLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [stepsLogs, setStepsLogs] = useState<StepsLog[]>([]);

  // Form states
  const [weightForm, setWeightForm] = useState({ weight: '', date: getTodayDate(), notes: '' });
  const [waistForm, setWaistForm] = useState({ waist: '', date: getTodayDate(), notes: '' });
  const [workoutForm, setWorkoutForm] = useState({ date: getTodayDate(), workoutType: '', duration: '', notes: '' });
  const [stepsForm, setStepsForm] = useState({ steps: '', date: getTodayDate(), notes: '' });

  // Editing states
  const [editingWeight, setEditingWeight] = useState<WeightLog | null>(null);
  const [editingWaist, setEditingWaist] = useState<WaistLog | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);
  const [editingSteps, setEditingSteps] = useState<StepsLog | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
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
  };

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
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
      loadAllData();
    } catch (error) {
      console.error('Failed to save weight:', error);
      alert('Failed to save weight entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingWaist) {
        await waistAPI.update(editingWaist._id, { ...waistForm, waist: Number(waistForm.waist) });
      } else {
        await waistAPI.create({ ...waistForm, waist: Number(waistForm.waist) });
      }
      closeModal();
      loadAllData();
    } catch (error) {
      console.error('Failed to save waist:', error);
      alert('Failed to save waist entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingWorkout) {
        await workoutAPI.update(editingWorkout._id, { ...workoutForm, duration: workoutForm.duration ? Number(workoutForm.duration) : 0 });
      } else {
        await workoutAPI.create({ ...workoutForm, duration: workoutForm.duration ? Number(workoutForm.duration) : 0 });
      }
      closeModal();
      loadAllData();
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStepsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingSteps) {
        await stepsAPI.update(editingSteps._id, { ...stepsForm, steps: Number(stepsForm.steps) });
      } else {
        await stepsAPI.create({ ...stepsForm, steps: Number(stepsForm.steps) });
      }
      closeModal();
      loadAllData();
    } catch (error) {
      console.error('Failed to save steps:', error);
      alert('Failed to save steps entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (type: TabType, item: any) => {
    if (type === 'weight') {
      setEditingWeight(item);
      setWeightForm({ weight: item.weight.toString(), date: formatDate(item.date), notes: item.notes || '' });
    } else if (type === 'waist') {
      setEditingWaist(item);
      setWaistForm({ waist: item.waist.toString(), date: formatDate(item.date), notes: item.notes || '' });
    } else if (type === 'workout') {
      setEditingWorkout(item);
      setWorkoutForm({ date: formatDate(item.date), workoutType: item.workoutType || '', duration: item.duration?.toString() || '', notes: item.notes || '' });
    } else if (type === 'steps') {
      setEditingSteps(item);
      setStepsForm({ steps: item.steps.toString(), date: formatDate(item.date), notes: item.notes || '' });
    }
    setShowModal(true);
  };

  const handleDelete = async (type: TabType, id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    if (deletingId) return;
    setDeletingId(id);
    try {
      if (type === 'weight') await weightAPI.delete(id);
      else if (type === 'waist') await waistAPI.delete(id);
      else if (type === 'workout') await workoutAPI.delete(id);
      else if (type === 'steps') await stepsAPI.delete(id);
      loadAllData();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWeight(null);
    setEditingWaist(null);
    setEditingWorkout(null);
    setEditingSteps(null);
    resetForms();
  };

  const resetForms = () => {
    setWeightForm({ weight: '', date: getTodayDate(), notes: '' });
    setWaistForm({ waist: '', date: getTodayDate(), notes: '' });
    setWorkoutForm({ date: getTodayDate(), workoutType: '', duration: '', notes: '' });
    setStepsForm({ steps: '', date: getTodayDate(), notes: '' });
  };

  // Calculate stats
  // Use the most recent weight log entry (weights are sorted by date descending)
  const currentWeight = weights.length > 0 ? weights[0]?.weight : (user?.currentWeight || 0);
  const targetWeight = user?.targetWeight || 0;
  const height = user?.height || 0;
  const bmi = calculateBMI(currentWeight, height);
  const weightDifference = currentWeight - targetWeight;
  const currentWaist = waistLogs.length > 0 ? waistLogs[0]?.waist : 0;
  const targetWaist = user?.targetWaist || 0;
  const waistDifference = currentWaist - targetWaist;
  const workoutDays = new Set(workoutLogs.map(log => new Date(log.date).toISOString().split('T')[0])).size;
  const avgSteps = stepsLogs.length > 0 ? Math.round(stepsLogs.reduce((sum, log) => sum + log.steps, 0) / stepsLogs.length) : 0;

  // Prepare chart data
  const weightChartData = weights.slice().reverse().map((w) => ({
    date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: w.weight,
  }));

  const waistChartData = waistLogs.slice().reverse().map((w) => ({
    date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    waist: w.waist,
  }));

  const stepsChartData = stepsLogs.slice().reverse().map((s) => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    steps: s.steps,
  }));

  const tabs = [
    { id: 'weight' as TabType, label: 'Weight', icon: '⚖️', activeClass: 'bg-blue-600 text-white' },
    { id: 'waist' as TabType, label: 'Waist', icon: '📏', activeClass: 'bg-green-600 text-white' },
    { id: 'workout' as TabType, label: 'Workout', icon: '💪', activeClass: 'bg-orange-600 text-white' },
    { id: 'steps' as TabType, label: 'Steps', icon: '👣', activeClass: 'bg-pink-600 text-white' },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'weight': return weights;
      case 'waist': return waistLogs;
      case 'workout': return workoutLogs;
      case 'steps': return stepsLogs;
    }
  };

  const renderStats = () => {
    switch (activeTab) {
      case 'weight':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Current Weight</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {currentWeight > 0 ? `${currentWeight} kg` : 'N/A'}
              </dd>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Target Weight</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {targetWeight > 0 ? `${targetWeight} kg` : 'N/A'}
              </dd>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Difference</dt>
              <dd className={`mt-1 text-xl md:text-3xl font-semibold ${weightDifference > 0 ? 'text-red-600' : weightDifference < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {targetWeight > 0 && currentWeight > 0 ? `${weightDifference > 0 ? '+' : ''}${weightDifference.toFixed(1)} kg` : 'N/A'}
              </dd>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">BMI</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {bmi > 0 ? `${bmi} (${getBMICategory(bmi)})` : 'N/A'}
              </dd>
            </div>
          </div>
        );
      case 'waist':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Current Waist</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {currentWaist > 0 ? `${currentWaist} cm` : 'N/A'}
              </dd>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Target Waist</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {targetWaist > 0 ? `${targetWaist} cm` : 'N/A'}
              </dd>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Difference</dt>
              <dd className={`mt-1 text-xl md:text-3xl font-semibold ${waistDifference > 0 ? 'text-red-600' : waistDifference < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {targetWaist > 0 && currentWaist > 0 ? `${waistDifference > 0 ? '+' : ''}${waistDifference.toFixed(1)} cm` : 'N/A'}
              </dd>
            </div>
          </div>
        );
      case 'workout':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Total Workout Days</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {workoutDays} {workoutDays === 1 ? 'day' : 'days'}
              </dd>
            </div>
          </div>
        );
      case 'steps':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <dt className="text-xs md:text-sm font-medium text-gray-500">Average Steps</dt>
              <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                {avgSteps > 0 ? avgSteps.toLocaleString() : 'N/A'}
              </dd>
            </div>
          </div>
        );
    }
  };

  const renderChart = () => {
    if (activeTab === 'weight' && weightChartData.length > 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weight Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weightChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="#3b82f6" name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    if (activeTab === 'waist' && waistChartData.length > 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Waist Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={waistChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="waist" stroke="#10b981" name="Waist (cm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    if (activeTab === 'steps' && stepsChartData.length > 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Steps Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stepsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="steps" stroke="#ec4899" name="Steps" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    return null;
  };

  const renderEntries = () => {
    const data = getCurrentData();
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No entries yet. Add one to get started!</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {data.map((item: any) => (
            <li key={item._id} className="px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {activeTab === 'weight' && `${item.weight} kg`}
                    {activeTab === 'waist' && `${item.waist} cm`}
                    {activeTab === 'workout' && (
                      <>
                        {item.workoutType || 'Workout'}
                        {item.duration && item.duration > 0 && (
                          <span className="ml-2 text-sm text-gray-500">({item.duration} min)</span>
                        )}
                      </>
                    )}
                    {activeTab === 'steps' && `${item.steps.toLocaleString()} steps`}
                  </h3>
                  <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                    {item.notes && <span>Notes: {item.notes}</span>}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(activeTab, item)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(activeTab, item._id)}
                    disabled={deletingId === item._id}
                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === item._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    const getModalTitle = () => {
      if (activeTab === 'weight') return editingWeight ? 'Edit Weight Entry' : 'Add Weight Entry';
      if (activeTab === 'waist') return editingWaist ? 'Edit Waist Entry' : 'Add Waist Entry';
      if (activeTab === 'workout') return editingWorkout ? 'Edit Workout Entry' : 'Add Workout Entry';
      if (activeTab === 'steps') return editingSteps ? 'Edit Steps Entry' : 'Add Steps Entry';
    };

    const getForm = () => {
      if (activeTab === 'weight') {
        return (
          <form onSubmit={handleWeightSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                required
                min="0"
                step="0.1"
                value={weightForm.weight}
                onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={weightForm.date}
                onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={weightForm.notes}
                onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingWeight ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        );
      }
      if (activeTab === 'waist') {
        return (
          <form onSubmit={handleWaistSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Waist (cm)</label>
              <input
                type="number"
                required
                min="0"
                step="0.1"
                value={waistForm.waist}
                onChange={(e) => setWaistForm({ ...waistForm, waist: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={waistForm.date}
                onChange={(e) => setWaistForm({ ...waistForm, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={waistForm.notes}
                onChange={(e) => setWaistForm({ ...waistForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingWaist ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        );
      }
      if (activeTab === 'workout') {
        return (
          <form onSubmit={handleWorkoutSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={workoutForm.date}
                onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Workout Type (optional)</label>
              <input
                type="text"
                value={workoutForm.workoutType}
                onChange={(e) => setWorkoutForm({ ...workoutForm, workoutType: e.target.value })}
                placeholder="e.g., Cardio, Strength Training, Yoga"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes, optional)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={workoutForm.duration}
                onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })}
                placeholder="e.g., 30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={workoutForm.notes}
                onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingWorkout ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        );
      }
      if (activeTab === 'steps') {
        return (
          <form onSubmit={handleStepsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={stepsForm.steps}
                onChange={(e) => setStepsForm({ ...stepsForm, steps: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={stepsForm.date}
                onChange={(e) => setStepsForm({ ...stepsForm, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={stepsForm.notes}
                onChange={(e) => setStepsForm({ ...stepsForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingSteps ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        );
      }
    };

    return (
      <div className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-end sm:items-center justify-center min-h-screen px-4 pt-4 pb-20 sm:pb-4 sm:pt-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
          <div className="relative z-10 inline-block w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-xl transform transition-all">
            <div className="bg-white px-4 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{getModalTitle()}</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              {getForm()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full pb-12 md:pb-4">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Tracking</h1>
          <p className="text-sm text-gray-600">Track your weight, waist, workouts, and steps</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
          <div className="flex flex-nowrap gap-1 md:gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  closeModal();
                }}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 rounded-lg font-medium transition-all text-xs md:text-base ${
                  activeTab === tab.id
                    ? `${tab.activeClass} shadow-sm`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-base md:text-xl">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Add {tabs.find(t => t.id === activeTab)?.label} Entry
          </button>
        </div>

        {/* Stats */}
        {renderStats()}

        {/* Chart */}
        {renderChart()}

        {/* Entries List */}
        {renderEntries()}

        {/* Modal */}
        {renderModal()}
      </div>
    </Layout>
  );
};

