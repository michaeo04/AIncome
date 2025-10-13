// Home Screen - Dashboard with balance and transactions

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>;

interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();

  const [balance, setBalance] = useState<BalanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      if (data) {
        setCurrency(data.currency);
      }
    } catch (error: any) {
      console.error('Error fetching currency:', error);
    }
  };

  // Fetch balance summary
  const fetchBalance = async () => {
    if (!user) return;

    try {
      // Get all transactions for the user
      const { data: transactionData, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id);

      if (error) throw error;

      if (transactionData) {
        const income = transactionData
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = transactionData
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        setBalance({
          totalIncome: income,
          totalExpense: expense,
          netBalance: income - expense,
        });
      }
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      Alert.alert('Error', 'Failed to load balance');
    }
  };

  // Fetch recent transactions
  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          note,
          date,
          category_id,
          category:categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setTransactions(data as any);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    }
  };

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUserCurrency(), fetchBalance(), fetchTransactions()]);
    setIsLoading(false);
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Load data on mount and when screen is focused
  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Navigate to add transaction
  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction', {});
  };

  // Navigate to transaction detail
  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.email?.split('@')[0]}! 👋</Text>
          <Text style={styles.subtitle}>Here's your financial overview</Text>
        </View>

        {/* Balance Card with Gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark, COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>💰 Net Balance</Text>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>
                {balance.netBalance >= 0 ? '📈 Positive' : '📉 Negative'}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.balanceAmount,
              balance.netBalance < 0 && styles.balanceNegative,
            ]}
          >
            {formatCurrency(balance.netBalance, currency)}
          </Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <LinearGradient
                colors={[COLORS.success, COLORS.successDark]}
                style={[styles.balanceIcon, styles.incomeIcon]}
              >
                <Text style={styles.balanceIconText}>↓</Text>
              </LinearGradient>
              <View>
                <Text style={styles.balanceItemLabel}>Income</Text>
                <Text style={styles.balanceItemAmount}>
                  {formatCurrency(balance.totalIncome, currency)}
                </Text>
              </View>
            </View>

            <View style={styles.balanceItem}>
              <LinearGradient
                colors={[COLORS.danger, COLORS.dangerDark]}
                style={[styles.balanceIcon, styles.expenseIcon]}
              >
                <Text style={styles.balanceIconText}>↑</Text>
              </LinearGradient>
              <View>
                <Text style={styles.balanceItemLabel}>Expense</Text>
                <Text style={styles.balanceItemAmount}>
                  {formatCurrency(balance.totalExpense, currency)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start tracking by adding your first transaction
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => handleTransactionPress(transaction.id)}
              >
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: transaction.category?.color + '20' },
                    ]}
                  >
                    <Text style={styles.transactionIconText}>
                      {transaction.category?.icon || '💰'}
                    </Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionCategory}>
                      {transaction.category?.name || 'Uncategorized'}
                    </Text>
                    <Text style={styles.transactionNote}>
                      {transaction.note || formatDate(transaction.date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === 'income'
                        ? styles.incomeAmount
                        : styles.expenseAmount,
                    ]}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(Number(transaction.amount), currency)}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  balanceCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  balanceLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textWhite,
    fontWeight: FONT_WEIGHT.semibold,
  },
  balanceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  balanceBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textWhite,
    fontWeight: FONT_WEIGHT.semibold,
  },
  balanceAmount: {
    fontSize: FONT_SIZE.massive,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textWhite,
    marginBottom: SPACING.xxl,
  },
  balanceNegative: {
    color: '#FCA5A5',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  incomeIcon: {
    // Gradient applied
  },
  expenseIcon: {
    // Gradient applied
  },
  balanceIconText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textWhite,
    fontWeight: FONT_WEIGHT.bold,
  },
  balanceItemLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textWhite,
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  balanceItemAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
  transactionsSection: {
    marginBottom: SPACING.lg,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.huge,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyStateIcon: {
    fontSize: 56,
    marginBottom: SPACING.lg,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionIconText: {
    fontSize: FONT_SIZE.xxl,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  transactionNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.xs,
  },
  incomeAmount: {
    color: COLORS.success,
  },
  expenseAmount: {
    color: COLORS.danger,
  },
  transactionDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
});

export default HomeScreen;
