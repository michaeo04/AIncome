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
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { usePendingTransactionsStore } from '../../stores/pendingTransactionsStore';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Home'>;

interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const { pendingTransactions, fetchPending, subscribeToRealtimeUpdates, unsubscribeFromRealtime } =
    usePendingTransactionsStore();

  const [balance, setBalance] = useState<BalanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [fullName, setFullName] = useState<string | null>(null);

  // Create themed styles
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
      padding: theme.spacing.lg,
      paddingBottom: 100,
    },
    header: {
      marginBottom: theme.spacing.xl,
    },
    greeting: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    balanceCard: {
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xxl,
      marginBottom: theme.spacing.lg,
      ...theme.shadows.lg,
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    balanceLabel: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textWhite,
      fontWeight: theme.fontWeight.semibold,
    },
    balanceBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },
    balanceBadgeText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textWhite,
      fontWeight: theme.fontWeight.semibold,
    },
    balanceAmount: {
      fontSize: theme.fontSize.massive,
      fontWeight: theme.fontWeight.extrabold,
      color: theme.colors.textWhite,
      marginBottom: theme.spacing.xxl,
    },
    balanceNegative: {
      color: theme.colors.dangerLight, // Dynamic theme color instead of hardcoded
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
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    incomeIcon: {},
    expenseIcon: {},
    balanceIconText: {
      fontSize: theme.fontSize.xl,
      color: theme.colors.textWhite,
      fontWeight: theme.fontWeight.bold,
    },
    balanceItemLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textWhite,
      opacity: 0.9,
      marginBottom: theme.spacing.xs,
    },
    balanceItemAmount: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textWhite,
    },
    quickActionsSection: {
      marginBottom: theme.spacing.xl,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    quickActionIcon: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    quickActionIconText: {
      fontSize: theme.fontSize.xxl,
    },
    quickActionLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    transactionsSection: {
      marginBottom: theme.spacing.lg,
    },
    transactionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    seeAllText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.medium,
    },
    emptyState: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.huge,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    emptyStateIcon: {
      fontSize: 56,
      marginBottom: theme.spacing.lg,
    },
    emptyStateText: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    emptyStateSubtext: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    transactionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    transactionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    transactionIcon: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    transactionIconText: {
      fontSize: theme.fontSize.xxl,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionCategory: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    transactionNote: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    transactionRight: {
      alignItems: 'flex-end',
    },
    transactionAmount: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
    },
    incomeAmount: {
      color: theme.colors.success,
    },
    expenseAmount: {
      color: theme.colors.danger,
    },
    transactionDate: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    // Pending transactions banner styles
    pendingBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.warning + '20',
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning,
      ...theme.shadows.sm,
    },
    pendingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    pendingIcon: {
      fontSize: 32,
      marginRight: theme.spacing.md,
    },
    pendingTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    pendingSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    pendingArrow: {
      fontSize: 28,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.bold,
    },
  }));

  // Get dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    // Use full name from profile, fallback to email username if not set
    const username = fullName || user?.email?.split('@')[0] || 'there';

    let timeGreeting = '';
    let emoji = '';

    if (hour < 12) {
      timeGreeting = 'Good morning';
      emoji = '☀️';
    } else if (hour < 17) {
      timeGreeting = 'Good afternoon';
      emoji = '🌤️';
    } else if (hour < 21) {
      timeGreeting = 'Good evening';
      emoji = '🌆';
    } else {
      timeGreeting = 'Good night';
      emoji = '🌙';
    }

    return { timeGreeting, emoji, username };
  };

  const getMotivationalMessage = () => {
    const messages = [
      'Take control of your finances today',
      'Every penny counts towards your goals',
      'Building wealth, one transaction at a time',
      'Your financial journey starts here',
      'Track smart, spend wise, save more',
      'Making your money work for you',
      'Small steps lead to big savings',
    ];

    // Use date as seed for consistent daily message
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return messages[dayOfYear % messages.length];
  };

  // Fetch user profile (currency and name)
  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency, name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setCurrency(data.currency);
        setFullName(data.name);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
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
    await Promise.all([fetchUserProfile(), fetchBalance(), fetchTransactions()]);
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

  // Fetch and subscribe to pending transactions
  useEffect(() => {
    if (user) {
      console.log('📡 HomeScreen: Setting up pending transactions for user:', user.id);
      fetchPending(user.id);
      subscribeToRealtimeUpdates(user.id);

      return () => {
        console.log('📴 HomeScreen: Cleaning up pending transactions subscription');
        unsubscribeFromRealtime();
      };
    }

    return () => {
      unsubscribeFromRealtime();
    };
  }, [user]);

  // Debug: Log pending transactions count when it changes
  useEffect(() => {
    console.log('📊 HomeScreen: Pending transactions count:', pendingTransactions.length);
    if (pendingTransactions.length > 0) {
      console.log('📥 Pending transactions:', pendingTransactions);
    }
  }, [pendingTransactions]);

  // Navigate to add transaction
  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction', {});
  };

  // Navigate to add income
  const handleAddIncome = () => {
    navigation.navigate('AddTransaction', { initialType: 'income' });
  };

  // Navigate to add expense
  const handleAddExpense = () => {
    navigation.navigate('AddTransaction', { initialType: 'expense' });
  };

  // Navigate to transaction detail
  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  // Navigate to all transactions
  const handleSeeAllTransactions = () => {
    navigation.navigate('AllTransactions');
  };

  // Navigate to pending transactions
  const handlePendingTransactions = () => {
    navigation.navigate('PendingTransactions');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          <Text style={styles.greeting}>
            {getGreeting().timeGreeting}, {getGreeting().username}! {getGreeting().emoji}
          </Text>
          <Text style={styles.subtitle}>{getMotivationalMessage()}</Text>
        </View>

        {/* Pending Transactions Banner */}
        {pendingTransactions.length > 0 && (
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={handlePendingTransactions}
          >
            <View style={styles.pendingLeft}>
              <Text style={styles.pendingIcon}>📥</Text>
              <View>
                <Text style={styles.pendingTitle}>
                  {pendingTransactions.length} pending transaction{pendingTransactions.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.pendingSubtitle}>Tap to review</Text>
              </View>
            </View>
            <Text style={styles.pendingArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Balance Card with Gradient */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark, theme.colors.secondary]}
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
                colors={[theme.colors.success, theme.colors.successDark]}
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
                colors={[theme.colors.danger, theme.colors.dangerDark]}
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

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleAddExpense}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={styles.quickActionIconText}>💸</Text>
              </View>
              <Text style={styles.quickActionLabel}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleAddIncome}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.success + '20' }]}>
                <Text style={styles.quickActionIconText}>💰</Text>
              </View>
              <Text style={styles.quickActionLabel}>Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleSeeAllTransactions}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondary + '20' }]}>
                <Text style={styles.quickActionIconText}>📊</Text>
              </View>
              <Text style={styles.quickActionLabel}>View All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                navigation.dispatch(
                  CommonActions.navigate({
                    name: 'BudgetTab',
                    params: { screen: 'Budget' },
                  })
                );
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                <Text style={styles.quickActionIconText}>🎯</Text>
              </View>
              <Text style={styles.quickActionLabel}>Budgets</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={handleSeeAllTransactions}>
              <Text style={styles.seeAllText}>See All →</Text>
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

export default HomeScreen;
