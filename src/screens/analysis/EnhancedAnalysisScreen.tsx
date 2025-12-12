// Enhanced Analysis Screen - Modern Financial Insights
// Features: Multiple chart types, time filters, category drill-down, modern UI

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart, LineChart, ProgressChart } from 'react-native-chart-kit';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { formatCurrency } from '../../utils/helpers';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  startOfYear,
  format,
  eachMonthOfInterval,
  eachDayOfInterval,
  differenceInDays,
} from 'date-fns';

const screenWidth = Dimensions.get('window').width;

type TimeFilter = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

interface TimeFilterOption {
  value: TimeFilter;
  label: string;
  emoji: string;
}

const TIME_FILTERS: TimeFilterOption[] = [
  { value: 'day', label: 'Day', emoji: '📅' },
  { value: 'week', label: 'Week', emoji: '📆' },
  { value: 'month', label: 'Month', emoji: '🗓️' },
  { value: 'quarter', label: 'Q', emoji: '📊' },
  { value: 'year', label: 'Year', emoji: '📈' },
  { value: 'all', label: 'All', emoji: '🌐' },
];

interface CategoryData {
  id: string;
  name: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
  transactionCount: number;
}

interface Transaction {
  id: string;
  amount: number;
  note: string;
  date: string;
  category_name: string;
  category_icon: string;
  type: 'income' | 'expense';
}

interface InsightData {
  dailyAverage: number;
  weeklyAverage: number;
  topSpendingDay: string;
  topSpendingAmount: number;
  comparisonPeriod: {
    change: number;
    isIncrease: boolean;
  };
  savingsRate: number;
}

const EnhancedAnalysisScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  // State
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('month');
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  // Category data
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryData[]>([]);

  // Insights
  const [insights, setInsights] = useState<InsightData>({
    dailyAverage: 0,
    weeklyAverage: 0,
    topSpendingDay: '',
    topSpendingAmount: 0,
    comparisonPeriod: { change: 0, isIncrease: false },
    savingsRate: 0,
  });

  // Trends
  const [trendData, setTrendData] = useState<{
    labels: string[];
    income: number[];
    expense: number[];
  }>({ labels: [], income: [], expense: [] });

  // Category drill-down modal
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    headerGradient: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      ...theme.shadows.md,
    },
    headerContent: {
      paddingHorizontal: theme.spacing.lg,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.successLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
      ...theme.shadows.sm,
    },
    headerIcon: {
      fontSize: 28,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.extrabold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
    },
    filterContainer: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: 8,
      maxHeight: 50,
    },
    filterContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 0,
      alignItems: 'center',
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginHorizontal: 4,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      minWidth: 60,
      height: 32,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterEmoji: {
      fontSize: 12,
      marginRight: 3,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    filterLabelActive: {
      color: theme.colors.textWhite,
    },
    content: {
      flex: 1,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    summaryCard: {
      flex: 1,
      minWidth: (screenWidth - 56) / 3,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    incomeCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.success,
    },
    expenseCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.danger,
    },
    balanceCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    summaryLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    summaryValue: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    insightsCard: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    sectionTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.lg,
    },
    insightRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
    },
    insightItem: {
      flex: 1,
    },
    insightLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    insightValue: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    comparisonBadge: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceHover,
    },
    comparisonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    chartCard: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.md,
    },
    categoryItem: {
      marginBottom: theme.spacing.lg,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    categoryName: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    categoryCount: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    categoryAmount: {
      alignItems: 'flex-end',
    },
    categoryValue: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    categoryPercentage: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: theme.colors.surfaceHover,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    chart: {
      marginVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    emptySubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingBottom: 32,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    modalTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseText: {
      fontSize: theme.fontSize.lg,
      color: theme.colors.textSecondary,
    },
    modalStats: {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
    },
    modalStatsText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    transactionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    transactionLeft: {
      flex: 1,
    },
    transactionNote: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    transactionDate: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textTertiary,
    },
    transactionAmount: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.surfaceHover,
      marginHorizontal: theme.spacing.lg,
    },
    emptyTransactions: {
      padding: 40,
      alignItems: 'center',
    },
    emptyTransactionsText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textTertiary,
    },
    highlightCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      ...theme.shadows.md,
      borderWidth: 2,
      borderColor: theme.colors.primaryLight,
    },
    highlightBadge: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignSelf: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    highlightBadgeText: {
      color: theme.colors.textWhite,
      fontSize: 11,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.5,
    },
    chartSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      marginTop: 4,
    },
    pieChartLegend: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    legendColumn: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    legendHeader: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: theme.spacing.sm,
    },
    legendText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    legendAmount: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
  }));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedFilter])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUserCurrency(),
      fetchTransactionStats(),
      fetchCategoryBreakdown(),
      fetchTrendData(),
      fetchInsights(),
    ]);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();

    switch (selectedFilter) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subMonths(now, 3), end: now };
      case 'year':
        return { start: startOfYear(now), end: now };
      case 'all':
        return { start: new Date(2000, 0, 1), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const getPreviousPeriodRange = (): { start: Date; end: Date } => {
    const now = new Date();

    switch (selectedFilter) {
      case 'day':
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case 'week':
        return { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) };
      case 'month':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'quarter':
        return { start: subMonths(now, 6), end: subMonths(now, 3) };
      case 'year':
        return { start: startOfYear(subMonths(now, 12)), end: endOfDay(subMonths(now, 12)) };
      default:
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    }
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

  const fetchTransactionStats = async () => {
    if (!user) return;

    try {
      const { start, end } = getDateRange();

      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (data) {
        const income = data
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = data
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        setTotalIncome(income);
        setTotalExpense(expense);
        setNetBalance(income - expense);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCategoryBreakdown = async () => {
    if (!user) return;

    try {
      const { start, end } = getDateRange();

      const { data } = await supabase
        .from('transactions')
        .select(`
          type,
          amount,
          category_id,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (data) {
        // Group by category
        const categoryMap = new Map<string, CategoryData>();

        data.forEach(transaction => {
          if (!transaction.categories) return;

          const categoryId = transaction.categories.id;
          const existing = categoryMap.get(categoryId);

          if (existing) {
            existing.amount += transaction.amount;
            existing.transactionCount += 1;
          } else {
            categoryMap.set(categoryId, {
              id: categoryId,
              name: transaction.categories.name,
              amount: transaction.amount,
              color: transaction.categories.color || '#6B7280',
              icon: transaction.categories.icon || '💰',
              percentage: 0,
              transactionCount: 1,
            });
          }
        });

        // Calculate percentages and split by type
        const expenseTotal = data
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const incomeTotal = data
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const expenseCats: CategoryData[] = [];
        const incomeCats: CategoryData[] = [];

        data.forEach(transaction => {
          if (!transaction.categories) return;

          const categoryId = transaction.categories.id;
          const categoryData = categoryMap.get(categoryId);

          if (!categoryData) return;

          if (transaction.type === 'expense') {
            categoryData.percentage = (categoryData.amount / expenseTotal) * 100;
            if (!expenseCats.find(c => c.id === categoryId)) {
              expenseCats.push(categoryData);
            }
          } else {
            categoryData.percentage = (categoryData.amount / incomeTotal) * 100;
            if (!incomeCats.find(c => c.id === categoryId)) {
              incomeCats.push(categoryData);
            }
          }
        });

        setExpenseCategories(expenseCats.sort((a, b) => b.amount - a.amount));
        setIncomeCategories(incomeCats.sort((a, b) => b.amount - a.amount));
      }
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
    }
  };

  const fetchTrendData = async () => {
    if (!user) return;

    try {
      const { start, end } = getDateRange();

      let intervals: Date[] = [];
      let labels: string[] = [];

      // Determine intervals based on filter
      if (selectedFilter === 'day' || selectedFilter === 'week') {
        intervals = eachDayOfInterval({ start, end });
        labels = intervals.map(d => format(d, 'EEE'));
      } else if (selectedFilter === 'month' || selectedFilter === 'quarter') {
        intervals = eachMonthOfInterval({ start, end });
        labels = intervals.map(d => format(d, 'MMM'));
      } else {
        intervals = eachMonthOfInterval({ start, end });
        labels = intervals.map(d => format(d, 'MMM yy'));
      }

      // Fetch data for each interval
      const incomeData: number[] = [];
      const expenseData: number[] = [];

      for (const interval of intervals) {
        const intervalStart = selectedFilter === 'day' || selectedFilter === 'week'
          ? startOfDay(interval)
          : startOfMonth(interval);
        const intervalEnd = selectedFilter === 'day' || selectedFilter === 'week'
          ? endOfDay(interval)
          : endOfMonth(interval);

        const { data } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', intervalStart.toISOString())
          .lte('date', intervalEnd.toISOString());

        if (data) {
          const income = data
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

          const expense = data
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          incomeData.push(income);
          expenseData.push(expense);
        } else {
          incomeData.push(0);
          expenseData.push(0);
        }
      }

      setTrendData({ labels, income: incomeData, expense: expenseData });
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const fetchInsights = async () => {
    if (!user) return;

    try {
      const { start, end } = getDateRange();
      const { start: prevStart, end: prevEnd } = getPreviousPeriodRange();

      // Current period data
      const { data: currentData } = await supabase
        .from('transactions')
        .select('type, amount, date')
        .eq('user_id', user.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      // Previous period data for comparison
      const { data: prevData } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', prevStart.toISOString())
        .lte('date', prevEnd.toISOString());

      if (currentData && prevData) {
        const currentExpense = currentData
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const currentIncome = currentData
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const prevExpense = prevData
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const daysDiff = differenceInDays(end, start) + 1;
        const weeksDiff = Math.max(1, daysDiff / 7);

        // Calculate insights
        const dailyAvg = currentExpense / daysDiff;
        const weeklyAvg = currentExpense / weeksDiff;

        // Find top spending day
        const dailyExpenses = new Map<string, number>();
        currentData.forEach(t => {
          if (t.type === 'expense') {
            const day = format(new Date(t.date), 'yyyy-MM-dd');
            dailyExpenses.set(day, (dailyExpenses.get(day) || 0) + t.amount);
          }
        });

        let topDay = '';
        let topAmount = 0;
        dailyExpenses.forEach((amount, day) => {
          if (amount > topAmount) {
            topAmount = amount;
            topDay = day;
          }
        });

        // Comparison with previous period
        const change = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0;

        // Savings rate
        const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;

        setInsights({
          dailyAverage: dailyAvg,
          weeklyAverage: weeklyAvg,
          topSpendingDay: topDay ? format(new Date(topDay), 'MMM dd') : '-',
          topSpendingAmount: topAmount,
          comparisonPeriod: {
            change: Math.abs(change),
            isIncrease: change > 0,
          },
          savingsRate,
        });
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const handleCategoryPress = async (category: CategoryData) => {
    setSelectedCategory(category);

    try {
      const { start, end } = getDateRange();

      const { data } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          note,
          date,
          type,
          categories (name, icon)
        `)
        .eq('user_id', user!.id)
        .eq('category_id', category.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: false });

      if (data) {
        const transactions: Transaction[] = data.map(t => ({
          id: t.id,
          amount: t.amount,
          note: t.note,
          date: format(new Date(t.date), 'MMM dd, yyyy'),
          category_name: t.categories?.name || 'Unknown',
          category_icon: t.categories?.icon || '💰',
          type: t.type as 'income' | 'expense',
        }));

        setCategoryTransactions(transactions);
        setShowCategoryModal(true);
      }
    } catch (error) {
      console.error('Error fetching category transactions:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.surfaceHover]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Text style={styles.headerIcon}>📊</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Analysis & Insights</Text>
              <Text style={styles.headerSubtitle}>
                {selectedFilter === 'day' && '📅 Today\'s Overview'}
                {selectedFilter === 'week' && '📆 This Week'}
                {selectedFilter === 'month' && '🗓️ This Month'}
                {selectedFilter === 'quarter' && '📊 Quarterly Report'}
                {selectedFilter === 'year' && '📈 Yearly Analysis'}
                {selectedFilter === 'all' && '🌐 All-Time Data'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Time Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {TIME_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              selectedFilter === filter.value && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter.value)}
          >
            <Text style={styles.filterEmoji}>{filter.emoji}</Text>
            <Text
              style={[
                styles.filterLabel,
                selectedFilter === filter.value && styles.filterLabelActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Text style={styles.summaryLabel}>💰 Income</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalIncome, currency)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.summaryLabel}>💸 Expense</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalExpense, currency)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Text style={styles.summaryLabel}>📊 Net</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: netBalance >= 0 ? theme.colors.success : theme.colors.danger },
              ]}
            >
              {formatCurrency(netBalance, currency)}
            </Text>
          </View>
        </View>

        {/* Quick Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.sectionTitle}>🔍 Quick Insights</Text>

          <View style={styles.insightRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Daily Avg</Text>
              <Text style={styles.insightValue}>
                {formatCurrency(insights.dailyAverage, currency)}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Weekly Avg</Text>
              <Text style={styles.insightValue}>
                {formatCurrency(insights.weeklyAverage, currency)}
              </Text>
            </View>
          </View>

          <View style={styles.insightRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Top Day</Text>
              <Text style={styles.insightValue}>{insights.topSpendingDay}</Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Savings Rate</Text>
              <Text
                style={[
                  styles.insightValue,
                  { color: insights.savingsRate >= 20 ? theme.colors.success : theme.colors.warning },
                ]}
              >
                {insights.savingsRate.toFixed(1)}%
              </Text>
            </View>
          </View>

          {insights.comparisonPeriod.change > 0 && (
            <View style={styles.comparisonBadge}>
              <Text style={styles.comparisonText}>
                {insights.comparisonPeriod.isIncrease ? '📈' : '📉'}
                {' '}{insights.comparisonPeriod.change.toFixed(1)}% vs previous period
              </Text>
            </View>
          )}
        </View>

        {/* Category Distribution Pie Chart - HIGHLIGHTED */}
        {(expenseCategories.length > 0 || incomeCategories.length > 0) && (
          <View style={styles.highlightCard}>
            <View style={styles.highlightBadge}>
              <Text style={styles.highlightBadgeText}>📊 CATEGORY DISTRIBUTION</Text>
            </View>
            <Text style={styles.sectionTitle}>🎯 Category Breakdown</Text>
            <Text style={styles.chartSubtitle}>
              Distribution of income and expenses by category
            </Text>

            <PieChart
              data={[
                ...expenseCategories.slice(0, 4).map((cat) => ({
                  name: cat.name,
                  population: cat.amount,
                  color: cat.color,
                  legendFontColor: theme.colors.textSecondary,
                  legendFontSize: 11,
                })),
                ...incomeCategories.slice(0, 3).map((cat) => ({
                  name: cat.name,
                  population: cat.amount,
                  color: cat.color,
                  legendFontColor: theme.colors.textSecondary,
                  legendFontSize: 11,
                })),
              ]}
              width={screenWidth - 64}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />

            <View style={styles.pieChartLegend}>
              <View style={styles.legendColumn}>
                <Text style={styles.legendHeader}>💸 Top Expenses</Text>
                {expenseCategories.slice(0, 3).map((cat, index) => (
                  <View key={index} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.legendText}>{cat.icon} {cat.name}</Text>
                    <Text style={styles.legendAmount}>
                      {formatCurrency(cat.amount, currency)}
                    </Text>
                  </View>
                ))}
              </View>

              {incomeCategories.length > 0 && (
                <View style={styles.legendColumn}>
                  <Text style={styles.legendHeader}>💰 Top Income</Text>
                  {incomeCategories.slice(0, 3).map((cat, index) => (
                    <View key={index} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.legendText}>{cat.icon} {cat.name}</Text>
                      <Text style={styles.legendAmount}>
                        {formatCurrency(cat.amount, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Expense Category Breakdown with Progress Bars */}
        {expenseCategories.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>💸 Expense Categories</Text>

            {expenseCategories.slice(0, 6).map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>
                        {category.transactionCount} transactions
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryAmount}>
                    <Text style={styles.categoryValue}>
                      {formatCurrency(category.amount, currency)}
                    </Text>
                    <Text style={styles.categoryPercentage}>
                      {category.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${category.percentage}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Trend Chart */}
        {trendData.labels.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>📈 Spending Trends</Text>
            <LineChart
              data={{
                labels: trendData.labels,
                datasets: [
                  {
                    data: trendData.expense,
                    color: (opacity = 1) => theme.isDark ? `rgba(248, 113, 113, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
                    strokeWidth: 3,
                  },
                  {
                    data: trendData.income,
                    color: (opacity = 1) => theme.isDark ? `rgba(52, 211, 153, ${opacity})` : `rgba(16, 185, 129, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
                legend: ['Expense', 'Income'],
              }}
              width={screenWidth - 48}
              height={180}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => theme.isDark ? `rgba(96, 165, 250, ${opacity})` : `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => theme.isDark ? `rgba(209, 213, 219, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Income Categories */}
        {incomeCategories.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>💰 Income Sources</Text>

            {incomeCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(category)}
              >
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>
                        {category.transactionCount} transactions
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryAmount}>
                    <Text style={styles.categoryValue}>
                      {formatCurrency(category.amount, currency)}
                    </Text>
                    <Text style={styles.categoryPercentage}>
                      {category.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${category.percentage}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {expenseCategories.length === 0 && incomeCategories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No data for this period</Text>
            <Text style={styles.emptySubtitle}>
              Add some transactions to see insights
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Category Transactions Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalIcon}>{selectedCategory?.icon}</Text>
                <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalStats}>
              <Text style={styles.modalStatsText}>
                {categoryTransactions.length} transactions •{' '}
                {formatCurrency(selectedCategory?.amount || 0, currency)}
              </Text>
            </View>

            <FlatList
              data={categoryTransactions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionNote}>
                      {item.note || 'No note'}
                    </Text>
                    <Text style={styles.transactionDate}>{item.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: item.type === 'income' ? theme.colors.success : theme.colors.danger },
                    ]}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatCurrency(item.amount, currency)}
                  </Text>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyTransactions}>
                  <Text style={styles.emptyTransactionsText}>
                    No transactions in this category
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EnhancedAnalysisScreen;
