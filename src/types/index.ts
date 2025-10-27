// Core types for the application

// Personalization types
export type FinancialGoal =
  | 'save_house'
  | 'pay_debt'
  | 'emergency_fund'
  | 'retirement'
  | 'investment'
  | 'travel'
  | 'education'
  | 'track_spending';

export type FinancialKnowledge = 'beginner' | 'intermediate' | 'advanced';

export type CommunicationStyle =
  | 'casual'
  | 'professional'
  | 'brief'
  | 'detailed'
  | 'encouraging';

export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56+';

export type FinancialConcern =
  | 'overspending'
  | 'not_saving'
  | 'debt'
  | 'budgeting'
  | 'investment'
  | 'retirement_plan'
  | 'education_costs'
  | 'healthcare_costs';

export type IncomeLevel =
  | 'student'
  | 'entry'
  | 'middle'
  | 'upper_middle'
  | 'high'
  | 'prefer_not_say';

export type FamilySituation =
  | 'single'
  | 'partnered_no_kids'
  | 'partnered_with_kids'
  | 'single_parent'
  | 'living_with_parents'
  | 'retired';

export interface UserPersonalization {
  financial_goals: FinancialGoal[];
  financial_knowledge?: FinancialKnowledge;
  communication_style?: CommunicationStyle;
  age_range?: AgeRange;
  financial_concerns: FinancialConcern[];
  income_level?: IncomeLevel;
  family_situation?: FamilySituation;
  has_completed_personalization: boolean;
}

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
  // Personalization fields
  financial_goals?: FinancialGoal[];
  financial_knowledge?: FinancialKnowledge;
  communication_style?: CommunicationStyle;
  age_range?: AgeRange;
  financial_concerns?: FinancialConcern[];
  income_level?: IncomeLevel;
  family_situation?: FamilySituation;
  has_completed_personalization?: boolean;
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
  parsedTransactions?: ParsedTransaction[]; // Support multiple transactions
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

export type ChatIntent = 'small_talk' | 'create_transaction' | 'financial_advice' | 'unknown';

export interface IntentClassificationResult {
  intent: ChatIntent;
  confidence: number;
}

// ========================================
// Financial Analytics Types
// ========================================

export interface FinancialMetricsDaily {
  id: string;
  user_id: string;
  metric_date: string;
  total_income: number;
  total_expense: number;
  net_savings: number;
  running_balance: number;
  income_transaction_count: number;
  expense_transaction_count: number;
  income_by_category: Record<string, number>;
  expense_by_category: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface FinancialMetricsMonthly {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  budget_adherence_rate: number;
  budgets_on_track: number;
  budgets_over_limit: number;
  total_budgets: number;
  active_goals_count: number;
  goals_on_track: number;
  goals_behind: number;
  month_end_balance: number;
  month_start_balance: number;
  income_transaction_count: number;
  expense_transaction_count: number;
  income_by_category: Record<string, number>;
  expense_by_category: Record<string, number>;
  top_expense_category: string | null;
  top_expense_amount: number;
  top_income_category: string | null;
  top_income_amount: number;
  income_change_percent: number;
  expense_change_percent: number;
  savings_change_percent: number;
  created_at: string;
  updated_at: string;
}

export type InsightType =
  | 'spending_alert'
  | 'savings_achievement'
  | 'budget_warning'
  | 'goal_progress'
  | 'trend_positive'
  | 'trend_negative'
  | 'recommendation'
  | 'milestone'
  | 'anomaly';

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface FinancialInsight {
  id: string;
  user_id: string;
  insight_type: InsightType;
  title: string;
  message: string;
  severity: InsightSeverity;
  metric_period: string | null;
  related_category: string | null;
  amount: number | null;
  percentage: number | null;
  recommendation_text: string | null;
  action_required: boolean;
  is_active: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TrendDirection = 'increasing' | 'stable' | 'decreasing' | 'unknown';

export interface TopSpendingCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ChatbotFinancialContext {
  id: string;
  user_id: string;
  current_balance: number;
  total_income_mtd: number;
  total_expense_mtd: number;
  savings_rate_current: number;
  avg_monthly_income: number;
  avg_monthly_expense: number;
  avg_savings_rate: number;
  budgets_exceeded: number;
  budgets_warning: number;
  budgets_healthy: number;
  goals_achieved: number;
  goals_on_track: number;
  goals_behind: number;
  financial_health_score: number;
  top_spending_categories: TopSpendingCategory[];
  income_trend: TrendDirection;
  expense_trend: TrendDirection;
  emergency_fund_months: number;
  last_updated: string;
  created_at: string;
}

export interface LatestFinancialStatus {
  user_id: string;
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  budget_adherence_rate: number;
  current_balance: number;
  top_expense_category: string | null;
  top_expense_amount: number;
  income_change_percent: number;
  expense_change_percent: number;
  financial_health_score: number;
  emergency_fund_months: number;
  income_trend: TrendDirection;
  expense_trend: TrendDirection;
}

// Financial Advice Response Types
export interface FinancialAdviceResponse {
  advice: string;
  insights: FinancialInsight[];
  context: ChatbotFinancialContext;
  recommendations: string[];
}
