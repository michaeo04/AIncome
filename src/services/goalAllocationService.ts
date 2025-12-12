// Goal Allocation Service - Handles money transfers between net balance and saving goals

import { supabase } from './supabase';
import {
  SavingGoal,
  GoalAllocation,
  AvailableBalance,
  GoalProgressView,
} from '../types';

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

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        net_balance: Number(data[0].net_balance),
        allocated_balance: Number(data[0].allocated_balance),
        available_balance: Number(data[0].available_balance),
      };
    }

    return null;
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

    if (error) throw error;

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

    if (error) throw error;

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
