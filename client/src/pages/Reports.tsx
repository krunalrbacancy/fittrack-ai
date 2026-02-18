import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { reportsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';

interface TrendData {
  date: string;
  value: number;
}

interface ChangeData {
  absolute: number;
  percent: number;
  isPositive: boolean;
}

interface WeeklyReport {
  weightStart: number | null;
  weightEnd: number | null;
  weightChange: ChangeData | null;
  weightTrend: TrendData[];
  weightStatus: 'improving' | 'needsAttention' | 'stable';
  weightGoalProgress: number | null;
  waistStart: number | null;
  waistEnd: number | null;
  waistChange: ChangeData | null;
  waistTrend: TrendData[];
  waistStatus: 'improving' | 'needsAttention' | 'stable';
  proteinStart: number;
  proteinEnd: number;
  proteinChange: ChangeData | null;
  proteinTrend: TrendData[];
  proteinStatus: 'improving' | 'needsAttention' | 'stable';
  proteinGoalProgress: number | null;
  workoutStart: number | null;
  workoutEnd: number | null;
  workoutStartIsDuration?: boolean;
  workoutEndIsDuration?: boolean;
  workoutChange: ChangeData | null;
  workoutTrend: TrendData[];
  workoutStatus: 'improving' | 'needsAttention' | 'stable';
  stepsStart: number | null;
  stepsEnd: number | null;
  stepsChange: ChangeData | null;
  stepsTrend: TrendData[];
  stepsStatus: 'improving' | 'needsAttention' | 'stable';
  avgCalories: number;
  avgProtein: number;
  avgSteps: number;
  totalWorkoutMinutes: number;
  caloriesTrend: TrendData[];
  period: {
    start: string;
    end: string;
  };
}

export const Reports: React.FC = () => {
  const { loading: authLoading, user } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state - default to last 7 days
  const getDefaultEndDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  const loadReport = useCallback(async () => {
    try {
      setError(null);
      const data = await reportsAPI.getWeekly(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!authLoading) {
      loadReport();
    }
  }, [loadReport, authLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReport();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDateRangeChange = () => {
    if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
      setLoading(true);
      loadReport();
    } else if (startDate && endDate) {
      setError('Start date must be before or equal to end date');
    }
  };

  const handleQuickRange = async (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const newStartDate = start.toISOString().split('T')[0];
    const newEndDate = end.toISOString().split('T')[0];
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    setLoading(true);
    try {
      setError(null);
      const data = await reportsAPI.getWeekly(newStartDate, newEndDate);
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Generate AI-style summary
  const generateSummary = useMemo(() => {
    if (!report) return null;

    const insights = [];
    const recommendations = [];

    // Weight insight
    if (report.weightChange) {
      if (report.weightChange.isPositive) {
        insights.push(`Weight reduced by ${Math.abs(report.weightChange.absolute)}kg`);
      } else {
        insights.push(`Weight increased by ${Math.abs(report.weightChange.absolute)}kg`);
      }
    }

    // Waist insight
    if (report.waistChange) {
      if (report.waistChange.isPositive) {
        insights.push(`Waist reduced by ${Math.abs(report.waistChange.absolute)}cm`);
      } else {
        insights.push(`Waist increased by ${Math.abs(report.waistChange.absolute)}cm`);
      }
    }

    // Protein insight
    if (report.proteinChange) {
      if (!report.proteinChange.isPositive && Math.abs(report.proteinChange.percent) > 10) {
        insights.push(`Average protein intake dropped by ${Math.abs(report.proteinChange.percent).toFixed(1)}%`);
        recommendations.push('Try increasing daily protein to maintain muscle');
      } else if (report.proteinChange.isPositive) {
        insights.push(`Protein intake improved by ${report.proteinChange.percent.toFixed(1)}%`);
      }
    }

    // Steps insight
    if (report.stepsChange && report.stepsChange.isPositive) {
      insights.push(`Steps increased by ${report.stepsChange.percent.toFixed(1)}%`);
    }

    // Workout insight
    if (report.workoutChange && report.workoutChange.isPositive) {
      insights.push(`Workout activity increased`);
    }

    if (insights.length === 0) {
      return "Keep up the consistent tracking! Your data shows stable progress.";
    }

    const summary = insights.join(' and ') + '.';
    const rec = recommendations.length > 0 ? ' ' + recommendations.join(' ') : '';
    
    return summary + rec;
  }, [report]);

  // Render change indicator
  const renderChangeIndicator = (change: ChangeData | null, isLowerBetter: boolean = false) => {
    if (!change) return null;

    const isGood = isLowerBetter ? change.isPositive : change.isPositive;
    const color = isGood ? 'text-green-600' : change.absolute === 0 ? 'text-gray-500' : 'text-red-600';
    const arrow = change.absolute === 0 ? '→' : isGood ? '↓' : '↑';
    const sign = change.absolute >= 0 ? '+' : '';

    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${color}`}>
        <span>{arrow}</span>
        <span>{sign}{change.absolute.toFixed(1)}</span>
        <span className="text-gray-500">({sign}{change.percent.toFixed(1)}%)</span>
      </div>
    );
  };

  // Render status badge
  const renderStatusBadge = (status: 'improving' | 'needsAttention' | 'stable') => {
    const config = {
      improving: { text: 'Improving', color: 'bg-green-100 text-green-700' },
      needsAttention: { text: 'Needs Attention', color: 'bg-red-100 text-red-700' },
      stable: { text: 'Stable', color: 'bg-gray-100 text-gray-700' }
    };
    const { text, color } = config[status];
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {text}
      </span>
    );
  };

  // Render sparkline chart
  const renderSparkline = (trend: TrendData[], color: string) => {
    if (!trend || trend.length === 0) {
      return (
        <div className="h-12 flex items-center justify-center text-gray-400 text-xs">
          No data
        </div>
      );
    }

    // Sanitize color for SVG ID (remove # and invalid characters)
    const gradientId = `gradient-${color.replace('#', '').replace(/[^a-zA-Z0-9]/g, '')}`;
    
    return (
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // Render metric card
  const renderMetricCard = (
    title: string,
    icon: string,
    iconBg: string,
    start: number | null,
    end: number | null,
    unit: string,
    change: ChangeData | null,
    trend: TrendData[],
    status: 'improving' | 'needsAttention' | 'stable',
    isLowerBetter: boolean = false,
    goalProgress: number | null = null,
    trendColor: string
  ) => {
    const hasData = start !== null && end !== null;
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
              <span className="text-2xl">{icon}</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
              {hasData ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {start} → {end}
                  </span>
                  <span className="text-sm text-gray-500">{unit}</span>
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-400">N/A</span>
              )}
            </div>
          </div>
          {hasData && renderStatusBadge(status)}
        </div>

        {hasData && (
          <>
            {renderChangeIndicator(change, isLowerBetter)}
            {goalProgress !== null && user && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Goal Progress</span>
                  <span>{goalProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }}
                  />
                </div>
              </div>
            )}
            <div className="mt-4 -mx-2">
              {renderSparkline(trend, trendColor)}
            </div>
          </>
        )}
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Report</h1>
              <p className="text-gray-600">Track your fitness progress and insights</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh report"
            >
              <svg 
                className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {/* Date Range Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={getDefaultEndDate()}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleDateRangeChange}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Apply
              </button>
            </div>
            
            {/* Quick Range Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Quick Range:</p>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 90].map(days => (
                  <button
                    key={days}
                    onClick={() => handleQuickRange(days)}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Last {days} Days
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {report && (
            <p className="text-sm text-gray-600 mb-6">
              Period: {formatDate(report.period.start)} - {formatDate(report.period.end)}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {report && (
          <>
            {/* AI Summary Block */}
            {generateSummary && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💡</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Weekly Summary</h3>
                    <p className="text-gray-700 leading-relaxed">{generateSummary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Metrics Grid - 2 columns on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {renderMetricCard(
                'Weight',
                '⚖️',
                'bg-blue-100',
                report.weightStart,
                report.weightEnd,
                'kg',
                report.weightChange,
                report.weightTrend,
                report.weightStatus,
                true,
                report.weightGoalProgress,
                '#3b82f6'
              )}

              {renderMetricCard(
                'Waist',
                '📏',
                'bg-green-100',
                report.waistStart,
                report.waistEnd,
                'cm',
                report.waistChange,
                report.waistTrend,
                report.waistStatus,
                true,
                null,
                '#10b981'
              )}

              {renderMetricCard(
                'Protein',
                '🥩',
                'bg-purple-100',
                report.proteinStart,
                report.proteinEnd,
                'g',
                report.proteinChange,
                report.proteinTrend,
                report.proteinStatus,
                false,
                report.proteinGoalProgress,
                '#8b5cf6'
              )}

              {renderMetricCard(
                'Steps',
                '👣',
                'bg-pink-100',
                report.stepsStart,
                report.stepsEnd,
                'steps',
                report.stepsChange,
                report.stepsTrend,
                report.stepsStatus,
                false,
                null,
                '#ec4899'
              )}

              {renderMetricCard(
                'Workout',
                '💪',
                'bg-orange-100',
                report.workoutStart,
                report.workoutEnd,
                report.workoutStartIsDuration ? 'min' : 'workouts',
                report.workoutChange,
                report.workoutTrend,
                report.workoutStatus,
                false,
                null,
                '#f97316'
              )}
            </div>

            {/* Weekly Averages Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Averages</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Avg Calories</p>
                  <p className="text-2xl font-bold text-gray-900">{report.avgCalories.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Avg Protein</p>
                  <p className="text-2xl font-bold text-gray-900">{report.avgProtein.toFixed(1)}g</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Avg Steps</p>
                  <p className="text-2xl font-bold text-gray-900">{report.avgSteps.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Workout</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalWorkoutMinutes} min</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!report && !loading && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No data available for this period.</p>
            <p className="text-sm text-gray-400 mt-2">Start logging your data to see reports.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};
