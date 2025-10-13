// Validation Utility - Business Rules for AIncome App
// Implements comprehensive validation logic with user-friendly error messages

import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  title?: string;
}

// ============================================
// TRANSACTION VALIDATION RULES
// ============================================

/**
 * Rule 1: Transaction amount must be greater than zero
 */
export const validateTransactionAmount = (amount: number): ValidationResult => {
  if (amount <= 0) {
    return {
      isValid: false,
      title: 'Invalid Amount',
      message: 'Transaction amount must be greater than zero.',
    };
  }

  // Additional check: Reasonable amount limit (prevent input errors)
  if (amount > 1000000000000) {
    return {
      isValid: false,
      title: 'Amount Too Large',
      message: 'Please enter a reasonable amount. The value seems too large.',
    };
  }

  return { isValid: true };
};

/**
 * Rule 2: Transaction date cannot be in the future
 */
export const validateTransactionDate = (date: Date): ValidationResult => {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today

  if (date > now) {
    return {
      isValid: false,
      title: 'Invalid Date',
      message: 'Transaction date cannot be in the future. Please select today or an earlier date.',
    };
  }

  // Check if date is too far in the past (more than 10 years)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  if (date < tenYearsAgo) {
    return {
      isValid: false,
      title: 'Date Too Old',
      message: 'Transaction date cannot be more than 10 years in the past. Please check the date.',
    };
  }

  return { isValid: true };
};

/**
 * Rule 3: Expense cannot exceed current balance (Warning, not blocking)
 */
export const validateExpenseAgainstBalance = async (
  userId: string,
  expenseAmount: number,
  isEdit: boolean = false,
  originalAmount?: number
): Promise<ValidationResult> => {
  try {
    // Calculate current balance
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId);

    if (error) throw error;

    const totalIncome = transactions
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const totalExpense = transactions
      ?.filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    let currentBalance = totalIncome - totalExpense;

    // If editing, add back the original amount
    if (isEdit && originalAmount) {
      currentBalance += originalAmount;
    }

    // Check if expense exceeds balance
    if (expenseAmount > currentBalance) {
      return {
        isValid: false,
        title: '⚠️ Balance Warning',
        message: `This expense (${formatAmount(expenseAmount)}) exceeds your current balance (${formatAmount(currentBalance)}).\n\nAre you sure you want to continue? This will make your balance negative.`,
      };
    }

    // Warning if this expense would leave balance below 10% of average
    const averageIncome = totalIncome > 0 ? totalIncome / 12 : 0; // Assume 12 months average
    const balanceAfter = currentBalance - expenseAmount;

    if (balanceAfter < averageIncome * 0.1 && balanceAfter > 0) {
      return {
        isValid: false,
        title: '⚠️ Low Balance Warning',
        message: `After this expense, your balance will be ${formatAmount(balanceAfter)}.\n\nThis is quite low. Consider reviewing your expenses.`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating expense:', error);
    return { isValid: true }; // Don't block on error
  }
};

/**
 * Rule 4: Large transaction confirmation (above threshold)
 */
export const validateLargeTransaction = (
  amount: number,
  type: 'income' | 'expense',
  threshold: number = 10000000 // 10 million default
): ValidationResult => {
  if (amount >= threshold) {
    return {
      isValid: false,
      title: '💰 Large Transaction',
      message: `This is a large ${type} of ${formatAmount(amount)}.\n\nPlease confirm that the amount is correct.`,
    };
  }

  return { isValid: true };
};

/**
 * Rule 5: Check for duplicate transactions (same amount, category, date within 1 minute)
 */
export const checkDuplicateTransaction = async (
  userId: string,
  amount: number,
  categoryId: string,
  date: Date,
  type: 'income' | 'expense'
): Promise<ValidationResult> => {
  try {
    const dateStart = new Date(date);
    dateStart.setMinutes(dateStart.getMinutes() - 1);

    const dateEnd = new Date(date);
    dateEnd.setMinutes(dateEnd.getMinutes() + 1);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('amount', amount)
      .eq('category_id', categoryId)
      .eq('type', type)
      .gte('date', dateStart.toISOString())
      .lte('date', dateEnd.toISOString());

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isValid: false,
        title: '⚠️ Possible Duplicate',
        message: 'A similar transaction was just added with the same amount and category.\n\nDo you want to add it anyway?',
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return { isValid: true }; // Don't block on error
  }
};

/**
 * Rule 6: Transaction note character limit
 */
export const validateTransactionNote = (note: string): ValidationResult => {
  if (note && note.length > 500) {
    return {
      isValid: false,
      title: 'Note Too Long',
      message: 'Transaction note cannot exceed 500 characters. Please shorten your note.',
    };
  }

  return { isValid: true };
};

/**
 * Rule 7: Transaction name validation
 */
export const validateTransactionName = (name: string): ValidationResult => {
  if (name && name.length > 100) {
    return {
      isValid: false,
      title: 'Name Too Long',
      message: 'Transaction name cannot exceed 100 characters.',
    };
  }

  return { isValid: true };
};

// ============================================
// BUDGET VALIDATION RULES
// ============================================

/**
 * Rule 8: Budget amount must be positive
 */
export const validateBudgetAmount = (amount: number): ValidationResult => {
  if (amount <= 0) {
    return {
      isValid: false,
      title: 'Invalid Budget Amount',
      message: 'Budget amount must be greater than zero.',
    };
  }

  return { isValid: true };
};

/**
 * Rule 9: Budget cannot overlap for same category and period
 */
export const validateBudgetOverlap = async (
  userId: string,
  categoryId: string,
  startDate: string,
  endDate: string,
  budgetId?: string
): Promise<ValidationResult> => {
  try {
    let query = supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

    // Exclude current budget if editing
    if (budgetId) {
      query = query.neq('id', budgetId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isValid: false,
        title: 'Budget Overlap',
        message: 'A budget already exists for this category in the selected period. Please choose a different period or category.',
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error checking budget overlap:', error);
    return { isValid: true }; // Don't block on error
  }
};

/**
 * Rule 10: Total budgets warning if exceeds average income
 */
export const validateTotalBudgets = async (
  userId: string,
  newBudgetAmount: number
): Promise<ValidationResult> => {
  try {
    // Get all active budgets
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('amount')
      .eq('user_id', userId);

    if (budgetError) throw budgetError;

    const totalBudgets = budgets
      ?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

    const totalWithNew = totalBudgets + newBudgetAmount;

    // Get average monthly income
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'income');

    if (txError) throw txError;

    const totalIncome = transactions
      ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const averageMonthlyIncome = totalIncome / 12; // Rough estimate

    if (totalWithNew > averageMonthlyIncome && averageMonthlyIncome > 0) {
      return {
        isValid: false,
        title: '⚠️ High Budget Total',
        message: `Your total budgets (${formatAmount(totalWithNew)}) exceed your average monthly income (${formatAmount(averageMonthlyIncome)}).\n\nThis might not be sustainable. Consider reviewing your budget allocations.`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating total budgets:', error);
    return { isValid: true };
  }
};

/**
 * Rule 11: Budget spending alert thresholds (70%, 80%, 90%, 100%)
 */
export const checkBudgetAlert = (
  spent: number,
  budgetAmount: number,
  alertThreshold: number
): { shouldAlert: boolean; level: 'warning' | 'danger' | 'exceeded'; message: string } | null => {
  const percentage = (spent / budgetAmount) * 100;

  if (percentage >= 100) {
    return {
      shouldAlert: true,
      level: 'exceeded',
      message: `🚨 Budget Exceeded!\n\nYou have spent ${formatAmount(spent)} out of ${formatAmount(budgetAmount)} (${Math.round(percentage)}%).\n\nConsider reviewing your expenses in this category.`,
    };
  }

  if (percentage >= 90) {
    return {
      shouldAlert: true,
      level: 'danger',
      message: `⚠️ Budget Almost Exceeded!\n\nYou have spent ${formatAmount(spent)} out of ${formatAmount(budgetAmount)} (${Math.round(percentage)}%).\n\nOnly ${formatAmount(budgetAmount - spent)} remaining!`,
    };
  }

  if (percentage >= alertThreshold) {
    return {
      shouldAlert: true,
      level: 'warning',
      message: `⚠️ Budget Alert!\n\nYou have reached ${Math.round(percentage)}% of your budget.\n\nSpent: ${formatAmount(spent)} out of ${formatAmount(budgetAmount)}`,
    };
  }

  return null;
};

// ============================================
// GOAL VALIDATION RULES
// ============================================

/**
 * Rule 12: Goal target amount must be positive
 */
export const validateGoalAmount = (amount: number): ValidationResult => {
  if (amount <= 0) {
    return {
      isValid: false,
      title: 'Invalid Goal Amount',
      message: 'Goal target amount must be greater than zero.',
    };
  }

  return { isValid: true };
};

/**
 * Rule 13: Goal target date must be in the future
 */
export const validateGoalDate = (targetDate: Date, startDate?: Date): ValidationResult => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (targetDate <= now) {
    return {
      isValid: false,
      title: 'Invalid Target Date',
      message: 'Goal target date must be in the future.',
    };
  }

  // Check if target date is at least 1 day after start date
  if (startDate) {
    const minTargetDate = new Date(startDate);
    minTargetDate.setDate(minTargetDate.getDate() + 1);

    if (targetDate < minTargetDate) {
      return {
        isValid: false,
        title: 'Invalid Date Range',
        message: 'Target date must be at least 1 day after the start date.',
      };
    }
  }

  // Warn if goal is too far in future (more than 10 years)
  const tenYearsFromNow = new Date();
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

  if (targetDate > tenYearsFromNow) {
    return {
      isValid: false,
      title: 'Date Too Far',
      message: 'Goal target date seems very far in the future (more than 10 years). Please verify the date.',
    };
  }

  return { isValid: true };
};

/**
 * Rule 14: Goal target amount should be achievable
 */
export const validateGoalAchievability = async (
  userId: string,
  targetAmount: number,
  targetDate: Date
): Promise<ValidationResult> => {
  try {
    // Calculate average monthly savings
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId);

    if (error) throw error;

    const totalIncome = transactions
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const totalExpense = transactions
      ?.filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const averageMonthlySavings = (totalIncome - totalExpense) / 12;

    // Calculate months until target date
    const now = new Date();
    const monthsUntilTarget = Math.max(
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
      targetDate.getMonth() - now.getMonth(),
      1
    );

    const requiredMonthlySavings = targetAmount / monthsUntilTarget;

    // Warn if required savings significantly exceeds average
    if (requiredMonthlySavings > averageMonthlySavings * 2 && averageMonthlySavings > 0) {
      return {
        isValid: false,
        title: '⚠️ Ambitious Goal',
        message: `To reach this goal, you need to save ${formatAmount(requiredMonthlySavings)}/month.\n\nYour current average savings: ${formatAmount(averageMonthlySavings)}/month.\n\nThis is quite ambitious. Consider adjusting the target or timeline.`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating goal achievability:', error);
    return { isValid: true };
  }
};

// ============================================
// CATEGORY VALIDATION RULES
// ============================================

/**
 * Rule 15: Category name must be unique for user
 */
export const validateCategoryName = async (
  userId: string,
  name: string,
  type: 'income' | 'expense',
  categoryId?: string
): Promise<ValidationResult> => {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      title: 'Invalid Category Name',
      message: 'Category name cannot be empty.',
    };
  }

  if (name.length > 50) {
    return {
      isValid: false,
      title: 'Name Too Long',
      message: 'Category name cannot exceed 50 characters.',
    };
  }

  try {
    let query = supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .ilike('name', name.trim());

    if (categoryId) {
      query = query.neq('id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isValid: false,
        title: 'Duplicate Category',
        message: `A ${type} category named "${name}" already exists. Please choose a different name.`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating category name:', error);
    return { isValid: true };
  }
};

/**
 * Rule 16: Cannot delete category with transactions
 */
export const validateCategoryDeletion = async (
  userId: string,
  categoryId: string
): Promise<ValidationResult> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isValid: false,
        title: 'Cannot Delete Category',
        message: 'This category has transactions associated with it. Please reassign or delete those transactions first.',
      };
    }

    // Check if category has budgets
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .limit(1);

    if (budgetError) throw budgetError;

    if (budgets && budgets.length > 0) {
      return {
        isValid: false,
        title: 'Cannot Delete Category',
        message: 'This category has budgets associated with it. Please delete those budgets first.',
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating category deletion:', error);
    return { isValid: true };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format amount for display in messages
 */
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Show validation error/warning with customizable actions
 */
export const showValidationAlert = (
  result: ValidationResult,
  onContinue?: () => void,
  onCancel?: () => void
): void => {
  if (result.isValid) {
    if (onContinue) onContinue();
    return;
  }

  const buttons: any[] = [];

  if (onCancel) {
    buttons.push({
      text: 'Cancel',
      style: 'cancel',
      onPress: onCancel,
    });
  }

  if (onContinue) {
    buttons.push({
      text: 'Continue Anyway',
      onPress: onContinue,
    });
  } else {
    buttons.push({
      text: 'OK',
      onPress: onCancel,
    });
  }

  Alert.alert(result.title || 'Validation Error', result.message, buttons);
};

/**
 * Batch validation - runs multiple validations and returns first failure
 */
export const runValidations = async (
  validations: Array<() => ValidationResult | Promise<ValidationResult>>
): Promise<ValidationResult> => {
  for (const validate of validations) {
    const result = await validate();
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
};
