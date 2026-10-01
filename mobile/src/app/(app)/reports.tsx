import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';

import { useAuth } from '@/context/AuthContext';
import { reportsAPI } from '@/utils/api';

interface TrendData {
  date: string;
  value: number;
}

interface ChangeData {
  absolute: number;
  percent: number;
  isPositive: boolean;
}

type Status = 'improving' | 'needsAttention' | 'stable';

interface WeeklyReport {
  weightStart: number | null;
  weightEnd: number | null;
  weightChange: ChangeData | null;
  weightTrend: TrendData[];
  weightStatus: Status;
  weightGoalProgress: number | null;
  waistStart: number | null;
  waistEnd: number | null;
  waistChange: ChangeData | null;
  waistTrend: TrendData[];
  waistStatus: Status;
  waistGoalProgress: number | null;
  proteinStart: number;
  proteinEnd: number;
  proteinChange: ChangeData | null;
  proteinTrend: TrendData[];
  proteinStatus: Status;
  proteinGoalProgress: number | null;
  workoutStart: number | null;
  workoutEnd: number | null;
  workoutStartIsDuration?: boolean;
  workoutChange: ChangeData | null;
  workoutTrend: TrendData[];
  workoutStatus: Status;
  stepsStart: number | null;
  stepsEnd: number | null;
  stepsChange: ChangeData | null;
  stepsTrend: TrendData[];
  stepsStatus: Status;
  avgCalories: number;
  avgProtein: number;
  avgSteps: number;
  totalWorkoutMinutes: number;
  period: { start: string; end: string };
}

const STATUS_CONFIG: Record<Status, { text: string; color: string; bg: string }> = {
  improving: { text: 'Improving', color: '#047857', bg: '#d1fae5' },
  needsAttention: { text: 'Needs Attention', color: '#b91c1c', bg: '#fee2e2' },
  stable: { text: 'Stable', color: '#374151', bg: '#f3f4f6' },
};

const getDefaultEndDate = () => new Date().toISOString().split('T')[0];
const getDefaultStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
};

export default function Reports() {
  const { loading: authLoading, user } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
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

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const formatDisplayDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const weeklySummary = useMemo(() => {
    if (!report) return null;

    const insights: string[] = [];
    const recommendations: string[] = [];
    const keyMetrics: { label: string; value: string; change?: string; isPositive?: boolean }[] = [];

    if (report.weightChange && report.weightEnd !== null) {
      const change = Math.abs(report.weightChange.absolute);
      const sign = report.weightChange.isPositive ? '-' : '+';
      keyMetrics.push({
        label: 'Weight',
        value: `${report.weightEnd} kg`,
        change: `${sign}${change.toFixed(1)} kg`,
        isPositive: report.weightChange.isPositive,
      });
      insights.push(`Weight ${report.weightChange.isPositive ? 'reduced' : 'increased'} by ${change.toFixed(1)}kg`);
    } else if (report.weightEnd !== null) {
      keyMetrics.push({ label: 'Weight', value: `${report.weightEnd} kg` });
    }

    if (report.waistChange && report.waistEnd !== null) {
      const change = Math.abs(report.waistChange.absolute);
      const sign = report.waistChange.isPositive ? '-' : '+';
      keyMetrics.push({
        label: 'Waist',
        value: `${report.waistEnd} cm`,
        change: `${sign}${change.toFixed(1)} cm`,
        isPositive: report.waistChange.isPositive,
      });
      insights.push(`Waist ${report.waistChange.isPositive ? 'reduced' : 'increased'} by ${change.toFixed(1)}cm`);
    } else if (report.waistEnd !== null) {
      keyMetrics.push({ label: 'Waist', value: `${report.waistEnd} cm` });
    }

    if (report.avgSteps > 0) {
      keyMetrics.push({ label: 'Avg Steps', value: `${report.avgSteps.toLocaleString()}` });
    }

    if (report.avgProtein > 0) {
      keyMetrics.push({ label: 'Avg Protein', value: `${report.avgProtein.toFixed(1)}g` });
      if (report.proteinChange && !report.proteinChange.isPositive && Math.abs(report.proteinChange.percent) > 10) {
        recommendations.push('Try increasing daily protein to maintain muscle');
      }
    }

    let message = 'Keep up the consistent tracking! Your data shows stable progress.';
    if (insights.length > 0) {
      message = insights.join(' and ') + '.';
      if (recommendations.length > 0) message += ' ' + recommendations.join(' ');
    }

    return { keyMetrics, message };
  }, [report]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View className="mb-1 flex-row items-center gap-3">
          <Text className="text-2xl font-bold text-gray-900">Reports</Text>
          <Pressable onPress={handleRefresh} disabled={refreshing} className="ml-auto rounded-lg p-2">
            <Ionicons name="refresh" size={20} color="#4b5563" />
          </Pressable>
        </View>
        <Text className="mb-4 text-sm text-gray-600">Track your fitness progress and insights</Text>

        <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setShowStartPicker(true)}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5"
            >
              <Text className="text-xs font-semibold text-gray-700">Start Date</Text>
              <Text className="text-sm text-gray-900">{startDate}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowEndPicker(true)}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5"
            >
              <Text className="text-xs font-semibold text-gray-700">End Date</Text>
              <Text className="text-sm text-gray-900">{endDate}</Text>
            </Pressable>
          </View>
          {showStartPicker && (
            <DateTimePicker
              value={new Date(startDate)}
              mode="date"
              maximumDate={new Date(endDate)}
              onChange={(event, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (event.type === 'set' && date) setStartDate(date.toISOString().split('T')[0]);
                else setShowStartPicker(false);
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={new Date(endDate)}
              mode="date"
              minimumDate={new Date(startDate)}
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (event.type === 'set' && date) setEndDate(date.toISOString().split('T')[0]);
                else setShowEndPicker(false);
              }}
            />
          )}

          <View className="mt-4 border-t border-gray-200 pt-4">
            <Text className="mb-3 text-xs font-semibold text-gray-600">Quick Range:</Text>
            <View className="flex-row flex-wrap gap-2">
              {[7, 14, 30, 90].map((days) => (
                <Pressable key={days} onPress={() => handleQuickRange(days)} className="rounded-lg bg-gray-100 px-3 py-2">
                  <Text className="text-xs font-medium text-gray-700">Last {days} Days</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {!!report && (
          <Text className="mb-4 text-sm text-gray-600">
            Period: {formatDisplayDate(report.period.start)} - {formatDisplayDate(report.period.end)}
          </Text>
        )}

        {!!error && (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-medium text-red-800">{error}</Text>
          </View>
        )}

        {!!report && !!weeklySummary && (
          <>
            <View className="mb-6 rounded-2xl border border-blue-100 bg-indigo-50 p-5">
              <View className="mb-4 flex-row items-start gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
                  <Ionicons name="pulse" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xl font-bold text-gray-900">Weekly Summary</Text>
                  <Text className="text-sm leading-5 text-gray-700">{weeklySummary.message}</Text>
                </View>
              </View>

              {weeklySummary.keyMetrics.length > 0 && (
                <View className="flex-row flex-wrap gap-3">
                  {weeklySummary.keyMetrics.map((metric, idx) => (
                    <View key={idx} className="min-w-[45%] flex-1 rounded-xl bg-white/80 p-3">
                      <Text className="mb-1 text-xs font-semibold uppercase text-gray-600">{metric.label}</Text>
                      <View className="flex-row flex-wrap items-baseline gap-1.5">
                        <Text className="text-lg font-bold text-gray-900">{metric.value}</Text>
                        {!!metric.change && (
                          <Text
                            className={`text-xs font-semibold ${metric.isPositive ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {metric.change}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <SectionHeader label="Body Metrics" color="#2563eb" />
            <View className="mb-6 gap-4">
              <MetricCard
                title="Weight"
                icon="⚖️"
                start={report.weightStart}
                end={report.weightEnd}
                unit="kg"
                change={report.weightChange}
                trend={report.weightTrend}
                status={report.weightStatus}
                goalProgress={report.weightGoalProgress}
                trendColor="#3b82f6"
                goalLabel={user?.targetWeight ? 'Weight Goal' : undefined}
                goalValue={user?.targetWeight || undefined}
              />
              <MetricCard
                title="Waist"
                icon="📏"
                start={report.waistStart}
                end={report.waistEnd}
                unit="cm"
                change={report.waistChange}
                trend={report.waistTrend}
                status={report.waistStatus}
                goalProgress={report.waistGoalProgress}
                trendColor="#10b981"
                goalLabel={user?.targetWaist ? 'Waist Goal' : undefined}
                goalValue={user?.targetWaist || undefined}
              />
            </View>

            <SectionHeader label="Activity Metrics" color="#ea580c" />
            <View className="mb-6 gap-4">
              <MetricCard
                title="Steps"
                icon="👣"
                start={report.stepsStart}
                end={report.stepsEnd}
                unit="steps"
                change={report.stepsChange}
                trend={report.stepsTrend}
                status={report.stepsStatus}
                goalProgress={null}
                trendColor="#ec4899"
              />
              <MetricCard
                title="Workout"
                icon="💪"
                start={report.workoutStart}
                end={report.workoutEnd}
                unit={report.workoutStartIsDuration ? 'min' : 'workouts'}
                change={report.workoutChange}
                trend={report.workoutTrend}
                status={report.workoutStatus}
                goalProgress={null}
                trendColor="#f97316"
              />
            </View>

            <SectionHeader label="Nutrition Metrics" color="#9333ea" />
            <View className="mb-6 gap-4">
              <MetricCard
                title="Protein"
                icon="🥩"
                start={report.proteinStart}
                end={report.proteinEnd}
                unit="g"
                change={report.proteinChange}
                trend={report.proteinTrend}
                status={report.proteinStatus}
                goalProgress={report.proteinGoalProgress}
                trendColor="#8b5cf6"
                goalLabel={user?.dailyProteinTarget ? 'Protein Goal' : undefined}
                goalValue={user?.dailyProteinTarget || undefined}
              />
            </View>

            <View className="rounded-2xl border border-gray-100 bg-white p-4">
              <Text className="mb-4 text-base font-bold text-gray-900">Weekly Averages</Text>
              <View className="flex-row flex-wrap gap-3">
                {[
                  { label: 'Avg Calories', value: report.avgCalories.toLocaleString(), bg: '#dbeafe' },
                  { label: 'Avg Protein', value: `${report.avgProtein.toFixed(1)}g`, bg: '#ede9fe' },
                  { label: 'Avg Steps', value: report.avgSteps.toLocaleString(), bg: '#fce7f3' },
                  { label: 'Total Workout', value: `${report.totalWorkoutMinutes} min`, bg: '#ffedd5' },
                ].map((stat) => (
                  <View key={stat.label} className="min-w-[45%] flex-1 items-center rounded-xl p-4" style={{ backgroundColor: stat.bg }}>
                    <Text className="mb-1 text-xs font-semibold uppercase text-gray-600">{stat.label}</Text>
                    <Text className="text-xl font-bold text-gray-900">{stat.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!report && !error && (
          <View className="items-center py-16">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Ionicons name="bar-chart-outline" size={28} color="#9ca3af" />
            </View>
            <Text className="font-medium text-gray-500">No data available for this period.</Text>
            <Text className="mt-2 text-sm text-gray-400">Start logging your data to see reports.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-5 w-1 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-lg font-bold text-gray-900">{label}</Text>
    </View>
  );
}

function MetricCard({
  title,
  icon,
  start,
  end,
  unit,
  change,
  trend,
  status,
  goalProgress,
  trendColor,
  goalLabel,
  goalValue,
}: {
  title: string;
  icon: string;
  start: number | null;
  end: number | null;
  unit: string;
  change: ChangeData | null;
  trend: TrendData[];
  status: Status;
  goalProgress: number | null;
  trendColor: string;
  goalLabel?: string;
  goalValue?: number;
}) {
  const hasData = start !== null && end !== null;
  const statusMeta = STATUS_CONFIG[status];

  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-4">
      <View className="mb-3 flex-row items-center gap-3">
        <Text className="text-2xl">{icon}</Text>
        <View className="flex-1">
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</Text>
          {hasData ? (
            <View className="flex-row flex-wrap items-baseline gap-1.5">
              <Text className="text-2xl font-bold text-gray-900">{end?.toFixed(1)}</Text>
              <Text className="text-sm font-medium text-gray-500">{unit}</Text>
            </View>
          ) : (
            <Text className="text-xl font-bold text-gray-400">N/A</Text>
          )}
        </View>
      </View>

      {hasData && (
        <>
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-gray-500">Start:</Text>
              <Text className="text-xs font-semibold text-gray-700">
                {start?.toFixed(1)} {unit}
              </Text>
            </View>
            {!!change && (
              <View className="flex-row items-center gap-1 rounded-lg px-2.5 py-1" style={{ backgroundColor: statusMeta.bg }}>
                <Text className="text-xs font-semibold" style={{ color: change.isPositive ? '#047857' : change.absolute === 0 ? '#6b7280' : '#dc2626' }}>
                  {change.absolute === 0 ? '→' : change.absolute > 0 ? '↑' : '↓'}
                  {' '}
                  {change.absolute >= 0 ? '+' : ''}
                  {Math.abs(change.absolute).toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          <View className="mb-3 self-start rounded-full border px-3 py-1" style={{ backgroundColor: statusMeta.bg, borderColor: statusMeta.color }}>
            <Text className="text-xs font-semibold" style={{ color: statusMeta.color }}>
              {statusMeta.text}
            </Text>
          </View>

          {goalProgress !== null && (
            <View className="mb-3">
              {!!goalLabel && !!goalValue && (
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-gray-600">{goalLabel}</Text>
                  <Text className="text-xs font-semibold text-gray-700">{goalProgress.toFixed(0)}%</Text>
                </View>
              )}
              <View className="h-2 overflow-hidden rounded-full bg-gray-100">
                <View
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }}
                />
              </View>
              {!!goalLabel && !!goalValue && (
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-xs text-gray-500">
                    Current: {end?.toFixed(1)} {unit}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Goal: {goalValue} {unit}
                  </Text>
                </View>
              )}
            </View>
          )}

          {trend.length > 0 ? (
            <LineChart
              data={trend.map((t) => ({ value: t.value }))}
              areaChart
              color={trendColor}
              startFillColor={trendColor}
              endFillColor={trendColor}
              startOpacity={0.3}
              endOpacity={0}
              thickness={2}
              hideDataPoints
              hideAxesAndRules
              height={48}
              initialSpacing={0}
              endSpacing={0}
              disableScroll
            />
          ) : (
            <View className="h-12 items-center justify-center">
              <Text className="text-xs text-gray-400">No data</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
