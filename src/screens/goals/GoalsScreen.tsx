// Goals Screen - Display Saving Goals with Progress Tracking

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GoalsStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { differenceInDays, differenceInMonths } from 'date-fns';

type GoalsScreenNavigationProp = StackNavigationProp<GoalsStackParamList, 'Goals'>;

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  start_date: string;
  status: 'active' | 'completed' | 'paused';
  icon: string;
  color: string;
  progress: number;
  monthly_rate_needed: number;
  is_on_track: boolean;
  days_remaining: number;
}

const GoalsScreen: React.FC = () => {
  const navigation = useNavigation<GoalsScreenNavigationProp>();
  const { user } = useAuthStore();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [currency, setCurrency] = useState('VND');
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchGoals(), fetchUserCurrency(), calculateNetBalance()]);
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

  const calculateNetBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id);

      if (error) throw error;

      const income = data
        ? data
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0)
        : 0;

      const expense = data
        ? data
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0)
        : 0;

      setNetBalance(income - expense);
    } catch (error: any) {
      console.error('Error calculating net balance:', error);
    }
  };

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data: goalsData, error } = await supabase
        .from('saving_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (goalsData) {
        // Calculate progress for each goal
        const goalsWithProgress = await Promise.all(
          goalsData.map(async (goal: any) => {
            // Get transactions since goal start date for progress
            const { data: transactions } = await supabase
              .from('transactions')
              .select('type, amount')
              .eq('user_id', user.id)
              .gte('date', goal.start_date);

            const goalIncome = transactions
              ? transactions
                  .filter((t) => t.type === 'income')
                  .reduce((sum, t) => sum + Number(t.amount), 0)
              : 0;

            const goalExpense = transactions
              ? transactions
                  .filter((t) => t.type === 'expense')
                  .reduce((sum, t) => sum + Number(t.amount), 0)
              : 0;

            const currentAmount = goalIncome - goalExpense;
            const progress = Math.min(
              (currentAmount / Number(goal.target_amount)) * 100,
              100
            );

            // Calculate days remaining
            const today = new Date();
            const targetDate = new Date(goal.target_date);
            const daysRemaining = differenceInDays(targetDate, today);

            // Calculate monthly rate needed
            const monthsRemaining = Math.max(
              differenceInMonths(targetDate, today),
              1
            );
            const amountRemaining = Number(goal.target_amount) - currentAmount;
            const monthlyRateNeeded = amountRemaining / monthsRemaining;

            // Check if on track (current progress >= expected progress)
            const totalDays = differenceInDays(
              targetDate,
              new Date(goal.start_date)
            );
            const daysPassed = totalDays - daysRemaining;
            const expectedProgress = (daysPassed / totalDays) * 100;
            const isOnTrack = progress >= expectedProgress || progress >= 100;

            return {
              ...goal,
              current_amount: currentAmount,
              progress,
              monthly_rate_needed: monthlyRateNeeded,
              is_on_track: isOnTrack,
              days_remaining: daysRemaining,
            };
          })
        );

        setGoals(goalsWithProgress);
      }
    } catch (error: any) {
      console.error('Error fetching goals:', error);
    }
  };

  const getStatusColor = (goal: Goal) => {
    if (goal.status === 'completed' || goal.progress >= 100) return '#10B981';
    if (goal.is_on_track) return '#3B82F6';
    return '#F59E0B';
  };

  const getStatusText = (goal: Goal) => {
    if (goal.status === 'completed' || goal.progress >= 100) return 'Completed';
    if (goal.days_remaining < 0) return 'Overdue';
    if (goal.is_on_track) return 'On Track';
    return 'Behind';
  };

  const handleGoalPress = (goalId: string) => {
    navigation.navigate('GoalDetail', { goalId });
  };

  const handleAddGoal = () => {
    navigation.navigate('AddGoal', {});
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading goals...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Saving Goals</Text>
          <Text style={styles.headerSubtitle}>
            Net Balance: {formatCurrency(netBalance, currency)}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
          <Text style={styles.addButtonText}>+ Add Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No Saving Goals Yet</Text>
            <Text style={styles.emptySubtitle}>
              Track your savings from net balance.{'\n'}
              Goals are calculated from Income - Expenses.{'\n'}
              Set a target and watch your progress!
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddGoal}>
              <Text style={styles.emptyButtonText}>Create Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => {
              const statusColor = getStatusColor(goal);
              const statusText = getStatusText(goal);

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => handleGoalPress(goal.id)}
                  activeOpacity={0.7}
                >
                  {/* Goal Header */}
                  <View style={styles.goalHeader}>
                    <View
                      style={[
                        styles.goalIcon,
                        { backgroundColor: goal.color + '20' },
                      ]}
                    >
                      <Text style={styles.goalIconText}>{goal.icon}</Text>
                    </View>
                    <View style={styles.goalHeaderInfo}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalTarget}>
                        Target: {formatCurrency(goal.target_amount, currency)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text
                        style={[styles.progressPercentage, { color: statusColor }]}
                      >
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
                    <View style={styles.progressAmounts}>
                      <Text style={styles.progressAmount}>
                        {formatCurrency(goal.current_amount, currency)}
                      </Text>
                      <Text style={styles.progressRemaining}>
                        {formatCurrency(
                          goal.target_amount - goal.current_amount,
                          currency
                        )}{' '}
                        to go
                      </Text>
                    </View>
                  </View>

                  {/* Goal Info */}
                  <View style={styles.goalInfo}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>📅 Target Date</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(goal.target_date)}
                      </Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>💰 Monthly Need</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { color: goal.monthly_rate_needed > 0 ? '#F59E0B' : '#10B981' },
                        ]}
                      >
                        {formatCurrency(
                          Math.max(goal.monthly_rate_needed, 0),
                          currency
                        )}
                        /mo
                      </Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>⏰ Time Left</Text>
                      <Text style={styles.infoValue}>
                        {goal.days_remaining >= 0
                          ? `${goal.days_remaining} days`
                          : 'Overdue'}
                      </Text>
                    </View>
                  </View>

                  {/* Celebration Banner for Completed Goals */}
                  {(goal.status === 'completed' || goal.progress >= 100) && (
                    <View style={styles.celebrationBanner}>
                      <Text style={styles.celebrationText}>
                        🎉 Congratulations! Goal achieved!
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  goalsList: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalIconText: {
    fontSize: 24,
  },
  goalHeaderInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressRemaining: {
    fontSize: 12,
    color: '#6B7280',
  },
  goalInfo: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  celebrationBanner: {
    marginTop: 12,
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
});

export default GoalsScreen;
