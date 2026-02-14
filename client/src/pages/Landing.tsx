import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleAccessDashboard = () => {
    navigate('/dashboard');
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
          
          <button
            onClick={handleAccessDashboard}
            className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Access Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

