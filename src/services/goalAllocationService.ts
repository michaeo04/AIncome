// Goal Allocation Service - Handles money transfers between net balance and saving goals

import { supabase } from './supabase';
import {
  SavingGoal,
  GoalAllocation,
  AvailableBalance,
  GoalProgressView,
} from '../types';

const isMissingFunctionError = (error: any) =>
  error?.code === '42883' ||
  (typeof error?.message === 'string' && error.message.includes('does not exist'));

// Fallback: compute balances directly when RPC functions are missing on Supabase
const getBalanceFallback = async (userId: string): Promise<AvailableBalance> => {
  // Fetch transactions and sum client-side to avoid PostgREST aggregate quirks
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('amount,type')
    .eq('user_id', userId);

  if (txError) throw txError;

  let income = 0;
  let expenses = 0;
  (txData || []).forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') income += amt;
    if (tx.type === 'expense') expenses += amt;
  });
  const net = income - expenses;

  // Sum allocated across active goals client-side
  const { data: goalsData, error: goalsError } = await supabase
    .from('saving_goals')
    .select('allocated_amount,status')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (goalsError) throw goalsError;

  const allocated = (goalsData || []).reduce(
    (acc, g) => acc + (Number(g.allocated_amount) || 0),
    0
  );

  return {
    net_balance: net,
    allocated_balance: allocated,
    available_balance: net - allocated,
  };
};

/**
 * Get user's balance breakdown
 * - Net Balance: Total income - expense
 * - Allocated Balance: Total money allocated to goals
 * - Available Balance: Money available to allocate (Net - Allocated)
 */
export const getAvailableBalance = async (
  userId: string
): Promise<AvailableBalance | null> => {
  try {
    const { data, error } = await supabase.rpc('get_available_balance', {
      p_user_id: userId,
    });

    if (error) {
      // If RPC missing/broken, fall back to client-side calculation
      const fallback = await getBalanceFallback(userId);
      return fallback;
    }

    if (data && data.length > 0) {
      return {
        net_balance: Number(data[0].net_balance),
        allocated_balance: Number(data[0].allocated_balance),
        available_balance: Number(data[0].available_balance),
      };
    }

    // If RPC returns nothing, still try fallback
    const fallback = await getBalanceFallback(userId);
    return fallback;
  } catch (error) {
    console.error('Error getting available balance:', error);
    throw error;
  }
};

/**
 * Get all goal allocations for a specific goal
 */
export const getGoalAllocations = async (
  goalId: string
): Promise<GoalAllocation[]> => {
  try {
    const { data, error } = await supabase
      .from('goal_allocations')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching goal allocations:', error);
    throw error;
  }
};

/**
 * Get all active goals with progress (using view)
 */
export const getGoalsWithProgress = async (
  userId: string
): Promise<GoalProgressView[]> => {
  try {
    const { data, error } = await supabase
      .from('goal_progress_view')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((goal) => ({
      ...goal,
      target_amount: Number(goal.target_amount),
      allocated_amount: Number(goal.allocated_amount),
      progress_percent: Number(goal.progress_percent),
      remaining_amount: Number(goal.remaining_amount),
      days_remaining: Number(goal.days_remaining),
    }));
  } catch (error) {
    console.error('Error fetching goals with progress:', error);
    throw error;
  }
};

/**
 * Check if user can allocate specific amount to a goal
 */
export const canAllocateToGoal = async (
  userId: string,
  goalId: string,
  amount: number
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('can_allocate_to_goal', {
      p_user_id: userId,
      p_goal_id: goalId,
      p_amount: amount,
    });

    if (error) throw error;

    return data === true;
  } catch (error) {
    console.error('Error checking allocation validity:', error);
    return false;
  }
};

/**
 * Allocate money to a goal (deposit)
 */
export const allocateToGoal = async (
  userId: string,
  goalId: string,
  amount: number,
  note?: string
): Promise<{ success: boolean; error?: string; allocation_id?: string }> => {
  try {
    const { data, error } = await supabase.rpc('allocate_to_goal', {
      p_user_id: userId,
      p_goal_id: goalId,
      p_amount: amount,
      p_note: note || null,
    });

    if (error) {
      // Fallback path if backend function was removed
      if (isMissingFunctionError(error)) {
        // Recompute available balance and ensure enough funds
        const balance = await getBalanceFallback(userId);
        if (amount > balance.available_balance) {
          return { success: false, error: 'Insufficient available balance' };
        }

        // Fetch current goal allocation
        const { data: goal, error: goalError } = await supabase
          .from('saving_goals')
          .select('allocated_amount')
          .eq('id', goalId)
          .eq('user_id', userId)
          .single();

        if (goalError) throw goalError;

        const newAllocated = Number(goal?.allocated_amount ?? 0) + amount;

        // Insert allocation record
        const { data: allocation, error: insertError } = await supabase
          .from('goal_allocations')
          .insert({
            user_id: userId,
            goal_id: goalId,
            amount,
            type: 'deposit',
            note: note || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Update goal allocated_amount
        const { error: updateError } = await supabase
          .from('saving_goals')
          .update({
            allocated_amount: newAllocated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goalId)
          .eq('user_id', userId);

        if (updateError) throw updateError;

        return { success: true, allocation_id: allocation?.id };
      }

      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error allocating to goal:', error);
    return {
      success: false,
      error: error.message || 'Failed to allocate money to goal',
    };
  }
};

/**
 * Withdraw money from a goal
 */
export const withdrawFromGoal = async (
  userId: string,
  goalId: string,
  amount: number,
  note?: string
): Promise<{ success: boolean; error?: string; allocation_id?: string }> => {
  try {
    const { data, error } = await supabase.rpc('withdraw_from_goal', {
      p_user_id: userId,
      p_goal_id: goalId,
      p_amount: amount,
      p_note: note || null,
    });

    if (error) {
      // Fallback when backend function is missing
      if (isMissingFunctionError(error)) {
        // Fetch current goal allocation
        const { data: goal, error: goalError } = await supabase
          .from('saving_goals')
          .select('allocated_amount')
          .eq('id', goalId)
          .eq('user_id', userId)
          .single();

        if (goalError) throw goalError;

        const currentAllocated = Number(goal?.allocated_amount ?? 0);
        if (amount > currentAllocated) {
          return { success: false, error: 'Insufficient allocated amount' };
        }

        // Insert allocation record
        const { data: allocation, error: insertError } = await supabase
          .from('goal_allocations')
          .insert({
            user_id: userId,
            goal_id: goalId,
            amount,
            type: 'withdrawal',
            note: note || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        const newAllocated = currentAllocated - amount;

        // Update goal allocated_amount
        const { error: updateError } = await supabase
          .from('saving_goals')
          .update({
            allocated_amount: newAllocated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goalId)
          .eq('user_id', userId);

        if (updateError) throw updateError;

        return { success: true, allocation_id: allocation?.id };
      }

      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error withdrawing from goal:', error);
    return {
      success: false,
      error: error.message || 'Failed to withdraw money from goal',
    };
  }
};

/**
 * Create a new saving goal
 */
export const createSavingGoal = async (
  userId: string,
  goal: Omit<SavingGoal, 'id' | 'user_id' | 'allocated_amount' | 'created_at' | 'updated_at'>
): Promise<SavingGoal | null> => {
  try {
    const { data, error } = await supabase
      .from('saving_goals')
      .insert({
        user_id: userId,
        name: goal.name,
        target_amount: goal.target_amount,
        start_date: goal.start_date,
        target_date: goal.target_date,
        icon: goal.icon,
        color: goal.color,
        note: goal.note,
        status: goal.status,
        allocated_amount: 0, // Always start at 0
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating saving goal:', error);
    throw error;
  }
};

/**
 * Update a saving goal (not including allocated_amount - use allocate/withdraw for that)
 */
export const updateSavingGoal = async (
  goalId: string,
  updates: Partial<Omit<SavingGoal, 'id' | 'user_id' | 'allocated_amount' | 'created_at' | 'updated_at'>>
): Promise<SavingGoal | null> => {
  try {
    const { data, error } = await supabase
      .from('saving_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating saving goal:', error);
    throw error;
  }
};

/**
 * Delete a saving goal
 * Note: Can only delete if allocated_amount is 0
 */
export const deleteSavingGoal = async (goalId: string): Promise<boolean> => {
  try {
    // First check if goal has allocated money
    const { data: goal, error: fetchError } = await supabase
      .from('saving_goals')
      .select('allocated_amount')
      .eq('id', goalId)
      .single();

    if (fetchError) throw fetchError;

    if (goal && Number(goal.allocated_amount) > 0) {
      throw new Error(
        'Cannot delete goal with allocated money. Please withdraw all money first.'
      );
    }

    const { error } = await supabase.from('saving_goals').delete().eq('id', goalId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting saving goal:', error);
    throw error;
  }
};

/**
 * Archive a goal (keeps data but hides from active view)
 */
export const archiveGoal = async (goalId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('saving_goals')
      .update({ status: 'archived' })
      .eq('id', goalId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error archiving goal:', error);
    throw error;
  }
};

/**
 * Check if spending would cause a warning
 * (when net balance would drop below total allocated)
 */
export const checkSpendingWarning = async (
  userId: string,
  expenseAmount: number
): Promise<{
  shouldWarn: boolean;
  netBalanceAfter: number;
  allocatedBalance: number;
  deficit: number;
}> => {
  try {
    const balance = await getAvailableBalance(userId);

    if (!balance) {
      return {
        shouldWarn: false,
        netBalanceAfter: 0,
        allocatedBalance: 0,
        deficit: 0,
      };
    }

    const netBalanceAfter = balance.net_balance - expenseAmount;
    const deficit = balance.allocated_balance - netBalanceAfter;

    return {
      shouldWarn: netBalanceAfter < balance.allocated_balance,
      netBalanceAfter,
      allocatedBalance: balance.allocated_balance,
      deficit: Math.max(0, deficit),
    };
  } catch (error) {
    console.error('Error checking spending warning:', error);
    return {
      shouldWarn: false,
      netBalanceAfter: 0,
      allocatedBalance: 0,
      deficit: 0,
    };
  }
};
