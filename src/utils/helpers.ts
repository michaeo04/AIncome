// Helper utility functions

import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Format currency based on locale
 */
export const formatCurrency = (amount: number, currency: string = 'VND'): string => {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date: string | Date, dateFormat: string = 'DD/MM/YYYY'): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;

  const formatMap: Record<string, string> = {
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'YYYY-MM-DD': 'yyyy-MM-dd',
  };

  return format(parsedDate, formatMap[dateFormat] || 'dd/MM/yyyy');
};

/**
 * Get relative time (Today, Yesterday, etc.)
 */
export const getRelativeTime = (date: string): string => {
  const today = new Date();
  const parsedDate = parseISO(date);
  const diffInDays = Math.floor((today.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return formatDate(date);
};

/**
 * Calculate budget progress color
 */
export const getBudgetProgressColor = (percentage: number): string => {
  if (percentage < 70) return '#10B981'; // Green
  if (percentage < 90) return '#F59E0B'; // Yellow/Amber
  return '#EF4444'; // Red
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Get month date range
 */
export const getMonthDateRange = (date: Date = new Date()) => {
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
};

/**
 * Get week date range
 */
export const getWeekDateRange = (date: Date = new Date(), weekStartsOn: 0 | 1 = 1) => {
  return {
    start: format(startOfWeek(date, { weekStartsOn }), 'yyyy-MM-dd'),
    end: format(endOfWeek(date, { weekStartsOn }), 'yyyy-MM-dd'),
  };
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, contains uppercase, lowercase, and number
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return minLength && hasUppercase && hasLowercase && hasNumber;
};

/**
 * Group transactions by date
 */
export const groupTransactionsByDate = <T extends { date: string }>(transactions: T[]) => {
  const grouped: Record<string, T[]> = {};

  transactions.forEach((transaction) => {
    const dateKey = transaction.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(transaction);
  });

  return grouped;
};

/**
 * Calculate months difference
 */
export const getMonthsDifference = (startDate: string, endDate: string): number => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format number with abbreviation (K, M, B)
 */
export const formatNumberAbbreviated = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Generate random color
 */
export const generateRandomColor = (): string => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#6366F1', '#84CC16', '#06B6D4', '#A855F7',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Calculate savings rate
 */
export const calculateSavingsRate = (income: number, expenses: number): number => {
  if (income === 0) return 0;
  return ((income - expenses) / income) * 100;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  const names = name.trim().split(' ');
  if (names.length === 0) return '?';
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

/**
 * Validate amount input
 */
export const isValidAmount = (amount: string): boolean => {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
};

/**
 * Safe divide to avoid division by zero
 */
export const safeDivide = (numerator: number, denominator: number, defaultValue: number = 0): number => {
  if (denominator === 0) return defaultValue;
  return numerator / denominator;
};
