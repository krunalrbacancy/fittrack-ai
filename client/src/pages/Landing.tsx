import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err) {
      console.error('Guest login error:', err);
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8 safe-area-inset">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900">
            FitTrack AI
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Track your fitness journey with AI-powered insights
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-6">
          <p className="text-base md:text-lg text-gray-700">
            Monitor your calories, protein, water intake, and weight progress all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 active:bg-gray-100 text-blue-600 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl border border-blue-200 transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </button>
          </div>
          <button
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="text-sm text-gray-500 hover:text-blue-600 underline transition-colors disabled:opacity-50"
          >
            {guestLoading ? 'Loading demo...' : 'Or try as Guest — explore with sample data'}
          </button>
        </div>
      </div>
    </div>
  );
};

