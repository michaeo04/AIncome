// Budget Detail Screen - View Budget Details and Transaction History

import React, { useState, useEffect, useCallback } from 'react';
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
import { BudgetStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

type BudgetDetailScreenNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  'BudgetDetail'
>;
type BudgetDetailScreenRouteProp = RouteProp<BudgetStackParamList, 'BudgetDetail'>;

interface Budget {
  id: string;
  amount: number;
  period: string;
  start_date: string;
  end_date: string;
  alert_threshold: number;
  category_id: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
  spent: number;
  remaining: number;
  percentage: number;
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
  note: string | null;
}

const BudgetDetailScreen: React.FC = () => {
  const navigation = useNavigation<BudgetDetailScreenNavigationProp>();
  const route = useRoute<BudgetDetailScreenRouteProp>();
  const { user } = useAuthStore();

  const { budgetId } = route.params;

  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [budgetId])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchBudget(), fetchUserCurrency()]);
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

  const fetchBudget = async () => {
    if (!user) return;

    try {
      // Fetch budget with category info
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single();

      if (budgetError) throw budgetError;
      if (!budgetData) {
        Alert.alert('Error', 'Budget not found');
        navigation.goBack();
        return;
      }

      // Calculate spending
      const { data: transactionData, error: txError } = await supabase
        .from('transactions')
        .select('id, amount, date, note')
        .eq('user_id', user.id)
        .eq('category_id', budgetData.category_id)
        .eq('type', 'expense')
        .gte('date', budgetData.start_date)
        .lte('date', budgetData.end_date)
        .order('date', { ascending: false });

      if (txError) throw txError;

      const spent = transactionData
        ? transactionData.reduce((sum, tx) => sum + Number(tx.amount), 0)
        : 0;

      const remaining = Number(budgetData.amount) - spent;
      const percentage = Math.min((spent / Number(budgetData.amount)) * 100, 100);

      setBudget({
        ...budgetData,
        spent,
        remaining,
        percentage,
      });

      setTransactions(transactionData || []);
    } catch (error: any) {
      console.error('Error fetching budget:', error);
      Alert.alert('Error', 'Failed to load budget details');
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddBudget', { budgetId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget? This action cannot be undone.',
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
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Budget deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      Alert.alert('Error', 'Failed to delete budget');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return '#EF4444';
    if (percentage >= threshold) return '#F59E0B';
    return '#10B981';
  };

  const getStatusText = (percentage: number, threshold: number) => {
    if (percentage >= 100) return 'Over Budget';
    if (percentage >= threshold) return 'Warning';
    return 'On Track';
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'month':
        return 'Monthly';
      case 'quarter':
        return 'Quarterly';
      case 'year':
        return 'Yearly';
      default:
        return period.charAt(0).toUpperCase() + period.slice(1);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  if (!budget) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Budget not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(budget.percentage, budget.alert_threshold);
  const statusText = getStatusText(budget.percentage, budget.alert_threshold);

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

        {/* Category Info */}
        <View style={styles.categoryCard}>
          <View
            style={[
              styles.categoryIconLarge,
              { backgroundColor: budget.category.color + '20' },
            ]}
          >
            <Text style={styles.categoryIconTextLarge}>{budget.category.icon}</Text>
          </View>
          <Text style={styles.categoryName}>{budget.category.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Budget Progress</Text>
            <Text style={[styles.progressPercentage, { color: statusColor }]}>
              {Math.round(budget.percentage)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${budget.percentage}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Spent</Text>
              <Text style={[styles.amountValue, { color: '#EF4444' }]}>
                {formatCurrency(budget.spent, currency)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Budget</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(budget.amount, currency)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Remaining</Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: budget.remaining >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {formatCurrency(budget.remaining, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Budget Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Period</Text>
            <Text style={styles.infoValue}>{getPeriodLabel(budget.period)}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>{formatDate(budget.start_date)}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Date</Text>
            <Text style={styles.infoValue}>{formatDate(budget.end_date)}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Alert Threshold</Text>
            <Text style={styles.infoValue}>{budget.alert_threshold}%</Text>
          </View>
        </View>

        {/* Warning Alert */}
        {budget.percentage >= budget.alert_threshold && (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor:
                  budget.percentage >= 100 ? '#FEE2E2' : '#FEF3C7',
              },
            ]}
          >
            <Text style={styles.alertIcon}>
              {budget.percentage >= 100 ? '🚨' : '⚠️'}
            </Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {budget.percentage >= 100
                  ? 'Budget Exceeded!'
                  : 'Budget Alert'}
              </Text>
              <Text style={styles.alertMessage}>
                {budget.percentage >= 100
                  ? `You have exceeded your budget by ${formatCurrency(
                      Math.abs(budget.remaining),
                      currency
                    )}`
                  : `You have reached ${Math.round(budget.percentage)}% of your budget limit`}
              </Text>
            </View>
          </View>
        )}

        {/* Transactions History */}
        <View style={styles.transactionsSection}>
          <Text style={styles.transactionsTitle}>
            Recent Transactions ({transactions.length})
          </Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Expenses in this category will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.date)}
                    </Text>
                    {transaction.note && (
                      <Text style={styles.transactionNote} numberOfLines={1}>
                        {transaction.note}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.transactionAmount}>
                    -{formatCurrency(transaction.amount, currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
  categoryCard: {
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
  categoryIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconTextLarge: {
    fontSize: 40,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
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
  infoCard: {
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  alertCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default BudgetDetailScreen;
