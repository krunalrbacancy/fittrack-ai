import React, { useEffect, useState } from 'react';
import { weightAPI } from '../utils/api';
import { WeightLog } from '../types';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { calculateBMI, getBMICategory, formatDate, getTodayDate } from '../utils/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const Weight: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightLog | null>(null);
  const [formData, setFormData] = useState({
    weight: '',
    date: getTodayDate(),
    notes: '',
  });

  useEffect(() => {
    loadWeights();
  }, []);

  const loadWeights = async () => {
    try {
      const data = await weightAPI.getAll(30); // Get last 30 entries
      setWeights(data);
    } catch (error) {
      console.error('Failed to load weights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWeight) {
        await weightAPI.update(editingWeight._id, {
          ...formData,
          weight: Number(formData.weight),
        });
      } else {
        await weightAPI.create({
          ...formData,
          weight: Number(formData.weight),
        } as any);
        
        // Update user's current weight if this is today's entry
        if (formatDate(formData.date) === getTodayDate()) {
          await updateUser({ currentWeight: Number(formData.weight) });
        }
      }
      setShowModal(false);
      setEditingWeight(null);
      resetForm();
      loadWeights();
    } catch (error) {
      console.error('Failed to save weight:', error);
      alert('Failed to save weight entry');
    }
  };

  const handleEdit = (weight: WeightLog) => {
    setEditingWeight(weight);
    setFormData({
      weight: weight.weight.toString(),
      date: formatDate(weight.date),
      notes: weight.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weight entry?')) return;
    try {
      await weightAPI.delete(id);
      loadWeights();
    } catch (error) {
      console.error('Failed to delete weight:', error);
      alert('Failed to delete weight entry');
    }
  };

  const resetForm = () => {
    setFormData({
      weight: '',
      date: getTodayDate(),
      notes: '',
    });
  };

  const openModal = () => {
    resetForm();
    setEditingWeight(null);
    setShowModal(true);
  };

  const currentWeight = user?.currentWeight || weights[0]?.weight || 0;
  const targetWeight = user?.targetWeight || 0;
  const height = user?.height || 0;
  const bmi = calculateBMI(currentWeight, height);
  const weightDifference = currentWeight - targetWeight;

  // Prepare chart data
  const chartData = weights
    .slice()
    .reverse()
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: w.weight,
    }));

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Weight Management</h1>
            <p className="mt-1 text-sm text-gray-600">Track your weight progress</p>
          </div>
          <button
            onClick={openModal}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-xl text-base font-medium transition-colors touch-manipulation"
          >
            Add Weight Entry
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <dl>
                <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">Current Weight</dt>
                <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                  {currentWeight > 0 ? `${currentWeight} kg` : 'N/A'}
                </dd>
              </dl>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <dl>
                <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">Target Weight</dt>
                <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                  {targetWeight > 0 ? `${targetWeight} kg` : 'N/A'}
                </dd>
              </dl>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <dl>
                <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">Difference</dt>
                <dd className={`mt-1 text-xl md:text-3xl font-semibold ${weightDifference > 0 ? 'text-red-600' : weightDifference < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {targetWeight > 0 && currentWeight > 0
                    ? `${weightDifference > 0 ? '+' : ''}${weightDifference.toFixed(1)} kg`
                    : 'N/A'}
                </dd>
              </dl>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-md rounded-xl">
            <div className="p-4 md:p-5">
              <dl>
                <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">BMI</dt>
                <dd className="mt-1 text-xl md:text-3xl font-semibold text-gray-900">
                  {bmi > 0 ? `${bmi} (${getBMICategory(bmi)})` : 'N/A'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Weight Chart */}
        {chartData.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weight Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" name="Weight (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weight Logs */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {weights.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No weight entries yet. Add one to get started!
              </li>
            ) : (
              weights.map((weight) => (
                <li key={weight._id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {weight.weight} kg
                      </h3>
                      <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                        <span>{new Date(weight.date).toLocaleDateString()}</span>
                        {weight.notes && <span>Notes: {weight.notes}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(weight)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(weight._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 md:pb-4 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-t-2xl sm:rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full w-full max-h-[85vh] md:max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh] md:max-h-[90vh]">
                  <div className="bg-white px-4 pt-6 pb-4 sm:p-6 sm:pb-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {editingWeight ? 'Edit Weight Entry' : 'Add Weight Entry'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingWeight(null);
                          resetForm();
                        }}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                      >
                        ×
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.1"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="mt-1 block w-full text-base border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-3 flex-shrink-0 border-t">
                    <button
                      type="submit"
                      className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation"
                    >
                      {editingWeight ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingWeight(null);
                        resetForm();
                      }}
                      className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

