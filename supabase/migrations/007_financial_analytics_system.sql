-- ========================================
-- FINANCIAL ANALYTICS SYSTEM
-- For AI Chatbot Financial Advisor
-- ========================================
-- This migration creates analytics tables and functions that pre-calculate
-- financial metrics and insights for the chatbot to query, enabling it to
-- provide intelligent financial advice based on trends and patterns.

-- ========================================
-- 1. DAILY FINANCIAL METRICS TABLE
-- ========================================
-- Stores daily snapshots of financial data for trend analysis

CREATE TABLE public.financial_metrics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,

  -- Income & Expense Totals
  total_income DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_expense DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  net_savings DECIMAL(15, 2) DEFAULT 0 NOT NULL,

  -- Running Balances
  running_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,

  -- Transaction Counts
  income_transaction_count INTEGER DEFAULT 0 NOT NULL,
  expense_transaction_count INTEGER DEFAULT 0 NOT NULL,

  -- Category Breakdown (JSONB for flexibility)
  income_by_category JSONB DEFAULT '{}'::jsonb NOT NULL,
  expense_by_category JSONB DEFAULT '{}'::jsonb NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(user_id, metric_date)
);

-- Indexes for fast queries
CREATE INDEX financial_metrics_daily_user_date_idx ON public.financial_metrics_daily(user_id, metric_date DESC);
CREATE INDEX financial_metrics_daily_user_id_idx ON public.financial_metrics_daily(user_id);
CREATE INDEX financial_metrics_daily_date_idx ON public.financial_metrics_daily(metric_date DESC);

-- RLS Policies
ALTER TABLE public.financial_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily metrics"
  ON public.financial_metrics_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily metrics"
  ON public.financial_metrics_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily metrics"
  ON public.financial_metrics_daily FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_financial_metrics_daily_updated_at
  BEFORE UPDATE ON public.financial_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- 2. MONTHLY FINANCIAL METRICS TABLE
-- ========================================
-- Stores monthly aggregated metrics with KPIs

CREATE TABLE public.financial_metrics_monthly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Income & Expense Totals
  total_income DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_expense DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  net_savings DECIMAL(15, 2) DEFAULT 0 NOT NULL,

  -- Key Financial Ratios
  savings_rate DECIMAL(5, 2) DEFAULT 0 NOT NULL, -- Percentage (0-100)

  -- Budget Performance
  budget_adherence_rate DECIMAL(5, 2) DEFAULT 0 NOT NULL, -- Percentage (0-100+)
  budgets_on_track INTEGER DEFAULT 0 NOT NULL,
  budgets_over_limit INTEGER DEFAULT 0 NOT NULL,
  total_budgets INTEGER DEFAULT 0 NOT NULL,

  -- Goals Progress
  active_goals_count INTEGER DEFAULT 0 NOT NULL,
  goals_on_track INTEGER DEFAULT 0 NOT NULL,
  goals_behind INTEGER DEFAULT 0 NOT NULL,

  -- Running Balances
  month_end_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  month_start_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,

  -- Transaction Counts
  income_transaction_count INTEGER DEFAULT 0 NOT NULL,
  expense_transaction_count INTEGER DEFAULT 0 NOT NULL,

  -- Category Breakdown
  income_by_category JSONB DEFAULT '{}'::jsonb NOT NULL,
  expense_by_category JSONB DEFAULT '{}'::jsonb NOT NULL,

  -- Top Categories
  top_expense_category TEXT,
  top_expense_amount DECIMAL(15, 2) DEFAULT 0,
  top_income_category TEXT,
  top_income_amount DECIMAL(15, 2) DEFAULT 0,

  -- Trend Indicators (compared to previous month)
  income_change_percent DECIMAL(5, 2) DEFAULT 0,
  expense_change_percent DECIMAL(5, 2) DEFAULT 0,
  savings_change_percent DECIMAL(5, 2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(user_id, year, month)
);

-- Indexes
CREATE INDEX financial_metrics_monthly_user_date_idx ON public.financial_metrics_monthly(user_id, year DESC, month DESC);
CREATE INDEX financial_metrics_monthly_user_id_idx ON public.financial_metrics_monthly(user_id);

-- RLS Policies
ALTER TABLE public.financial_metrics_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly metrics"
  ON public.financial_metrics_monthly FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly metrics"
  ON public.financial_metrics_monthly FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly metrics"
  ON public.financial_metrics_monthly FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_financial_metrics_monthly_updated_at
  BEFORE UPDATE ON public.financial_metrics_monthly
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- 3. FINANCIAL INSIGHTS TABLE
-- ========================================
-- Stores pre-generated insights for chatbot responses

CREATE TABLE public.financial_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Insight Classification
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'spending_alert',
    'savings_achievement',
    'budget_warning',
    'goal_progress',
    'trend_positive',
    'trend_negative',
    'recommendation',
    'milestone',
    'anomaly'
  )),

  -- Insight Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'success')),

  -- Related Data
  metric_period TEXT, -- e.g., '2025-01', 'daily', 'weekly'
  related_category TEXT,
  amount DECIMAL(15, 2),
  percentage DECIMAL(5, 2),

  -- Actionable Recommendations
  recommendation_text TEXT,
  action_required BOOLEAN DEFAULT false,

  -- Metadata
  is_active BOOLEAN DEFAULT true NOT NULL,
  acknowledged BOOLEAN DEFAULT false NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX financial_insights_user_id_idx ON public.financial_insights(user_id);
CREATE INDEX financial_insights_active_idx ON public.financial_insights(user_id, is_active, created_at DESC);
CREATE INDEX financial_insights_type_idx ON public.financial_insights(user_id, insight_type);

-- RLS Policies
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.financial_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON public.financial_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON public.financial_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON public.financial_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_financial_insights_updated_at
  BEFORE UPDATE ON public.financial_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- 4. CHATBOT CONTEXT TABLE
-- ========================================
-- Stores aggregated context for faster chatbot queries

CREATE TABLE public.chatbot_financial_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Current Financial Status
  current_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_income_mtd DECIMAL(15, 2) DEFAULT 0 NOT NULL, -- Month to date
  total_expense_mtd DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  savings_rate_current DECIMAL(5, 2) DEFAULT 0 NOT NULL,

  -- Averages (Last 3 months)
  avg_monthly_income DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  avg_monthly_expense DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  avg_savings_rate DECIMAL(5, 2) DEFAULT 0 NOT NULL,

  -- Budget Status
  budgets_exceeded INTEGER DEFAULT 0 NOT NULL,
  budgets_warning INTEGER DEFAULT 0 NOT NULL, -- 80-100%
  budgets_healthy INTEGER DEFAULT 0 NOT NULL,

  -- Goal Status
  goals_achieved INTEGER DEFAULT 0 NOT NULL,
  goals_on_track INTEGER DEFAULT 0 NOT NULL,
  goals_behind INTEGER DEFAULT 0 NOT NULL,

  -- Financial Health Score (0-100)
  financial_health_score INTEGER DEFAULT 50 NOT NULL CHECK (financial_health_score >= 0 AND financial_health_score <= 100),

  -- Top Spending Categories (last 30 days)
  top_spending_categories JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Recent Trends
  income_trend TEXT CHECK (income_trend IN ('increasing', 'stable', 'decreasing', 'unknown')),
  expense_trend TEXT CHECK (expense_trend IN ('increasing', 'stable', 'decreasing', 'unknown')),

  -- Emergency Fund Status
  emergency_fund_months DECIMAL(4, 2) DEFAULT 0, -- How many months of expenses covered

  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One record per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX chatbot_financial_context_user_id_idx ON public.chatbot_financial_context(user_id);

-- RLS Policies
ALTER TABLE public.chatbot_financial_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chatbot context"
  ON public.chatbot_financial_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chatbot context"
  ON public.chatbot_financial_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chatbot context"
  ON public.chatbot_financial_context FOR UPDATE
  USING (auth.uid() = user_id);


-- ========================================
-- 5. FUNCTIONS FOR METRIC CALCULATIONS
-- ========================================

-- Function to calculate daily metrics for a user and date
CREATE OR REPLACE FUNCTION calculate_daily_metrics(
  p_user_id UUID,
  p_date DATE
)
RETURNS void AS $$
DECLARE
  v_total_income DECIMAL(15, 2);
  v_total_expense DECIMAL(15, 2);
  v_net_savings DECIMAL(15, 2);
  v_income_count INTEGER;
  v_expense_count INTEGER;
  v_income_by_category JSONB;
  v_expense_by_category JSONB;
  v_running_balance DECIMAL(15, 2);
BEGIN
  -- Calculate totals
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
    COUNT(CASE WHEN t.type = 'income' THEN 1 END),
    COUNT(CASE WHEN t.type = 'expense' THEN 1 END)
  INTO v_total_income, v_total_expense, v_income_count, v_expense_count
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND DATE(t.date) = p_date;

  v_net_savings := v_total_income - v_total_expense;

  -- Calculate income by category
  SELECT COALESCE(
    jsonb_object_agg(c.name, category_sum.amount),
    '{}'::jsonb
  )
  INTO v_income_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as amount
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'income'
      AND DATE(t.date) = p_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  -- Calculate expense by category
  SELECT COALESCE(
    jsonb_object_agg(c.name, category_sum.amount),
    '{}'::jsonb
  )
  INTO v_expense_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as amount
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND DATE(t.date) = p_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  -- Calculate running balance (all transactions up to this date)
  SELECT COALESCE(
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END),
    0
  )
  INTO v_running_balance
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND DATE(t.date) <= p_date;

  -- Insert or update daily metrics
  INSERT INTO public.financial_metrics_daily (
    user_id, metric_date, total_income, total_expense, net_savings,
    running_balance, income_transaction_count, expense_transaction_count,
    income_by_category, expense_by_category
  )
  VALUES (
    p_user_id, p_date, v_total_income, v_total_expense, v_net_savings,
    v_running_balance, v_income_count, v_expense_count,
    v_income_by_category, v_expense_by_category
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    net_savings = EXCLUDED.net_savings,
    running_balance = EXCLUDED.running_balance,
    income_transaction_count = EXCLUDED.income_transaction_count,
    expense_transaction_count = EXCLUDED.expense_transaction_count,
    income_by_category = EXCLUDED.income_by_category,
    expense_by_category = EXCLUDED.expense_by_category,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- Function to calculate monthly metrics for a user, year, and month
CREATE OR REPLACE FUNCTION calculate_monthly_metrics(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS void AS $$
DECLARE
  v_total_income DECIMAL(15, 2);
  v_total_expense DECIMAL(15, 2);
  v_net_savings DECIMAL(15, 2);
  v_savings_rate DECIMAL(5, 2);
  v_income_count INTEGER;
  v_expense_count INTEGER;
  v_income_by_category JSONB;
  v_expense_by_category JSONB;
  v_month_start_balance DECIMAL(15, 2);
  v_month_end_balance DECIMAL(15, 2);
  v_top_expense_category TEXT;
  v_top_expense_amount DECIMAL(15, 2);
  v_top_income_category TEXT;
  v_top_income_amount DECIMAL(15, 2);
  v_budget_adherence DECIMAL(5, 2);
  v_budgets_on_track INTEGER;
  v_budgets_over INTEGER;
  v_total_budgets INTEGER;
  v_prev_income DECIMAL(15, 2);
  v_prev_expense DECIMAL(15, 2);
  v_prev_savings DECIMAL(15, 2);
  v_income_change DECIMAL(5, 2);
  v_expense_change DECIMAL(5, 2);
  v_savings_change DECIMAL(5, 2);
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := DATE(p_year || '-' || p_month || '-01');
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::DATE;

  -- Calculate totals for the month
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
    COUNT(CASE WHEN t.type = 'income' THEN 1 END),
    COUNT(CASE WHEN t.type = 'expense' THEN 1 END)
  INTO v_total_income, v_total_expense, v_income_count, v_expense_count
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND DATE(t.date) >= v_start_date
    AND DATE(t.date) <= v_end_date;

  v_net_savings := v_total_income - v_total_expense;

  -- Calculate savings rate
  IF v_total_income > 0 THEN
    v_savings_rate := (v_net_savings / v_total_income * 100);
  ELSE
    v_savings_rate := 0;
  END IF;

  -- Calculate income by category
  SELECT COALESCE(
    jsonb_object_agg(c.name, category_sum.amount),
    '{}'::jsonb
  )
  INTO v_income_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as amount
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'income'
      AND DATE(t.date) >= v_start_date
      AND DATE(t.date) <= v_end_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  -- Calculate expense by category
  SELECT COALESCE(
    jsonb_object_agg(c.name, category_sum.amount),
    '{}'::jsonb
  )
  INTO v_expense_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as amount
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND DATE(t.date) >= v_start_date
      AND DATE(t.date) <= v_end_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  -- Get top expense category
  SELECT c.name, SUM(t.amount)
  INTO v_top_expense_category, v_top_expense_amount
  FROM public.transactions t
  JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = p_user_id
    AND t.type = 'expense'
    AND DATE(t.date) >= v_start_date
    AND DATE(t.date) <= v_end_date
  GROUP BY c.name
  ORDER BY SUM(t.amount) DESC
  LIMIT 1;

  -- Get top income category
  SELECT c.name, SUM(t.amount)
  INTO v_top_income_category, v_top_income_amount
  FROM public.transactions t
  JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = p_user_id
    AND t.type = 'income'
    AND DATE(t.date) >= v_start_date
    AND DATE(t.date) <= v_end_date
  GROUP BY c.name
  ORDER BY SUM(t.amount) DESC
  LIMIT 1;

  -- Calculate month start and end balances
  SELECT COALESCE(
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END),
    0
  )
  INTO v_month_start_balance
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND DATE(t.date) < v_start_date;

  v_month_end_balance := v_month_start_balance + v_net_savings;

  -- Calculate budget metrics
  SELECT
    COUNT(*),
    COUNT(CASE WHEN spent <= limit_amount THEN 1 END),
    COUNT(CASE WHEN spent > limit_amount THEN 1 END)
  INTO v_total_budgets, v_budgets_on_track, v_budgets_over
  FROM (
    SELECT
      b.limit_amount,
      COALESCE(SUM(t.amount), 0) as spent
    FROM public.budgets b
    LEFT JOIN public.transactions t ON t.category_id = b.category_id
      AND t.user_id = b.user_id
      AND t.type = 'expense'
      AND DATE(t.date) >= v_start_date
      AND DATE(t.date) <= v_end_date
    WHERE b.user_id = p_user_id
      AND b.period = 'monthly'
    GROUP BY b.id, b.limit_amount
  ) budget_spending;

  IF v_total_budgets > 0 THEN
    v_budget_adherence := (v_budgets_on_track::DECIMAL / v_total_budgets * 100);
  ELSE
    v_budget_adherence := 100;
  END IF;

  -- Get previous month data for trend calculation
  SELECT total_income, total_expense, net_savings
  INTO v_prev_income, v_prev_expense, v_prev_savings
  FROM public.financial_metrics_monthly
  WHERE user_id = p_user_id
    AND (year = p_year AND month = p_month - 1)
       OR (year = p_year - 1 AND month = 12 AND p_month = 1);

  -- Calculate changes
  IF v_prev_income IS NOT NULL AND v_prev_income > 0 THEN
    v_income_change := ((v_total_income - v_prev_income) / v_prev_income * 100);
  ELSE
    v_income_change := 0;
  END IF;

  IF v_prev_expense IS NOT NULL AND v_prev_expense > 0 THEN
    v_expense_change := ((v_total_expense - v_prev_expense) / v_prev_expense * 100);
  ELSE
    v_expense_change := 0;
  END IF;

  IF v_prev_savings IS NOT NULL AND v_prev_savings != 0 THEN
    v_savings_change := ((v_net_savings - v_prev_savings) / ABS(v_prev_savings) * 100);
  ELSE
    v_savings_change := 0;
  END IF;

  -- Insert or update monthly metrics
  INSERT INTO public.financial_metrics_monthly (
    user_id, year, month, total_income, total_expense, net_savings, savings_rate,
    budget_adherence_rate, budgets_on_track, budgets_over_limit, total_budgets,
    month_start_balance, month_end_balance,
    income_transaction_count, expense_transaction_count,
    income_by_category, expense_by_category,
    top_expense_category, top_expense_amount,
    top_income_category, top_income_amount,
    income_change_percent, expense_change_percent, savings_change_percent
  )
  VALUES (
    p_user_id, p_year, p_month, v_total_income, v_total_expense, v_net_savings, v_savings_rate,
    v_budget_adherence, v_budgets_on_track, v_budgets_over, v_total_budgets,
    v_month_start_balance, v_month_end_balance,
    v_income_count, v_expense_count,
    v_income_by_category, v_expense_by_category,
    v_top_expense_category, v_top_expense_amount,
    v_top_income_category, v_top_income_amount,
    v_income_change, v_expense_change, v_savings_change
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    net_savings = EXCLUDED.net_savings,
    savings_rate = EXCLUDED.savings_rate,
    budget_adherence_rate = EXCLUDED.budget_adherence_rate,
    budgets_on_track = EXCLUDED.budgets_on_track,
    budgets_over_limit = EXCLUDED.budgets_over_limit,
    total_budgets = EXCLUDED.total_budgets,
    month_start_balance = EXCLUDED.month_start_balance,
    month_end_balance = EXCLUDED.month_end_balance,
    income_transaction_count = EXCLUDED.income_transaction_count,
    expense_transaction_count = EXCLUDED.expense_transaction_count,
    income_by_category = EXCLUDED.income_by_category,
    expense_by_category = EXCLUDED.expense_by_category,
    top_expense_category = EXCLUDED.top_expense_category,
    top_expense_amount = EXCLUDED.top_expense_amount,
    top_income_category = EXCLUDED.top_income_category,
    top_income_amount = EXCLUDED.top_income_amount,
    income_change_percent = EXCLUDED.income_change_percent,
    expense_change_percent = EXCLUDED.expense_change_percent,
    savings_change_percent = EXCLUDED.savings_change_percent,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- Function to update chatbot context
CREATE OR REPLACE FUNCTION update_chatbot_context(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_current_balance DECIMAL(15, 2);
  v_total_income_mtd DECIMAL(15, 2);
  v_total_expense_mtd DECIMAL(15, 2);
  v_savings_rate_current DECIMAL(5, 2);
  v_avg_income DECIMAL(15, 2);
  v_avg_expense DECIMAL(15, 2);
  v_avg_savings_rate DECIMAL(5, 2);
  v_budgets_exceeded INTEGER;
  v_budgets_warning INTEGER;
  v_budgets_healthy INTEGER;
  v_financial_health_score INTEGER;
  v_top_spending JSONB;
  v_income_trend TEXT;
  v_expense_trend TEXT;
  v_emergency_fund_months DECIMAL(4, 2);
  v_avg_monthly_expense DECIMAL(15, 2);
BEGIN
  -- Get current balance
  SELECT COALESCE(
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END),
    0
  )
  INTO v_current_balance
  FROM public.transactions
  WHERE user_id = p_user_id;

  -- Get month-to-date totals
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income_mtd, v_total_expense_mtd
  FROM public.transactions
  WHERE user_id = p_user_id
    AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Calculate current month savings rate
  IF v_total_income_mtd > 0 THEN
    v_savings_rate_current := ((v_total_income_mtd - v_total_expense_mtd) / v_total_income_mtd * 100);
  ELSE
    v_savings_rate_current := 0;
  END IF;

  -- Get 3-month averages
  SELECT
    AVG(total_income),
    AVG(total_expense),
    AVG(savings_rate)
  INTO v_avg_income, v_avg_expense, v_avg_savings_rate
  FROM public.financial_metrics_monthly
  WHERE user_id = p_user_id
    AND (year * 12 + month) >= (EXTRACT(YEAR FROM CURRENT_DATE) * 12 + EXTRACT(MONTH FROM CURRENT_DATE) - 3)
  LIMIT 3;

  -- Get budget status (current month)
  SELECT
    COUNT(CASE WHEN spent > limit_amount THEN 1 END),
    COUNT(CASE WHEN spent >= limit_amount * 0.8 AND spent <= limit_amount THEN 1 END),
    COUNT(CASE WHEN spent < limit_amount * 0.8 THEN 1 END)
  INTO v_budgets_exceeded, v_budgets_warning, v_budgets_healthy
  FROM (
    SELECT
      b.limit_amount,
      COALESCE(SUM(t.amount), 0) as spent
    FROM public.budgets b
    LEFT JOIN public.transactions t ON t.category_id = b.category_id
      AND t.user_id = b.user_id
      AND t.type = 'expense'
      AND DATE(t.date) >= DATE_TRUNC('month', CURRENT_DATE)::DATE
    WHERE b.user_id = p_user_id
      AND b.period = 'monthly'
    GROUP BY b.id, b.limit_amount
  ) budget_status;

  -- Get top 5 spending categories (last 30 days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', category_name,
        'amount', total_amount,
        'percentage', ROUND((total_amount / NULLIF(sum_total, 0) * 100)::NUMERIC, 2)
      )
    ),
    '[]'::jsonb
  )
  INTO v_top_spending
  FROM (
    SELECT
      c.name as category_name,
      SUM(t.amount) as total_amount,
      SUM(SUM(t.amount)) OVER () as sum_total
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY c.name
    ORDER BY total_amount DESC
    LIMIT 5
  ) top_cats;

  -- Determine income trend (last 3 months)
  SELECT
    CASE
      WHEN COUNT(*) < 2 THEN 'unknown'
      WHEN AVG(CASE WHEN row_num = 1 THEN total_income END) > AVG(CASE WHEN row_num = 3 THEN total_income END) * 1.1 THEN 'increasing'
      WHEN AVG(CASE WHEN row_num = 1 THEN total_income END) < AVG(CASE WHEN row_num = 3 THEN total_income END) * 0.9 THEN 'decreasing'
      ELSE 'stable'
    END
  INTO v_income_trend
  FROM (
    SELECT total_income, ROW_NUMBER() OVER (ORDER BY year DESC, month DESC) as row_num
    FROM public.financial_metrics_monthly
    WHERE user_id = p_user_id
    ORDER BY year DESC, month DESC
    LIMIT 3
  ) recent_months;

  -- Determine expense trend
  SELECT
    CASE
      WHEN COUNT(*) < 2 THEN 'unknown'
      WHEN AVG(CASE WHEN row_num = 1 THEN total_expense END) > AVG(CASE WHEN row_num = 3 THEN total_expense END) * 1.1 THEN 'increasing'
      WHEN AVG(CASE WHEN row_num = 1 THEN total_expense END) < AVG(CASE WHEN row_num = 3 THEN total_expense END) * 0.9 THEN 'decreasing'
      ELSE 'stable'
    END
  INTO v_expense_trend
  FROM (
    SELECT total_expense, ROW_NUMBER() OVER (ORDER BY year DESC, month DESC) as row_num
    FROM public.financial_metrics_monthly
    WHERE user_id = p_user_id
    ORDER BY year DESC, month DESC
    LIMIT 3
  ) recent_months;

  -- Calculate emergency fund in months
  SELECT AVG(total_expense)
  INTO v_avg_monthly_expense
  FROM public.financial_metrics_monthly
  WHERE user_id = p_user_id
  ORDER BY year DESC, month DESC
  LIMIT 3;

  IF v_avg_monthly_expense > 0 THEN
    v_emergency_fund_months := v_current_balance / v_avg_monthly_expense;
  ELSE
    v_emergency_fund_months := 0;
  END IF;

  -- Calculate financial health score (0-100)
  v_financial_health_score := 0;

  -- Positive balance: up to 20 points
  IF v_current_balance > 0 THEN
    v_financial_health_score := v_financial_health_score + 20;
  END IF;

  -- Savings rate: up to 25 points (20% = 25 points)
  v_financial_health_score := v_financial_health_score + LEAST(25, (COALESCE(v_avg_savings_rate, 0) / 20 * 25)::INTEGER);

  -- Budget adherence: up to 20 points
  IF v_budgets_exceeded = 0 AND (v_budgets_healthy + v_budgets_warning) > 0 THEN
    v_financial_health_score := v_financial_health_score + 20;
  ELSIF v_budgets_exceeded = 0 THEN
    v_financial_health_score := v_financial_health_score + 10;
  END IF;

  -- Emergency fund: up to 25 points (6+ months = 25 points)
  v_financial_health_score := v_financial_health_score + LEAST(25, (COALESCE(v_emergency_fund_months, 0) / 6 * 25)::INTEGER);

  -- Positive trends: up to 10 points
  IF v_income_trend = 'increasing' THEN
    v_financial_health_score := v_financial_health_score + 5;
  END IF;
  IF v_expense_trend = 'decreasing' THEN
    v_financial_health_score := v_financial_health_score + 5;
  END IF;

  -- Insert or update chatbot context
  INSERT INTO public.chatbot_financial_context (
    user_id, current_balance, total_income_mtd, total_expense_mtd, savings_rate_current,
    avg_monthly_income, avg_monthly_expense, avg_savings_rate,
    budgets_exceeded, budgets_warning, budgets_healthy,
    financial_health_score, top_spending_categories,
    income_trend, expense_trend, emergency_fund_months
  )
  VALUES (
    p_user_id, v_current_balance, v_total_income_mtd, v_total_expense_mtd, v_savings_rate_current,
    COALESCE(v_avg_income, 0), COALESCE(v_avg_expense, 0), COALESCE(v_avg_savings_rate, 0),
    COALESCE(v_budgets_exceeded, 0), COALESCE(v_budgets_warning, 0), COALESCE(v_budgets_healthy, 0),
    v_financial_health_score, v_top_spending,
    COALESCE(v_income_trend, 'unknown'), COALESCE(v_expense_trend, 'unknown'), COALESCE(v_emergency_fund_months, 0)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    total_income_mtd = EXCLUDED.total_income_mtd,
    total_expense_mtd = EXCLUDED.total_expense_mtd,
    savings_rate_current = EXCLUDED.savings_rate_current,
    avg_monthly_income = EXCLUDED.avg_monthly_income,
    avg_monthly_expense = EXCLUDED.avg_monthly_expense,
    avg_savings_rate = EXCLUDED.avg_savings_rate,
    budgets_exceeded = EXCLUDED.budgets_exceeded,
    budgets_warning = EXCLUDED.budgets_warning,
    budgets_healthy = EXCLUDED.budgets_healthy,
    financial_health_score = EXCLUDED.financial_health_score,
    top_spending_categories = EXCLUDED.top_spending_categories,
    income_trend = EXCLUDED.income_trend,
    expense_trend = EXCLUDED.expense_trend,
    emergency_fund_months = EXCLUDED.emergency_fund_months,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- 6. TRIGGERS FOR AUTO-UPDATE
-- ========================================

-- Trigger function to update metrics when transactions change
CREATE OR REPLACE FUNCTION trigger_update_financial_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_date DATE;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Determine the date to update (NEW for INSERT/UPDATE, OLD for DELETE)
  IF TG_OP = 'DELETE' THEN
    v_date := DATE(OLD.date);
  ELSE
    v_date := DATE(NEW.date);
  END IF;

  v_year := EXTRACT(YEAR FROM v_date);
  v_month := EXTRACT(MONTH FROM v_date);

  -- Update daily metrics
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_daily_metrics(OLD.user_id, v_date);
    PERFORM calculate_monthly_metrics(OLD.user_id, v_year, v_month);
    PERFORM update_chatbot_context(OLD.user_id);
  ELSE
    PERFORM calculate_daily_metrics(NEW.user_id, v_date);
    PERFORM calculate_monthly_metrics(NEW.user_id, v_year, v_month);
    PERFORM update_chatbot_context(NEW.user_id);

    -- If date changed in UPDATE, also update old date
    IF TG_OP = 'UPDATE' AND DATE(OLD.date) != DATE(NEW.date) THEN
      PERFORM calculate_daily_metrics(OLD.user_id, DATE(OLD.date));
      PERFORM calculate_monthly_metrics(OLD.user_id, EXTRACT(YEAR FROM OLD.date)::INTEGER, EXTRACT(MONTH FROM OLD.date)::INTEGER);
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to transactions table
CREATE TRIGGER update_financial_metrics_on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_financial_metrics();


-- ========================================
-- 7. HELPER VIEWS FOR CHATBOT
-- ========================================

-- View for latest financial status per user
CREATE OR REPLACE VIEW public.v_latest_financial_status AS
SELECT
  m.user_id,
  m.year,
  m.month,
  m.total_income,
  m.total_expense,
  m.net_savings,
  m.savings_rate,
  m.budget_adherence_rate,
  m.month_end_balance as current_balance,
  m.top_expense_category,
  m.top_expense_amount,
  m.income_change_percent,
  m.expense_change_percent,
  c.financial_health_score,
  c.emergency_fund_months,
  c.income_trend,
  c.expense_trend
FROM public.financial_metrics_monthly m
LEFT JOIN public.chatbot_financial_context c ON c.user_id = m.user_id
WHERE (m.user_id, m.year, m.month) IN (
  SELECT user_id, year, month
  FROM public.financial_metrics_monthly
  GROUP BY user_id
  HAVING (year, month) = (SELECT year, month FROM public.financial_metrics_monthly WHERE user_id = financial_metrics_monthly.user_id ORDER BY year DESC, month DESC LIMIT 1)
);


-- View for spending patterns (category analysis)
CREATE OR REPLACE VIEW public.v_spending_patterns AS
SELECT
  user_id,
  year,
  month,
  jsonb_array_elements(
    CASE
      WHEN expense_by_category = '{}'::jsonb THEN '[]'::jsonb
      ELSE (
        SELECT jsonb_agg(
          jsonb_build_object(
            'category', key,
            'amount', value::text::numeric,
            'percentage', ROUND((value::text::numeric / NULLIF(total_expense, 0) * 100)::numeric, 2)
          )
        )
        FROM jsonb_each(expense_by_category)
      )
    END
  ) as category_breakdown,
  total_expense
FROM public.financial_metrics_monthly;


-- ========================================
-- GRANTS FOR AUTHENTICATED USERS
-- ========================================

GRANT SELECT ON public.financial_metrics_daily TO authenticated;
GRANT SELECT ON public.financial_metrics_monthly TO authenticated;
GRANT SELECT ON public.financial_insights TO authenticated;
GRANT SELECT ON public.chatbot_financial_context TO authenticated;
GRANT SELECT ON public.v_latest_financial_status TO authenticated;
GRANT SELECT ON public.v_spending_patterns TO authenticated;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run this migration in your Supabase SQL editor
-- After running, the system will automatically calculate metrics when transactions are added/updated
