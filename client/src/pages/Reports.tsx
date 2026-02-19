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
  waistGoalProgress: number | null;
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

  // Generate enhanced AI-style summary with key metrics
  const generateWeeklySummary = useMemo(() => {
    if (!report) return null;

    const insights: string[] = [];
    const recommendations: string[] = [];
    const keyMetrics: Array<{ label: string; value: string; change?: string; isPositive?: boolean }> = [];

    // Weight metric
    if (report.weightChange && report.weightEnd !== null) {
      const change = Math.abs(report.weightChange.absolute);
      const sign = report.weightChange.isPositive ? '-' : '+';
      keyMetrics.push({
        label: 'Weight',
        value: `${report.weightEnd} kg`,
        change: `${sign}${change.toFixed(1)} kg`,
        isPositive: report.weightChange.isPositive
      });
      if (report.weightChange.isPositive) {
        insights.push(`Weight reduced by ${change.toFixed(1)}kg`);
      } else {
        insights.push(`Weight increased by ${change.toFixed(1)}kg`);
      }
    } else if (report.weightEnd !== null) {
      keyMetrics.push({
        label: 'Weight',
        value: `${report.weightEnd} kg`
      });
    }

    // Waist metric
    if (report.waistChange && report.waistEnd !== null) {
      const change = Math.abs(report.waistChange.absolute);
      const sign = report.waistChange.isPositive ? '-' : '+';
      keyMetrics.push({
        label: 'Waist',
        value: `${report.waistEnd} cm`,
        change: `${sign}${change.toFixed(1)} cm`,
        isPositive: report.waistChange.isPositive
      });
      if (report.waistChange.isPositive) {
        insights.push(`Waist reduced by ${change.toFixed(1)}cm`);
      } else {
        insights.push(`Waist increased by ${change.toFixed(1)}cm`);
      }
    } else if (report.waistEnd !== null) {
      keyMetrics.push({
        label: 'Waist',
        value: `${report.waistEnd} cm`
      });
    }

    // Steps metric
    if (report.avgSteps > 0) {
      keyMetrics.push({
        label: 'Avg Steps',
        value: `${report.avgSteps.toLocaleString()}`
      });
    }

    // Protein metric
    if (report.avgProtein > 0) {
      keyMetrics.push({
        label: 'Avg Protein',
        value: `${report.avgProtein.toFixed(1)}g`
      });
      if (report.proteinChange && !report.proteinChange.isPositive && Math.abs(report.proteinChange.percent) > 10) {
        recommendations.push('Try increasing daily protein to maintain muscle');
      }
    }

    // Generate motivational message
    let message = '';
    if (insights.length > 0) {
      message = insights.join(' and ') + '.';
      if (recommendations.length > 0) {
        message += ' ' + recommendations.join(' ');
      }
    } else {
      message = "Keep up the consistent tracking! Your data shows stable progress.";
    }

    return { keyMetrics, message };
  }, [report]);

  // Render change indicator with improved styling
  const renderChangeIndicator = (change: ChangeData | null) => {
    if (!change) return null;

    // isPositive already accounts for whether lower or higher is better (set in backend)
    const isGood = change.isPositive;
    const color = isGood ? 'text-emerald-600' : change.absolute === 0 ? 'text-gray-500' : 'text-red-500';
    const bgColor = isGood ? 'bg-emerald-50' : change.absolute === 0 ? 'bg-gray-50' : 'bg-red-50';
    const arrow = change.absolute === 0 ? '→' : change.absolute > 0 ? '↑' : '↓';
    const sign = change.absolute >= 0 ? '+' : '';

    return (
      <div className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg ${bgColor}`}>
        <span className={`text-xs md:text-sm font-semibold ${color}`}>{arrow}</span>
        <span className={`text-xs md:text-sm font-semibold ${color}`}>
          {sign}{Math.abs(change.absolute).toFixed(1)}
        </span>
        <span className={`text-xs ${color} opacity-75 hidden sm:inline`}>
          ({sign}{change.percent.toFixed(1)}%)
        </span>
      </div>
    );
  };

  // Render status badge with improved styling
  const renderStatusBadge = (status: 'improving' | 'needsAttention' | 'stable') => {
    const config = {
      improving: { text: 'Improving', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      needsAttention: { text: 'Needs Attention', color: 'bg-red-100 text-red-700 border-red-200' },
      stable: { text: 'Stable', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    };
    const { text, color } = config[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
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

  // Render metric card with improved design
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
    goalProgress: number | null = null,
    trendColor: string,
    goalLabel?: string,
    goalValue?: number
  ) => {
    const hasData = start !== null && end !== null;
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className="text-xl md:text-2xl">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide">{title}</h3>
              {hasData ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl md:text-3xl font-bold text-gray-900">
                    {end?.toFixed(1)}
                  </span>
                  <span className="text-sm md:text-base text-gray-500 font-medium">{unit}</span>
                </div>
              ) : (
                <span className="text-xl md:text-2xl font-bold text-gray-400">N/A</span>
              )}
            </div>
          </div>
        </div>

        {hasData && (
          <>
            {/* Start value and change indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm text-gray-500">Start:</span>
                <span className="text-xs md:text-sm font-semibold text-gray-700">{start?.toFixed(1)} {unit}</span>
              </div>
              {renderChangeIndicator(change)}
            </div>

            {/* Status badge */}
            <div className="mb-3 md:mb-4">
              {renderStatusBadge(status)}
            </div>

            {/* Goal progress */}
            {goalProgress !== null && user && (
              <div className="mb-3 md:mb-4">
                {goalLabel && goalValue && (
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span className="font-medium truncate pr-2">{goalLabel}</span>
                    <span className="font-semibold flex-shrink-0">{goalProgress.toFixed(0)}%</span>
                  </div>
                )}
                <div className="w-full bg-gray-100 rounded-full h-1.5 md:h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 md:h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }}
                  />
                </div>
                {goalLabel && goalValue && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-gray-500 mt-1">
                    <span className="truncate">Current: {end?.toFixed(1)} {unit}</span>
                    <span className="flex-shrink-0">Goal: {goalValue} {unit}</span>
                  </div>
                )}
              </div>
            )}

            {/* Sparkline chart */}
            <div className="mt-3 md:mt-4 -mx-2">
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
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Reports</h1>
              <p className="text-sm md:text-base text-gray-600">Track your fitness progress and insights</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={getDefaultEndDate()}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleDateRangeChange}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm text-sm md:text-base"
              >
                Apply
              </button>
            </div>
            
            {/* Quick Range Buttons */}
            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
              <p className="text-xs md:text-sm font-semibold text-gray-600 mb-3">Quick Range:</p>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 90].map(days => (
                  <button
                    key={days}
                    onClick={() => handleQuickRange(days)}
                    className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
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
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {report && generateWeeklySummary && (
          <>
            {/* Enhanced Weekly Summary Section */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 md:p-8 mb-6 md:mb-8 border border-blue-100 shadow-sm">
              <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Weekly Summary</h2>
                  <p className="text-gray-700 leading-relaxed text-sm md:text-base break-words">{generateWeeklySummary.message}</p>
                </div>
              </div>

              {/* Key Metrics Grid */}
              {generateWeeklySummary.keyMetrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6">
                  {generateWeeklySummary.keyMetrics.map((metric, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/50">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 truncate">
                        {metric.label}
                      </p>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <p className="text-lg md:text-xl font-bold text-gray-900 break-words">{metric.value}</p>
                        {metric.change && (
                          <span className={`text-xs font-semibold whitespace-nowrap ${
                            metric.isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {metric.change}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Body Metrics Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 md:h-6 bg-blue-600 rounded-full"></span>
                Body Metrics
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                  report.weightGoalProgress,
                  '#3b82f6',
                  user?.targetWeight ? 'Weight Goal' : undefined,
                  user?.targetWeight || undefined
                )}

                {renderMetricCard(
                  'Waist',
                  '📏',
                  'bg-emerald-100',
                  report.waistStart,
                  report.waistEnd,
                  'cm',
                  report.waistChange,
                  report.waistTrend,
                  report.waistStatus,
                  report.waistGoalProgress,
                  '#10b981',
                  user?.targetWaist ? 'Waist Goal' : undefined,
                  user?.targetWaist || undefined
                )}
              </div>
            </div>

            {/* Activity Metrics Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 md:h-6 bg-orange-600 rounded-full"></span>
                Activity Metrics
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                  null,
                  '#f97316'
                )}
              </div>
            </div>

            {/* Nutrition Metrics Section */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 md:h-6 bg-purple-600 rounded-full"></span>
                Nutrition Metrics
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                  report.proteinGoalProgress,
                  '#8b5cf6',
                  user?.dailyProteinTarget ? 'Protein Goal' : undefined,
                  user?.dailyProteinTarget || undefined
                )}
              </div>
            </div>

            {/* Weekly Averages Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                <span className="w-1 h-4 md:h-5 bg-gray-600 rounded-full"></span>
                Weekly Averages
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="text-center p-3 md:p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 md:mb-2">Avg Calories</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{report.avgCalories.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 md:p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 md:mb-2">Avg Protein</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{report.avgProtein.toFixed(1)}g</p>
                </div>
                <div className="text-center p-3 md:p-5 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl border border-pink-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 md:mb-2">Avg Steps</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{report.avgSteps.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 md:p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 md:mb-2">Total Workout</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{report.totalWorkoutMinutes} min</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!report && !loading && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No data available for this period.</p>
            <p className="text-sm text-gray-400 mt-2">Start logging your data to see reports.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};
