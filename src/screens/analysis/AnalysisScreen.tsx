// Analysis Screen - Financial Charts and Reports

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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/helpers';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  format,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';

const screenWidth = Dimensions.get('window').width;

type Period = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear';

interface PeriodOption {
  value: Period;
  label: string;
}

const PERIODS: PeriodOption[] = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'thisYear', label: 'This Year' },
];

interface CategoryData {
  name: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
}

const AnalysisScreen: React.FC = () => {
  const { user } = useAuthStore();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('thisMonth');
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  // Category breakdown
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryData[]>([]);

  // Trends data
  const [monthlyData, setMonthlyData] = useState<{
    labels: string[];
    income: number[];
    expense: number[];
  }>({ labels: [], income: [], expense: [] });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedPeriod])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUserCurrency(),
      fetchTransactionStats(),
      fetchCategoryBreakdown(),
      fetchMonthlyTrends(),
    ]);
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

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case 'thisMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'last3Months':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'thisYear':
        startDate = startOfYear(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const fetchTransactionStats = async () => {
    if (!user) return;

    try {
      const { startDate, endDate } = getDateRange();

      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

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

      setTotalIncome(income);
      setTotalExpense(expense);
      setNetBalance(income - expense);
    } catch (error: any) {
      console.error('Error fetching transaction stats:', error);
    }
  };

  const fetchCategoryBreakdown = async () => {
    if (!user) return;

    try {
      const { startDate, endDate } = getDateRange();

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          type,
          amount,
          category:categories(name, icon, color)
        `)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      // Group by category for expenses
      const expenseMap = new Map<string, CategoryData>();
      const incomeMap = new Map<string, CategoryData>();

      let totalExpenseAmount = 0;
      let totalIncomeAmount = 0;

      transactions?.forEach((tx: any) => {
        const amount = Number(tx.amount);
        const category = tx.category;

        if (tx.type === 'expense') {
          totalExpenseAmount += amount;
          if (expenseMap.has(category.name)) {
            const existing = expenseMap.get(category.name)!;
            expenseMap.set(category.name, {
              ...existing,
              amount: existing.amount + amount,
            });
          } else {
            expenseMap.set(category.name, {
              name: category.name,
              amount: amount,
              color: category.color,
              icon: category.icon,
              percentage: 0,
            });
          }
        } else {
          totalIncomeAmount += amount;
          if (incomeMap.has(category.name)) {
            const existing = incomeMap.get(category.name)!;
            incomeMap.set(category.name, {
              ...existing,
              amount: existing.amount + amount,
            });
          } else {
            incomeMap.set(category.name, {
              name: category.name,
              amount: amount,
              color: category.color,
              icon: category.icon,
              percentage: 0,
            });
          }
        }
      });

      // Calculate percentages and sort
      const expenseArray = Array.from(expenseMap.values())
        .map((cat) => ({
          ...cat,
          percentage:
            totalExpenseAmount > 0 ? (cat.amount / totalExpenseAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const incomeArray = Array.from(incomeMap.values())
        .map((cat) => ({
          ...cat,
          percentage:
            totalIncomeAmount > 0 ? (cat.amount / totalIncomeAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      setExpenseCategories(expenseArray);
      setIncomeCategories(incomeArray);
    } catch (error: any) {
      console.error('Error fetching category breakdown:', error);
    }
  };

  const fetchMonthlyTrends = async () => {
    if (!user) return;

    try {
      const { startDate, endDate } = getDateRange();
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get months in range
      const months = eachMonthOfInterval({ start, end });

      const labels = months.map((month) => format(month, 'MMM'));
      const incomeData: number[] = [];
      const expenseData: number[] = [];

      // Fetch data for each month
      for (const month of months) {
        const monthStart = startOfMonth(month).toISOString().split('T')[0];
        const monthEnd = endOfMonth(month).toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', monthStart)
          .lte('date', monthEnd);

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

        incomeData.push(income);
        expenseData.push(expense);
      }

      setMonthlyData({ labels, income: incomeData, expense: expenseData });
    } catch (error: any) {
      console.error('Error fetching monthly trends:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading analysis...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analysis & Reports</Text>
        <Text style={styles.headerSubtitle}>Financial insights</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodButton,
                selectedPeriod === period.value && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.value)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.value &&
                    styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              {formatCurrency(totalIncome, currency)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={styles.summaryLabel}>Total Expense</Text>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              {formatCurrency(totalExpense, currency)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                borderLeftColor: netBalance >= 0 ? '#3B82F6' : '#F59E0B',
              },
            ]}
          >
            <Text style={styles.summaryLabel}>Net Balance</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: netBalance >= 0 ? '#3B82F6' : '#F59E0B' },
              ]}
            >
              {formatCurrency(netBalance, currency)}
            </Text>
          </View>
        </View>

        {/* Income vs Expense Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 Income vs Expense</Text>
          {totalIncome === 0 && totalExpense === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>
                No transactions for this period
              </Text>
            </View>
          ) : (
            <BarChart
              data={{
                labels: ['Income', 'Expense'],
                datasets: [
                  {
                    data: [totalIncome, totalExpense],
                  },
                ],
              }}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 12,
                },
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
            />
          )}
        </View>

        {/* Monthly Trends Chart */}
        {monthlyData.labels.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📈 Monthly Trends</Text>
            <LineChart
              data={{
                labels: monthlyData.labels,
                datasets: [
                  {
                    data: monthlyData.income,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    strokeWidth: 2,
                  },
                  {
                    data: monthlyData.expense,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
                legend: ['Income', 'Expense'],
              }}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 10,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Expense Category Breakdown */}
        {expenseCategories.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🎯 Expense Breakdown</Text>
            <PieChart
              data={expenseCategories.slice(0, 5).map((cat) => ({
                name: cat.name,
                amount: cat.amount,
                color: cat.color,
                legendFontColor: '#6B7280',
                legendFontSize: 12,
              }))}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            <View style={styles.categoryList}>
              {expenseCategories.map((cat, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.amount, currency)}
                    </Text>
                    <Text style={styles.categoryPercentage}>
                      {Math.round(cat.percentage)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Income Category Breakdown */}
        {incomeCategories.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>💰 Income Breakdown</Text>
            <View style={styles.categoryList}>
              {incomeCategories.map((cat, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.amount, currency)}
                    </Text>
                    <Text style={styles.categoryPercentage}>
                      {Math.round(cat.percentage)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {totalIncome === 0 && totalExpense === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Data Available</Text>
            <Text style={styles.emptySubtitle}>
              Add transactions to see your financial analysis
            </Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryCards: {
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  chartCard: {
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoryList: {
    marginTop: 16,
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280',
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
  },
});

export default AnalysisScreen;
