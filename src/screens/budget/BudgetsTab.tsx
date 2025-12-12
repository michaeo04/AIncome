// BudgetsTab - Budgets section (extracted from BudgetScreen)

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BudgetStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { formatCurrency } from '../../utils/helpers';
import { Theme } from '../../theme/modernTheme';

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

// Helper functions with theme
const getStatusGradient = (percentage: number, threshold: number, theme: Theme): string[] => {
  if (percentage >= 100) return [theme.colors.danger, theme.colors.dangerDark];
  if (percentage >= threshold) return [theme.colors.warning, theme.colors.warningDark];
  return [theme.colors.success, theme.colors.successDark];
};

const getStatusColor = (percentage: number, threshold: number, theme: Theme) => {
  if (percentage >= 100) return theme.colors.danger;
  if (percentage >= threshold) return theme.colors.warning;
  return theme.colors.success;
};

const getStatusText = (percentage: number, threshold: number) => {
  if (percentage >= 100) return '🚨 Over Budget';
  if (percentage >= threshold) return '⚠️ Warning';
  return '✅ On Track';
};

const BudgetsTab: React.FC = () => {
  const navigation = useNavigation<BudgetScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState('VND');

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    scrollContent: {
      padding: theme.spacing.md,
      paddingBottom: 80,
    },
    emptyState: {
      alignItems: 'center',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginTop: theme.spacing.xl,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    emptyStateText: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    emptyStateSubtext: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.lg,
    },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    emptyButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.white,
    },
    budgetCard: {
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    budgetCardGradient: {
      padding: theme.spacing.lg,
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    budgetHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    categoryIconText: {
      fontSize: 24,
    },
    budgetInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: 2,
    },
    budgetPeriod: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
    },
    statusText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
    },
    amountContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    amountRow: {
      flex: 1,
    },
    spentLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    spentAmount: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
    },
    budgetLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 2,
      textAlign: 'right',
    },
    budgetAmount: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textAlign: 'right',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    progressBarBackground: {
      flex: 1,
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: theme.borderRadius.round,
    },
    percentageText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      marginLeft: theme.spacing.sm,
      minWidth: 40,
      textAlign: 'right',
    },
    remainingContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    remainingLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    remainingAmount: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.lg,
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    fabGradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fabText: {
      fontSize: 32,
      color: theme.colors.white,
      fontWeight: theme.fontWeight.bold,
    },
  }));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchBudgets(), fetchUserCurrency()]);
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

  const fetchBudgets = async () => {
    if (!user) return;

    try {
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

      const budgetsWithSpending = await Promise.all(
        budgetsData.map(async (budget: any) => {
          const { data: spendingData, error: spendingError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category_id', budget.category_id)
            .eq('type', 'expense')
            .gte('date', budget.start_date)
            .lte('date', budget.end_date);

          if (spendingError) {
            console.error('Error fetching spending:', spendingError);
            return null;
          }

          const spent = spendingData
            ? spendingData.reduce((sum, t) => sum + Number(t.amount), 0)
            : 0;

          const remaining = Number(budget.amount) - spent;
          const percentage = (spent / Number(budget.amount)) * 100;

          return {
            id: budget.id,
            category_id: budget.category_id,
            amount: Number(budget.amount),
            period: budget.period,
            start_date: budget.start_date,
            end_date: budget.end_date,
            alert_threshold: budget.alert_threshold,
            categories: budget.categories,
            spent,
            remaining,
            percentage,
          };
        })
      );

      setBudgets(budgetsWithSpending.filter((b) => b !== null) as BudgetWithSpending[]);
    } catch (error: any) {
      console.error('Error fetching budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    }
  };

  const handleAddBudget = () => {
    navigation.navigate('AddBudget');
  };

  const handleBudgetPress = (budget: BudgetWithSpending) => {
    navigation.navigate('BudgetDetail', { budgetId: budget.id });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
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
          budgets.map((budget) => (
            <TouchableOpacity
              key={budget.id}
              style={styles.budgetCard}
              onPress={() => handleBudgetPress(budget)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[theme.colors.surface, theme.colors.background]}
                style={styles.budgetCardGradient}
              >
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetHeaderLeft}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: budget.categories.color + '20' },
                      ]}
                    >
                      <Text style={styles.categoryIconText}>
                        {budget.categories.icon}
                      </Text>
                    </View>
                    <View style={styles.budgetInfo}>
                      <Text style={styles.categoryName}>
                        {budget.categories.name}
                      </Text>
                      <Text style={styles.budgetPeriod}>
                        {budget.period === 'monthly' ? 'Monthly' :
                         budget.period === 'quarterly' ? 'Quarterly' : 'Yearly'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(budget.percentage, budget.alert_threshold, theme) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(budget.percentage, budget.alert_threshold, theme) },
                      ]}
                    >
                      {getStatusText(budget.percentage, budget.alert_threshold)}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountContainer}>
                  <View style={styles.amountRow}>
                    <Text style={styles.spentLabel}>Spent</Text>
                    <Text style={styles.spentAmount}>
                      {formatCurrency(budget.spent, currency)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.budgetLabel}>Budget</Text>
                    <Text style={styles.budgetAmount}>
                      {formatCurrency(budget.amount, currency)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <LinearGradient
                      colors={getStatusGradient(budget.percentage, budget.alert_threshold, theme)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(budget.percentage, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.percentageText,
                      { color: getStatusColor(budget.percentage, budget.alert_threshold, theme) },
                    ]}
                  >
                    {budget.percentage.toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.remainingContainer}>
                  <Text style={styles.remainingLabel}>
                    {budget.remaining >= 0 ? 'Remaining' : 'Over budget by'}
                  </Text>
                  <Text
                    style={[
                      styles.remainingAmount,
                      {
                        color:
                          budget.remaining >= 0
                            ? getStatusColor(budget.percentage, budget.alert_threshold, theme)
                            : theme.colors.danger,
                      },
                    ]}
                  >
                    {formatCurrency(Math.abs(budget.remaining), currency)}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAddBudget}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default BudgetsTab;
