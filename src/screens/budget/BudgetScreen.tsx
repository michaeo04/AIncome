// Budget Screen - View and Manage Budgets

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BudgetStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

type BudgetScreenNavigationProp = StackNavigationProp<BudgetStackParamList, 'Budget'>;

interface BudgetWithSpending {
  id: string;
  category_id: string;
  amount: number;
  period: string;
  start_date: string;
  end_date: string;
  alert_threshold: number;
  categories: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  spent: number;
  remaining: number;
  percentage: number;
}

const BudgetScreen: React.FC = () => {
  const navigation = useNavigation<BudgetScreenNavigationProp>();
  const { user } = useAuthStore();

  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState('VND');

  // Fetch user currency
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

  // Fetch budgets with spending
  const fetchBudgets = async () => {
    if (!user) return;

    try {
      // Fetch budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          id,
          category_id,
          amount,
          period,
          start_date,
          end_date,
          alert_threshold,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      if (!budgetsData || budgetsData.length === 0) {
        setBudgets([]);
        return;
      }

      // Calculate spending for each budget
      const budgetsWithSpending = await Promise.all(
        budgetsData.map(async (budget: any) => {
          const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category_id', budget.category_id)
            .eq('type', 'expense')
            .gte('date', budget.start_date)
            .lte('date', budget.end_date);

          if (txError) throw txError;

          const spent = transactions
            ? transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
            : 0;

          const remaining = Number(budget.amount) - spent;
          const percentage = Math.min(
            (spent / Number(budget.amount)) * 100,
            100
          );

          return {
            ...budget,
            spent,
            remaining,
            percentage,
          };
        })
      );

      setBudgets(budgetsWithSpending);
    } catch (error: any) {
      console.error('Error fetching budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    }
  };

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUserCurrency(), fetchBudgets()]);
    setIsLoading(false);
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Load on mount and when screen is focused
  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBudgets();
    }, [])
  );

  // Navigate to add budget
  const handleAddBudget = () => {
    navigation.navigate('AddBudget', {});
  };

  // Navigate to budget detail
  const handleBudgetPress = (budgetId: string) => {
    navigation.navigate('BudgetDetail', { budgetId });
  };

  // Get status color gradient based on percentage
  const getStatusGradient = (percentage: number, threshold: number): string[] => {
    if (percentage >= 100) return [COLORS.danger, COLORS.dangerDark]; // Red gradient
    if (percentage >= threshold) return [COLORS.warning, COLORS.warningDark]; // Amber gradient
    return [COLORS.success, COLORS.successDark]; // Green gradient
  };

  // Get status color based on percentage
  const getStatusColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return COLORS.danger;
    if (percentage >= threshold) return COLORS.warning;
    return COLORS.success;
  };

  // Get status text
  const getStatusText = (percentage: number, threshold: number) => {
    if (percentage >= 100) return '🚨 Over Budget';
    if (percentage >= threshold) return '⚠️ Warning';
    return '✅ On Track';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading budgets...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budgets</Text>
        <TouchableOpacity onPress={handleAddBudget}>
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📊</Text>
            <Text style={styles.emptyStateText}>No budgets yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Track spending by category with budgets.{'\n'}
              Set limits for expenses like Food, Transport, etc.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddBudget}>
              <Text style={styles.emptyButtonText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map((budget) => {
            const statusColor = getStatusColor(
              budget.percentage,
              budget.alert_threshold
            );
            const statusText = getStatusText(
              budget.percentage,
              budget.alert_threshold
            );
            const statusGradient = getStatusGradient(
              budget.percentage,
              budget.alert_threshold
            );

            return (
              <TouchableOpacity
                key={budget.id}
                style={styles.budgetCard}
                onPress={() => handleBudgetPress(budget.id)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetInfo}>
                    <LinearGradient
                      colors={[budget.categories.color + '40', budget.categories.color + '70']}
                      style={styles.categoryIcon}
                    >
                      <Text style={styles.categoryIconText}>
                        {budget.categories.icon}
                      </Text>
                    </LinearGradient>
                    <View style={styles.budgetText}>
                      <Text style={styles.budgetCategory}>
                        {budget.categories.name}
                      </Text>
                      <Text style={styles.budgetPeriod}>
                        {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <LinearGradient
                    colors={statusGradient}
                    style={styles.statusBadge}
                  >
                    <Text style={styles.statusText}>{statusText}</Text>
                  </LinearGradient>
                </View>

                {/* Progress Bar with Gradient */}
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={statusGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressFill,
                        { width: `${budget.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {budget.percentage.toFixed(0)}%
                  </Text>
                </View>

                {/* Amounts */}
                <View style={styles.amountsRow}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Spent</Text>
                    <Text style={[styles.amountValue, { color: statusColor }]}>
                      {formatCurrency(budget.spent, currency)}
                    </Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Budget</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(budget.amount, currency)}
                    </Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Remaining</Text>
                    <Text
                      style={[
                        styles.amountValue,
                        { color: budget.remaining < 0 ? '#EF4444' : '#10B981' },
                      ]}
                    >
                      {formatCurrency(budget.remaining, currency)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 24,
  },
  budgetText: {
    flex: 1,
  },
  budgetCategory: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  budgetPeriod: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 40,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default BudgetScreen;
