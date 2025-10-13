// Core types for the application

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  date_format: string;
  week_start: number;
  month_start: number;
  notifications_enabled: boolean;
  has_completed_onboarding: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category?: Category;
  note?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category?: Category;
  amount: number;
  period: 'month' | 'quarter' | 'year';
  start_date: string;
  end_date: string;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SavingGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  start_date: string;
  target_date: string;
  icon: string;
  color: string;
  note?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface NetBalance {
  user_id: string;
  current_balance: number;
  total_income: number;
  total_expense: number;
}

export interface BudgetSpending {
  budget_id: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  usage_percent: number;
}

export interface GoalProgress {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  progress_percent: number;
}

// Chat & AI Assistant Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'confirmation';
  parsedTransaction?: ParsedTransaction;
}

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category_name?: string;
  note?: string;
  date: string;
  confidence: number;
}

export type ChatIntent = 'small_talk' | 'create_transaction' | 'unknown';

export interface IntentClassificationResult {
  intent: ChatIntent;
  confidence: number;
}
