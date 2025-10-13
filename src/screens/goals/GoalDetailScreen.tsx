// Goal Detail Screen - View Goal Details and Progress

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GoalsStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { differenceInDays, differenceInMonths, format } from 'date-fns';

type GoalDetailScreenNavigationProp = StackNavigationProp<
  GoalsStackParamList,
  'GoalDetail'
>;
type GoalDetailScreenRouteProp = RouteProp<GoalsStackParamList, 'GoalDetail'>;

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string;
  start_date: string;
  status: string;
  icon: string;
  color: string;
  current_amount: number;
  progress: number;
  monthly_rate_needed: number;
  actual_monthly_rate: number;
  is_on_track: boolean;
  days_remaining: number;
  days_total: number;
  days_passed: number;
  expected_progress: number;
}

const GoalDetailScreen: React.FC = () => {
  const navigation = useNavigation<GoalDetailScreenNavigationProp>();
  const route = useRoute<GoalDetailScreenRouteProp>();
  const { user } = useAuthStore();

  const { goalId } = route.params;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [goalId])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchGoal(), fetchUserCurrency()]);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const fetchUserCurrency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setCurrency(data.currency);
    } catch (error: any) {
      console.error('Error fetching currency:', error);
    }
  };

  const fetchGoal = async () => {
    if (!user) return;

    try {
      const { data: goalData, error: goalError } = await supabase
        .from('saving_goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (goalError) throw goalError;
      if (!goalData) {
        Alert.alert('Error', 'Goal not found');
        navigation.goBack();
        return;
      }

      // Calculate current progress
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', goalData.start_date);

      const income = transactions
        ? transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0)
        : 0;

      const expense = transactions
        ? transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0)
        : 0;

      const currentAmount = income - expense;
      const progress = Math.min(
        (currentAmount / Number(goalData.target_amount)) * 100,
        100
      );

      // Date calculations
      const today = new Date();
      const targetDate = new Date(goalData.target_date);
      const startDate = new Date(goalData.start_date);
      const daysRemaining = differenceInDays(targetDate, today);
      const daysTotal = differenceInDays(targetDate, startDate);
      const daysPassed = daysTotal - daysRemaining;

      // Progress calculations
      const expectedProgress = daysPassed > 0 ? (daysPassed / daysTotal) * 100 : 0;
      const isOnTrack = progress >= expectedProgress || progress >= 100;

      // Monthly rate calculations
      const monthsRemaining = Math.max(differenceInMonths(targetDate, today), 1);
      const amountRemaining = Number(goalData.target_amount) - currentAmount;
      const monthlyRateNeeded = amountRemaining / monthsRemaining;

      const monthsPassed = Math.max(differenceInMonths(today, startDate), 1);
      const actualMonthlyRate = currentAmount / monthsPassed;

      setGoal({
        ...goalData,
        current_amount: currentAmount,
        progress,
        monthly_rate_needed: monthlyRateNeeded,
        actual_monthly_rate: actualMonthlyRate,
        is_on_track: isOnTrack,
        days_remaining: daysRemaining,
        days_total: daysTotal,
        days_passed: daysPassed,
        expected_progress: expectedProgress,
      });
    } catch (error: any) {
      console.error('Error fetching goal:', error);
      Alert.alert('Error', 'Failed to load goal details');
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddGoal', { goalId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('saving_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Goal deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      Alert.alert('Error', 'Failed to delete goal');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = () => {
    if (!goal) return '#3B82F6';
    if (goal.status === 'completed' || goal.progress >= 100) return '#10B981';
    if (goal.is_on_track) return '#3B82F6';
    return '#F59E0B';
  };

  const getStatusText = () => {
    if (!goal) return 'Active';
    if (goal.status === 'completed' || goal.progress >= 100) return 'Completed';
    if (goal.days_remaining < 0) return 'Overdue';
    if (goal.is_on_track) return 'On Track';
    return 'Behind Schedule';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading goal...</Text>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Goal not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor();
  const statusText = getStatusText();
  const isCompleted = goal.status === 'completed' || goal.progress >= 100;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting...' : '🗑️ Delete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Goal Header */}
        <View style={styles.goalHeader}>
          <View
            style={[
              styles.goalIconLarge,
              { backgroundColor: goal.color + '20' },
            ]}
          >
            <Text style={styles.goalIconTextLarge}>{goal.icon}</Text>
          </View>
          <Text style={styles.goalName}>{goal.name}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Celebration for Completed Goals */}
        {isCompleted && (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationIcon}>🎉</Text>
            <Text style={styles.celebrationTitle}>Congratulations!</Text>
            <Text style={styles.celebrationMessage}>
              You've successfully achieved your goal!
            </Text>
          </View>
        )}

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={[styles.progressPercentage, { color: statusColor }]}>
              {Math.round(goal.progress)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${goal.progress}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current</Text>
              <Text style={[styles.amountValue, { color: statusColor }]}>
                {formatCurrency(goal.current_amount, currency)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Target</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(goal.target_amount, currency)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Remaining</Text>
              <Text
                style={[
                  styles.amountValue,
                  {
                    color:
                      goal.target_amount - goal.current_amount <= 0
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              >
                {formatCurrency(
                  Math.max(goal.target_amount - goal.current_amount, 0),
                  currency
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Timeline</Text>
          <View style={styles.timelineBar}>
            <View
              style={[
                styles.timelineProgress,
                {
                  width: `${Math.min((goal.days_passed / goal.days_total) * 100, 100)}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
          <View style={styles.timelineInfo}>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Start</Text>
              <Text style={styles.timelineValue}>
                {formatDate(goal.start_date)}
              </Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Target</Text>
              <Text style={styles.timelineValue}>
                {formatDate(goal.target_date)}
              </Text>
            </View>
          </View>
          <View style={styles.timelineDaysRow}>
            <Text style={styles.timelineDaysLabel}>
              {goal.days_remaining >= 0
                ? `${goal.days_remaining} days remaining`
                : `${Math.abs(goal.days_remaining)} days overdue`}
            </Text>
          </View>
        </View>

        {/* Saving Rate Analysis */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>💰 Saving Analysis</Text>
          <View style={styles.analysisRow}>
            <View style={styles.analysisItem}>
              <Text style={styles.analysisLabel}>Monthly Rate Needed</Text>
              <Text
                style={[
                  styles.analysisValue,
                  { color: goal.monthly_rate_needed > 0 ? '#F59E0B' : '#10B981' },
                ]}
              >
                {formatCurrency(Math.max(goal.monthly_rate_needed, 0), currency)}
              </Text>
            </View>
            <View style={styles.analysisDivider} />
            <View style={styles.analysisItem}>
              <Text style={styles.analysisLabel}>Actual Monthly Rate</Text>
              <Text style={[styles.analysisValue, { color: '#3B82F6' }]}>
                {formatCurrency(goal.actual_monthly_rate, currency)}
              </Text>
            </View>
          </View>
          {goal.actual_monthly_rate < goal.monthly_rate_needed &&
            !isCompleted &&
            goal.days_remaining > 0 && (
              <View style={styles.analysisHint}>
                <Text style={styles.analysisHintText}>
                  💡 You need to save{' '}
                  {formatCurrency(
                    goal.monthly_rate_needed - goal.actual_monthly_rate,
                    currency
                  )}{' '}
                  more per month to reach your goal on time
                </Text>
              </View>
            )}
        </View>

        {/* Goal Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Goal Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expected Progress</Text>
            <Text style={styles.detailValue}>
              {Math.round(goal.expected_progress)}%
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Actual Progress</Text>
            <Text style={styles.detailValue}>{Math.round(goal.progress)}%</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Progress Difference</Text>
            <Text
              style={[
                styles.detailValue,
                {
                  color:
                    goal.progress >= goal.expected_progress ? '#10B981' : '#EF4444',
                },
              ]}
            >
              {goal.progress >= goal.expected_progress ? '+' : ''}
              {Math.round(goal.progress - goal.expected_progress)}%
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: statusColor }]}>
              {goal.is_on_track ? '✅ On Track' : '⚠️ Behind'}
            </Text>
          </View>
        </View>

        {/* Projection */}
        {!isCompleted && goal.days_remaining > 0 && (
          <View style={styles.projectionCard}>
            <Text style={styles.projectionTitle}>📊 Projection</Text>
            <Text style={styles.projectionText}>
              At your current saving rate of{' '}
              {formatCurrency(goal.actual_monthly_rate, currency)}/month, you will
              save approximately{' '}
              {formatCurrency(
                goal.actual_monthly_rate *
                  Math.max(differenceInMonths(new Date(goal.target_date), new Date()), 0),
                currency
              )}{' '}
              by the target date.
            </Text>
            {goal.actual_monthly_rate *
              Math.max(differenceInMonths(new Date(goal.target_date), new Date()), 0) <
              goal.target_amount && (
              <Text style={styles.projectionWarning}>
                ⚠️ This may not be enough to reach your {formatCurrency(goal.target_amount, currency)} goal.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  goalHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  goalIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconTextLarge: {
    fontSize: 40,
  },
  goalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  celebrationCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
  },
  celebrationMessage: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  timelineBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  timelineProgress: {
    height: '100%',
    borderRadius: 4,
  },
  timelineInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineItem: {
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  timelineDaysRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  timelineDaysLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisItem: {
    flex: 1,
    alignItems: 'center',
  },
  analysisLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  analysisValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  analysisDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  analysisHint: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  analysisHintText: {
    fontSize: 13,
    color: '#92400E',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  projectionCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  projectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  projectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  projectionWarning: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 12,
    fontWeight: '600',
  },
});

export default GoalDetailScreen;
