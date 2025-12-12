// SavingsGoalsTab - Savings goals section with allocation functionality

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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BudgetStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { supabase } from '../../services/supabase';
import {
  getAvailableBalance,
  getGoalsWithProgress,
  allocateToGoal,
  withdrawFromGoal,
} from '../../services/goalAllocationService';
import { GoalProgressView, AvailableBalance } from '../../types';
import BalanceOverviewCard from '../../components/goals/BalanceOverviewCard';
import GoalAllocationCard from '../../components/goals/GoalAllocationCard';
import AllocationModal from '../../components/goals/AllocationModal';

type SavingsGoalsNavigationProp = StackNavigationProp<BudgetStackParamList>;

const SavingsGoalsTab: React.FC = () => {
  const navigation = useNavigation<SavingsGoalsNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  const [goals, setGoals] = useState<GoalProgressView[]>([]);
  const [balance, setBalance] = useState<AvailableBalance>({
    net_balance: 0,
    allocated_balance: 0,
    available_balance: 0,
  });
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [allocationModalVisible, setAllocationModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalProgressView | null>(null);
  const [allocationType, setAllocationType] = useState<'allocate' | 'withdraw'>('allocate');

  // Balance card visibility
  const [showBalanceCard, setShowBalanceCard] = useState(false);

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
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
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
    },
    addButton: {
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    addButtonGradient: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    addButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.white,
    },
    emptyState: {
      alignItems: 'center',
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
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
    toggleBalanceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    toggleBalanceIcon: {
      fontSize: 20,
      marginRight: theme.spacing.sm,
    },
    toggleBalanceText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semiBold,
      color: theme.colors.text,
      flex: 1,
    },
    toggleBalanceArrow: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
  }));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchGoals(), fetchBalance(), fetchCurrency()]);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const fetchCurrency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setCurrency(data.currency);
    } catch (error) {
      console.error('Error fetching currency:', error);
    }
  };

  const fetchBalance = async () => {
    if (!user) return;

    try {
      const data = await getAvailableBalance(user.id);
      if (data) {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const data = await getGoalsWithProgress(user.id);
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleAllocate = (goal: GoalProgressView) => {
    if (balance.available_balance <= 0) {
      Alert.alert(
        'Insufficient Balance',
        'You don\'t have available balance to allocate. Your net balance is fully allocated to goals.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedGoal(goal);
    setAllocationType('allocate');
    setAllocationModalVisible(true);
  };

  const handleWithdraw = (goal: GoalProgressView) => {
    if (goal.allocated_amount <= 0) {
      Alert.alert(
        'Nothing to Withdraw',
        'This goal has no allocated money to withdraw.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedGoal(goal);
    setAllocationType('withdraw');
    setAllocationModalVisible(true);
  };

  const handleConfirmAllocation = async (amount: number, note: string) => {
    if (!user || !selectedGoal) return;

    try {
      let result;
      if (allocationType === 'allocate') {
        result = await allocateToGoal(user.id, selectedGoal.goal_id, amount, note);
      } else {
        result = await withdrawFromGoal(user.id, selectedGoal.goal_id, amount, note);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          `Successfully ${allocationType === 'allocate' ? 'allocated' : 'withdrew'} money!`,
          [{ text: 'OK' }]
        );
        await loadData(); // Refresh data
      } else {
        Alert.alert('Error', result.error || 'Failed to process transaction');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const handleAddGoal = () => {
    navigation.navigate('AddGoal');
  };

  const handleGoalPress = (goal: GoalProgressView) => {
    navigation.navigate('GoalDetail', { goalId: goal.goal_id });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading savings goals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Toggle Balance Card Button */}
        <TouchableOpacity
          style={styles.toggleBalanceButton}
          onPress={() => setShowBalanceCard(!showBalanceCard)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleBalanceIcon}>💰</Text>
          <Text style={styles.toggleBalanceText}>
            {showBalanceCard ? 'Hide' : 'Show'} Your Balance
          </Text>
          <Text style={styles.toggleBalanceArrow}>
            {showBalanceCard ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {/* Balance Overview (Collapsible) */}
        {showBalanceCard && (
          <BalanceOverviewCard
            balance={balance}
            currency={currency}
            isLoading={false}
          />
        )}

        {/* Goals Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Savings Goals</Text>
        </View>

        {/* Goals List */}
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎯</Text>
            <Text style={styles.emptyStateText}>No savings goals yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create goals to track your savings progress.{'\n'}
              Allocate money from your net balance to each goal.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddGoal}>
              <Text style={styles.emptyButtonText}>Create Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => (
            <GoalAllocationCard
              key={goal.goal_id}
              goal={goal}
              currency={currency}
              onAllocate={handleAllocate}
              onWithdraw={handleWithdraw}
              onPress={handleGoalPress}
            />
          ))
        )}

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      {/* Allocation Modal */}
      <AllocationModal
        visible={allocationModalVisible}
        goal={selectedGoal}
        balance={balance}
        currency={currency}
        type={allocationType}
        onClose={() => setAllocationModalVisible(false)}
        onConfirm={handleConfirmAllocation}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddGoal}>
        <LinearGradient
          colors={[theme.colors.secondary, theme.colors.secondaryDark]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default SavingsGoalsTab;
