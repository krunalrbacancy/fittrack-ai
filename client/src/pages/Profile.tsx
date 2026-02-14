import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { calculateBMI, getBMICategory } from '../utils/calculations';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    currentWeight: '',
    targetWeight: '',
    goal: 'Reduce Belly Fat',
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:29',message:'Profile useEffect triggered',data:{hasUser:!!user,userId:user?._id,hasName:!!user?.name,hasCarbs:!!user?.dailyCarbsTarget},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (user) {
      const newFormData = {
        name: user.name || '',
        age: user.age?.toString() || '',
        height: user.height?.toString() || '',
        currentWeight: user.currentWeight?.toString() || '',
        targetWeight: user.targetWeight?.toString() || '',
        goal: user.goal || 'Reduce Belly Fat',
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
      };
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:48',message:'Setting formData from user',data:{name:newFormData.name,carbs:newFormData.dailyCarbsTarget},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setFormData(newFormData);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // #region agent log
    const submitData = {
      name: formData.name,
      age: formData.age ? Number(formData.age) : null,
      height: formData.height ? Number(formData.height) : null,
      currentWeight: formData.currentWeight ? Number(formData.currentWeight) : null,
      targetWeight: formData.targetWeight ? Number(formData.targetWeight) : null,
      goal: formData.goal,
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
    };
    fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:52',message:'handleSubmit called',data:submitData,timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
      await updateUser(submitData);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:76',message:'updateUser success',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9bdd0136-1069-43f1-84b9-1dd5076c3ea5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:80',message:'updateUser error',data:{error:String(error),status:error?.response?.status},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('Failed to update profile:', error);
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const bmi = user?.height && user?.currentWeight
    ? calculateBMI(user.currentWeight, user.height)
    : 0;

  return (
    <Layout>
      <div className="w-full pb-12 md:pb-4">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your profile and goals</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 md:p-4 rounded-xl text-sm ${
            message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Profile Summary - First on mobile */}
          <div className="order-1 lg:order-2 lg:w-1/3">
            <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Profile Summary</h3>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                {user?.name && (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Name</p>
                    <p className="text-sm md:text-lg font-medium text-gray-900 truncate">{user.name}</p>
                  </div>
                )}
                {user?.age && (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Age</p>
                    <p className="text-sm md:text-lg font-medium text-gray-900">{user.age} years</p>
                  </div>
                )}
                {user?.height && (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Height</p>
                    <p className="text-sm md:text-lg font-medium text-gray-900">{user.height} cm</p>
                  </div>
                )}
                {user?.currentWeight && (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Current Weight</p>
                    <p className="text-sm md:text-lg font-medium text-gray-900">{user.currentWeight} kg</p>
                  </div>
                )}
                {user?.targetWeight && (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">Target Weight</p>
                    <p className="text-sm md:text-lg font-medium text-gray-900">{user.targetWeight} kg</p>
                  </div>
                )}
                {bmi > 0 && (
                  <div>
                    <p className="text-xs md:text-sm text-gray-500">BMI</p>
                    <p className="text-sm md:text-lg font-medium text-gray-900">
                      {bmi} ({getBMICategory(bmi)})
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Goal</p>
                  <p className="text-sm md:text-lg font-medium text-gray-900 truncate">{user?.goal || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form - Second on mobile */}
          <div className="order-2 lg:order-1 lg:w-2/3">
            <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Age</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Height (cm)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Current Weight (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.currentWeight}
                      onChange={(e) => setFormData({ ...formData, currentWeight: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Target Weight (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.targetWeight}
                      onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Goal</label>
                    <input
                      type="text"
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Daily Calorie Target</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.dailyCalorieTarget}
                      onChange={(e) => setFormData({ ...formData, dailyCalorieTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Daily Protein Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dailyProteinTarget}
                      onChange={(e) => setFormData({ ...formData, dailyProteinTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Daily Carbs Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dailyCarbsTarget}
                      onChange={(e) => setFormData({ ...formData, dailyCarbsTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Daily Fats Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dailyFatsTarget}
                      onChange={(e) => setFormData({ ...formData, dailyFatsTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Daily Fiber Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dailyFiberTarget}
                      onChange={(e) => setFormData({ ...formData, dailyFiberTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Fasting Calorie Target</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.fastingCalorieTarget}
                      onChange={(e) => setFormData({ ...formData, fastingCalorieTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Calories allowed on fasting days</p>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Fasting Protein Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.fastingProteinTarget}
                      onChange={(e) => setFormData({ ...formData, fastingProteinTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Protein target on fasting days</p>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Fasting Carbs Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.fastingCarbsTarget}
                      onChange={(e) => setFormData({ ...formData, fastingCarbsTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Carbs target on fasting days</p>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Fasting Fats Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.fastingFatsTarget}
                      onChange={(e) => setFormData({ ...formData, fastingFatsTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Fats target on fasting days</p>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700">Fasting Fiber Target (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.fastingFiberTarget}
                      onChange={(e) => setFormData({ ...formData, fastingFiberTarget: e.target.value })}
                      className="mt-1 block w-full text-sm md:text-base border border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Fiber target on fasting days</p>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-xl text-base font-medium disabled:opacity-50 transition-colors touch-manipulation"
                  >
                    {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

