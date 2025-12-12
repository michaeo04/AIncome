// All Transactions Screen - Complete list with filters and search
// Shows all user transactions with sorting, filtering by type/category, and search

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
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

type AllTransactionsScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

type FilterType = 'all' | 'income' | 'expense';
type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'last3months';

interface FilterOption {
  value: FilterType;
  label: string;
  icon: string;
}

interface TimeFilterOption {
  value: TimeFilter;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All', icon: '💰' },
  { value: 'income', label: 'Income', icon: '💵' },
  { value: 'expense', label: 'Expense', icon: '💸' },
];

const TIME_FILTERS: TimeFilterOption[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last3months', label: 'Last 3 Months' },
];

const AllTransactionsScreen: React.FC = () => {
  const navigation = useNavigation<AllTransactionsScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState('VND');

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    count: 0,
  });

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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    statsCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.colors.border,
    },
    statLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    statValue: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      paddingVertical: theme.spacing.xs,
    },
    filtersWrapper: {
      height: 116,
      flexShrink: 0,
      backgroundColor: theme.colors.background,
    },
    filterScrollContainer: {
      marginBottom: 10,
      marginTop: 4,
      height: 50,
      maxHeight: 50,
    },
    filterContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 4,
      gap: theme.spacing.sm,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      marginRight: 0,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      width: 115,
      height: 42,
      flexShrink: 0,
      flexGrow: 0,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterIcon: {
      fontSize: 16,
      marginRight: 5,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textSecondary,
      includeFontPadding: false,
      textAlignVertical: 'center',
      flexShrink: 0,
    },
    filterLabelActive: {
      color: theme.colors.textWhite,
    },
    timeFilterScrollContainer: {
      marginBottom: 12,
      marginTop: 2,
      height: 42,
      maxHeight: 42,
    },
    timeFilterContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 4,
      gap: theme.spacing.sm,
    },
    timeFilterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 0,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 34,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
      flexGrow: 0,
    },
    timeFilterChipActive: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
    },
    timeFilterLabel: {
      fontSize: 13,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    timeFilterLabelActive: {
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.bold,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    transactionCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    transactionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    transactionIcon: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.full,
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
      marginBottom: 2,
    },
    transactionNote: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    transactionDate: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    transactionRight: {
      alignItems: 'flex-end',
    },
    transactionAmount: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
    },
    incomeAmount: {
      color: theme.colors.success,
    },
    expenseAmount: {
      color: theme.colors.danger,
    },
    separator: {
      height: theme.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateIcon: {
      fontSize: 64,
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
      paddingHorizontal: theme.spacing.xxl,
    },
  }));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUserCurrency(), fetchAllTransactions()]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const fetchUserCurrency = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (data) {
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    }
  };

  const fetchAllTransactions = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transactionData = data as any;
        setTransactions(transactionData);
        applyFilters(transactionData, selectedFilter, selectedTimeFilter, searchQuery);
        calculateStats(transactionData);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getDateRange = (timeFilter: TimeFilter): { start: Date; end: Date } | null => {
    const now = new Date();

    switch (timeFilter) {
      case 'today':
        return {
          start: new Date(now.setHours(0, 0, 0, 0)),
          end: new Date(now.setHours(23, 59, 59, 999)),
        };
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case 'last3months':
        return {
          start: subMonths(startOfMonth(now), 2),
          end: endOfMonth(now),
        };
      default:
        return null;
    }
  };

  const applyFilters = (
    data: Transaction[],
    typeFilter: FilterType,
    timeFilter: TimeFilter,
    search: string
  ) => {
    let filtered = [...data];

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Filter by time
    const dateRange = getDateRange(timeFilter);
    if (dateRange) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
      });
    }

    // Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((t) => {
        const note = t.note?.toLowerCase() || '';
        const category = t.category?.name?.toLowerCase() || '';
        const amount = t.amount.toString();
        return note.includes(query) || category.includes(query) || amount.includes(query);
      });
    }

    setFilteredTransactions(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (data: Transaction[]) => {
    const income = data
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = data
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalIncome: income,
      totalExpense: expense,
      count: data.length,
    });
  };

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);
    applyFilters(transactions, filter, selectedTimeFilter, searchQuery);
  };

  const handleTimeFilterChange = (timeFilter: TimeFilter) => {
    setSelectedTimeFilter(timeFilter);
    applyFilters(transactions, selectedFilter, timeFilter, searchQuery);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    applyFilters(transactions, selectedFilter, selectedTimeFilter, text);
  };

  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionLeft}>
        <LinearGradient
          colors={[item.category?.color + '20' || '#E5E7EB', item.category?.color + '10' || '#F3F4F6']}
          style={styles.transactionIcon}
        >
          <Text style={styles.transactionIconText}>
            {item.category?.icon || '💰'}
          </Text>
        </LinearGradient>

        <View style={styles.transactionInfo}>
          <Text style={styles.transactionCategory}>
            {item.category?.name || 'Uncategorized'}
          </Text>
          <Text style={styles.transactionNote} numberOfLines={1}>
            {item.note || formatDate(item.date)}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.date)}
          </Text>
        </View>
      </View>

      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            item.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
          ]}
        >
          {item.type === 'income' ? '+' : '-'}
          {formatCurrency(Number(item.amount), currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Transactions</Text>
          <Text style={styles.statValue}>{stats.count}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {formatCurrency(stats.totalIncome, currency)}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Expense</Text>
          <Text style={[styles.statValue, { color: theme.colors.danger }]}>
            {formatCurrency(stats.totalExpense, currency)}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Container - Fixed Height */}
      <View style={styles.filtersWrapper}>
        {/* Type Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollContainer}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterChip,
                selectedFilter === option.value && styles.filterChipActive,
              ]}
              onPress={() => handleFilterChange(option.value)}
            >
              <Text style={styles.filterIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.filterLabel,
                  selectedFilter === option.value && styles.filterLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timeFilterScrollContainer}
          contentContainerStyle={styles.timeFilterContainer}
        >
          {TIME_FILTERS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeFilterChip,
                selectedTimeFilter === option.value && styles.timeFilterChipActive,
              ]}
              onPress={() => handleTimeFilterChange(option.value)}
            >
              <Text
                style={[
                  styles.timeFilterLabel,
                  selectedTimeFilter === option.value && styles.timeFilterLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📊</Text>
            <Text style={styles.emptyStateText}>No transactions found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search or filters' : 'Start by adding your first transaction'}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

export default AllTransactionsScreen;
