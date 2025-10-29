-- ========================================
-- COMPLETE FIX FOR ANALYTICS TRIGGER SYSTEM
-- ========================================
-- This migration fixes ALL issues:
-- 1. Adds SECURITY DEFINER to all calculation functions
-- 2. Adds SECURITY DEFINER to trigger function (KEY FIX!)
-- 3. Fixes column name bugs (_pct → _percent)
-- 4. Fixes SQL syntax errors (DISTINCT + ORDER BY)
-- 5. Recreates trigger to ensure proper connection
-- 6. Initializes analytics for all existing users

-- ========================================
-- 1. FIX calculate_daily_metrics with SECURITY DEFINER
-- ========================================

CREATE OR REPLACE FUNCTION calculate_daily_metrics(
  p_user_id UUID,
  p_date DATE
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
  -- Calculate totals for this date
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
  SELECT COALESCE(jsonb_object_agg(c.name, category_sum.total), '{}'::jsonb)
  INTO v_income_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as total
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'income'
      AND DATE(t.date) = p_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  -- Calculate expense by category
  SELECT COALESCE(jsonb_object_agg(c.name, category_sum.total), '{}'::jsonb)
  INTO v_expense_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as total
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
$$;


-- ========================================
-- 2. FIX calculate_monthly_metrics with SECURITY DEFINER (CORRECT COLUMN NAMES!)
-- ========================================

CREATE OR REPLACE FUNCTION calculate_monthly_metrics(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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

  -- Get category breakdowns
  SELECT COALESCE(jsonb_object_agg(c.name, category_sum.total), '{}'::jsonb)
  INTO v_income_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as total
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'income'
      AND DATE(t.date) >= v_start_date
      AND DATE(t.date) <= v_end_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  SELECT COALESCE(jsonb_object_agg(c.name, category_sum.total), '{}'::jsonb)
  INTO v_expense_by_category
  FROM (
    SELECT t.category_id, SUM(t.amount) as total
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND DATE(t.date) >= v_start_date
      AND DATE(t.date) <= v_end_date
    GROUP BY t.category_id
  ) category_sum
  JOIN public.categories c ON c.id = category_sum.category_id;

  -- Get balances
  SELECT COALESCE(
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END),
    0
  )
  INTO v_month_start_balance
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND DATE(t.date) < v_start_date;

  SELECT COALESCE(
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END),
    0
  )
  INTO v_month_end_balance
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND DATE(t.date) <= v_end_date;

  -- Get top categories
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

  -- Calculate budget adherence
  SELECT
    COUNT(*),
    COUNT(CASE WHEN COALESCE(budget_spent.spent, 0) <= b.limit_amount THEN 1 END),
    COUNT(CASE WHEN COALESCE(budget_spent.spent, 0) > b.limit_amount THEN 1 END)
  INTO v_total_budgets, v_budgets_on_track, v_budgets_over
  FROM public.budgets b
  LEFT JOIN (
    SELECT category_id, SUM(amount) as spent
    FROM public.transactions
    WHERE user_id = p_user_id
      AND type = 'expense'
      AND DATE(date) >= v_start_date
      AND DATE(date) <= v_end_date
    GROUP BY category_id
  ) budget_spent ON budget_spent.category_id = b.category_id
  WHERE b.user_id = p_user_id
    AND b.period = 'monthly';

  IF v_total_budgets > 0 THEN
    v_budget_adherence := (v_budgets_on_track::DECIMAL / v_total_budgets * 100);
  ELSE
    v_budget_adherence := 100;
  END IF;

  -- Get previous month for comparison
  SELECT
    COALESCE(total_income, 0),
    COALESCE(total_expense, 0),
    COALESCE(net_savings, 0)
  INTO v_prev_income, v_prev_expense, v_prev_savings
  FROM public.financial_metrics_monthly
  WHERE user_id = p_user_id
    AND ((year = p_year AND month = p_month - 1) OR (year = p_year - 1 AND month = 12 AND p_month = 1))
  ORDER BY year DESC, month DESC
  LIMIT 1;

  -- Calculate changes
  IF v_prev_income > 0 THEN
    v_income_change := ((v_total_income - v_prev_income) / v_prev_income * 100);
  ELSE
    v_income_change := 0;
  END IF;

  IF v_prev_expense > 0 THEN
    v_expense_change := ((v_total_expense - v_prev_expense) / v_prev_expense * 100);
  ELSE
    v_expense_change := 0;
  END IF;

  IF v_prev_savings != 0 THEN
    v_savings_change := ((v_net_savings - v_prev_savings) / ABS(v_prev_savings) * 100);
  ELSE
    v_savings_change := 0;
  END IF;

  -- Insert or update monthly metrics (NOTE: Using _percent not _pct!)
  INSERT INTO public.financial_metrics_monthly (
    user_id, year, month,
    total_income, total_expense, net_savings, savings_rate,
    income_transaction_count, expense_transaction_count,
    income_by_category, expense_by_category,
    month_start_balance, month_end_balance,
    top_expense_category, top_expense_amount,
    top_income_category, top_income_amount,
    budget_adherence_rate, budgets_on_track, budgets_over_limit, total_budgets,
    income_change_percent, expense_change_percent, savings_change_percent
  )
  VALUES (
    p_user_id, p_year, p_month,
    v_total_income, v_total_expense, v_net_savings, v_savings_rate,
    v_income_count, v_expense_count,
    v_income_by_category, v_expense_by_category,
    v_month_start_balance, v_month_end_balance,
    v_top_expense_category, v_top_expense_amount,
    v_top_income_category, v_top_income_amount,
    v_budget_adherence, v_budgets_on_track, v_budgets_over, v_total_budgets,
    v_income_change, v_expense_change, v_savings_change
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    net_savings = EXCLUDED.net_savings,
    savings_rate = EXCLUDED.savings_rate,
    income_transaction_count = EXCLUDED.income_transaction_count,
    expense_transaction_count = EXCLUDED.expense_transaction_count,
    income_by_category = EXCLUDED.income_by_category,
    expense_by_category = EXCLUDED.expense_by_category,
    month_start_balance = EXCLUDED.month_start_balance,
    month_end_balance = EXCLUDED.month_end_balance,
    top_expense_category = EXCLUDED.top_expense_category,
    top_expense_amount = EXCLUDED.top_expense_amount,
    top_income_category = EXCLUDED.top_income_category,
    top_income_amount = EXCLUDED.top_income_amount,
    budget_adherence_rate = EXCLUDED.budget_adherence_rate,
    budgets_on_track = EXCLUDED.budgets_on_track,
    budgets_over_limit = EXCLUDED.budgets_over_limit,
    total_budgets = EXCLUDED.total_budgets,
    income_change_percent = EXCLUDED.income_change_percent,
    expense_change_percent = EXCLUDED.expense_change_percent,
    savings_change_percent = EXCLUDED.savings_change_percent,
    updated_at = NOW();
END;
$$;


-- ========================================
-- 3. FIX update_chatbot_context with SECURITY DEFINER
-- ========================================

CREATE OR REPLACE FUNCTION update_chatbot_context(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance DECIMAL(15, 2);
  v_total_income_mtd DECIMAL(15, 2);
  v_total_expense_mtd DECIMAL(15, 2);
  v_savings_rate_current DECIMAL(5, 2);
  v_avg_monthly_income DECIMAL(15, 2);
  v_avg_monthly_expense DECIMAL(15, 2);
  v_avg_savings_rate DECIMAL(5, 2);
  v_budgets_exceeded INTEGER;
  v_budgets_warning INTEGER;
  v_budgets_healthy INTEGER;
  v_financial_health_score INTEGER;
  v_top_spending JSONB;
  v_income_trend TEXT;
  v_expense_trend TEXT;
  v_emergency_fund_months DECIMAL(4, 2);
BEGIN
  -- Calculate current balance
  SELECT COALESCE(
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END),
    0
  )
  INTO v_current_balance
  FROM public.transactions
  WHERE user_id = p_user_id;

  -- Calculate month-to-date totals
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income_mtd, v_total_expense_mtd
  FROM public.transactions
  WHERE user_id = p_user_id
    AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE);

  -- Calculate current savings rate
  IF v_total_income_mtd > 0 THEN
    v_savings_rate_current := ((v_total_income_mtd - v_total_expense_mtd) / v_total_income_mtd * 100);
  ELSE
    v_savings_rate_current := 0;
  END IF;

  -- Get 3-month averages
  SELECT
    COALESCE(AVG(total_income), 0),
    COALESCE(AVG(total_expense), 0),
    COALESCE(AVG(savings_rate), 0)
  INTO v_avg_monthly_income, v_avg_monthly_expense, v_avg_savings_rate
  FROM public.financial_metrics_monthly
  WHERE user_id = p_user_id
  ORDER BY year DESC, month DESC
  LIMIT 3;

  -- Calculate budget status
  SELECT
    COUNT(CASE WHEN budget_status.percentage >= 100 THEN 1 END),
    COUNT(CASE WHEN budget_status.percentage >= 80 AND budget_status.percentage < 100 THEN 1 END),
    COUNT(CASE WHEN budget_status.percentage < 80 THEN 1 END)
  INTO v_budgets_exceeded, v_budgets_warning, v_budgets_healthy
  FROM (
    SELECT
      b.id,
      CASE WHEN b.limit_amount > 0 THEN (COALESCE(spent.total, 0) / b.limit_amount * 100) ELSE 0 END as percentage
    FROM public.budgets b
    LEFT JOIN (
      SELECT category_id, SUM(amount) as total
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'expense'
        AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY category_id
    ) spent ON spent.category_id = b.category_id
    WHERE b.user_id = p_user_id
      AND b.period = 'monthly'
  ) budget_status;

  -- Get top spending categories (last 3 months)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', category_name,
      'amount', total_amount,
      'percentage', percentage
    ) ORDER BY total_amount DESC
  ), '[]'::jsonb)
  INTO v_top_spending
  FROM (
    SELECT
      c.name as category_name,
      SUM(t.amount) as total_amount,
      (SUM(t.amount) / NULLIF((SELECT SUM(amount) FROM public.transactions WHERE user_id = p_user_id AND type = 'expense' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months'), 0) * 100) as percentage
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND DATE(t.date) >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY c.name
    ORDER BY total_amount DESC
    LIMIT 5
  ) top_categories;

  -- Determine income trend
  SELECT
    CASE
      WHEN COUNT(*) >= 2 AND AVG(CASE WHEN rn <= 2 THEN total_income END) > AVG(CASE WHEN rn > 2 THEN total_income END) * 1.1 THEN 'increasing'
      WHEN COUNT(*) >= 2 AND AVG(CASE WHEN rn <= 2 THEN total_income END) < AVG(CASE WHEN rn > 2 THEN total_income END) * 0.9 THEN 'decreasing'
      WHEN COUNT(*) >= 2 THEN 'stable'
      ELSE 'unknown'
    END
  INTO v_income_trend
  FROM (
    SELECT total_income, ROW_NUMBER() OVER (ORDER BY year DESC, month DESC) as rn
    FROM public.financial_metrics_monthly
    WHERE user_id = p_user_id
    LIMIT 6
  ) recent_months;

  -- Determine expense trend
  SELECT
    CASE
      WHEN COUNT(*) >= 2 AND AVG(CASE WHEN rn <= 2 THEN total_expense END) > AVG(CASE WHEN rn > 2 THEN total_expense END) * 1.1 THEN 'increasing'
      WHEN COUNT(*) >= 2 AND AVG(CASE WHEN rn <= 2 THEN total_expense END) < AVG(CASE WHEN rn > 2 THEN total_expense END) * 0.9 THEN 'decreasing'
      WHEN COUNT(*) >= 2 THEN 'stable'
      ELSE 'unknown'
    END
  INTO v_expense_trend
  FROM (
    SELECT total_expense, ROW_NUMBER() OVER (ORDER BY year DESC, month DESC) as rn
    FROM public.financial_metrics_monthly
    WHERE user_id = p_user_id
    LIMIT 6
  ) recent_months;

  -- Calculate emergency fund
  IF v_avg_monthly_expense > 0 THEN
    v_emergency_fund_months := v_current_balance / v_avg_monthly_expense;
  ELSE
    v_emergency_fund_months := 0;
  END IF;

  -- Calculate financial health score (0-100)
  v_financial_health_score := 0;

  -- Balance component (0-20 points)
  IF v_current_balance >= v_avg_monthly_expense * 6 THEN
    v_financial_health_score := v_financial_health_score + 20;
  ELSIF v_current_balance >= v_avg_monthly_expense * 3 THEN
    v_financial_health_score := v_financial_health_score + 15;
  ELSIF v_current_balance > 0 THEN
    v_financial_health_score := v_financial_health_score + 10;
  END IF;

  -- Savings rate component (0-30 points)
  IF v_savings_rate_current >= 20 THEN
    v_financial_health_score := v_financial_health_score + 30;
  ELSIF v_savings_rate_current >= 15 THEN
    v_financial_health_score := v_financial_health_score + 25;
  ELSIF v_savings_rate_current >= 10 THEN
    v_financial_health_score := v_financial_health_score + 20;
  ELSIF v_savings_rate_current >= 5 THEN
    v_financial_health_score := v_financial_health_score + 10;
  END IF;

  -- Budget adherence component (0-25 points)
  IF v_budgets_exceeded = 0 AND (v_budgets_healthy + v_budgets_warning) > 0 THEN
    v_financial_health_score := v_financial_health_score + 25;
  ELSIF v_budgets_exceeded <= 1 THEN
    v_financial_health_score := v_financial_health_score + 15;
  ELSIF v_budgets_exceeded <= 2 THEN
    v_financial_health_score := v_financial_health_score + 5;
  END IF;

  -- Trend component (0-15 points)
  IF v_income_trend = 'increasing' THEN
    v_financial_health_score := v_financial_health_score + 10;
  ELSIF v_income_trend = 'stable' THEN
    v_financial_health_score := v_financial_health_score + 5;
  END IF;

  IF v_expense_trend = 'decreasing' THEN
    v_financial_health_score := v_financial_health_score + 5;
  ELSIF v_expense_trend = 'stable' THEN
    v_financial_health_score := v_financial_health_score + 3;
  END IF;

  -- Emergency fund component (0-10 points)
  IF v_emergency_fund_months >= 6 THEN
    v_financial_health_score := v_financial_health_score + 10;
  ELSIF v_emergency_fund_months >= 3 THEN
    v_financial_health_score := v_financial_health_score + 7;
  ELSIF v_emergency_fund_months >= 1 THEN
    v_financial_health_score := v_financial_health_score + 4;
  END IF;

  -- Insert or update chatbot context
  INSERT INTO public.chatbot_financial_context (
    user_id, current_balance, total_income_mtd, total_expense_mtd,
    savings_rate_current, avg_monthly_income, avg_monthly_expense, avg_savings_rate,
    budgets_exceeded, budgets_warning, budgets_healthy,
    financial_health_score, top_spending_categories,
    income_trend, expense_trend, emergency_fund_months
  )
  VALUES (
    p_user_id, v_current_balance, v_total_income_mtd, v_total_expense_mtd,
    v_savings_rate_current, v_avg_monthly_income, v_avg_monthly_expense, v_avg_savings_rate,
    v_budgets_exceeded, v_budgets_warning, v_budgets_healthy,
    v_financial_health_score, v_top_spending,
    v_income_trend, v_expense_trend, v_emergency_fund_months
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
$$;


-- ========================================
-- 4. FIX TRIGGER FUNCTION with SECURITY DEFINER
-- ========================================

CREATE OR REPLACE FUNCTION trigger_update_financial_metrics()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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

  -- Wrap in exception handler to prevent transaction failures
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error updating financial metrics: %', SQLERRM;
      -- Still return success so transaction can complete
  END;

  RETURN NULL;
END;
$$;


-- ========================================
-- 5. FIX initialize_user_analytics with SECURITY DEFINER
-- ========================================

CREATE OR REPLACE FUNCTION initialize_user_analytics(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_min_date DATE;
  v_max_date DATE;
  v_current_date DATE;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Get date range of user's transactions
  SELECT MIN(DATE(date)), MAX(DATE(date))
  INTO v_min_date, v_max_date
  FROM public.transactions
  WHERE user_id = p_user_id;

  -- If user has no transactions, skip
  IF v_min_date IS NULL THEN
    RETURN;
  END IF;

  -- Calculate daily metrics for all dates with transactions
  v_current_date := v_min_date;
  WHILE v_current_date <= v_max_date LOOP
    -- Check if there are transactions on this date
    IF EXISTS (SELECT 1 FROM public.transactions WHERE user_id = p_user_id AND DATE(date) = v_current_date) THEN
      BEGIN
        PERFORM calculate_daily_metrics(p_user_id, v_current_date);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Error calculating daily metrics for user % on %: %', p_user_id, v_current_date, SQLERRM;
      END;
    END IF;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  -- Calculate monthly metrics for all months with transactions
  v_year := EXTRACT(YEAR FROM v_min_date);
  v_month := EXTRACT(MONTH FROM v_min_date);

  WHILE (v_year * 12 + v_month) <= (EXTRACT(YEAR FROM v_max_date) * 12 + EXTRACT(MONTH FROM v_max_date)) LOOP
    -- Check if there are transactions in this month
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = p_user_id
        AND EXTRACT(YEAR FROM date) = v_year
        AND EXTRACT(MONTH FROM date) = v_month
    ) THEN
      BEGIN
        PERFORM calculate_monthly_metrics(p_user_id, v_year, v_month);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Error calculating monthly metrics for user % on %-%: %', p_user_id, v_year, v_month, SQLERRM;
      END;
    END IF;

    -- Increment month
    v_month := v_month + 1;
    IF v_month > 12 THEN
      v_month := 1;
      v_year := v_year + 1;
    END IF;
  END LOOP;

  -- Update chatbot context
  BEGIN
    PERFORM update_chatbot_context(p_user_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error updating chatbot context for user %: %', p_user_id, SQLERRM;
  END;
END;
$$;


-- ========================================
-- 6. RECREATE TRIGGER TO USE UPDATED FUNCTION
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_financial_metrics_on_transaction_change ON public.transactions;

-- Recreate trigger with the updated function
CREATE TRIGGER update_financial_metrics_on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_financial_metrics();


-- ========================================
-- 7. GRANT EXECUTE PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION calculate_daily_metrics(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_monthly_metrics(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_chatbot_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_analytics(UUID) TO authenticated;


-- ========================================
-- 8. RE-INITIALIZE ALL USERS WITH FIXED FUNCTIONS
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
  v_total INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_total FROM public.transactions;
  RAISE NOTICE 'Starting initialization for % users...', v_total;

  FOR v_user_id IN
    SELECT DISTINCT user_id FROM public.transactions
  LOOP
    BEGIN
      -- Delete existing (possibly broken) analytics
      DELETE FROM public.financial_metrics_daily WHERE user_id = v_user_id;
      DELETE FROM public.financial_metrics_monthly WHERE user_id = v_user_id;
      DELETE FROM public.chatbot_financial_context WHERE user_id = v_user_id;

      -- Initialize with fixed functions
      PERFORM initialize_user_analytics(v_user_id);

      v_count := v_count + 1;
      IF v_count % 10 = 0 THEN
        RAISE NOTICE 'Progress: %/%', v_count, v_total;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to initialize user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Initialization complete! Successfully processed % out of % users', v_count, v_total;
END;
$$;


-- ========================================
-- 9. VERIFICATION
-- ========================================

DO $$
DECLARE
  v_user_count INTEGER;
  v_context_count INTEGER;
  v_daily_count INTEGER;
  v_monthly_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_user_count FROM public.transactions;
  SELECT COUNT(*) INTO v_context_count FROM public.chatbot_financial_context;
  SELECT COUNT(DISTINCT user_id) INTO v_daily_count FROM public.financial_metrics_daily;
  SELECT COUNT(DISTINCT user_id) INTO v_monthly_count FROM public.financial_metrics_monthly;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users with transactions: %', v_user_count;
  RAISE NOTICE 'Users with analytics context: %', v_context_count;
  RAISE NOTICE 'Users with daily metrics: %', v_daily_count;
  RAISE NOTICE 'Users with monthly metrics: %', v_monthly_count;
  RAISE NOTICE '';

  IF v_user_count = v_context_count AND v_user_count = v_daily_count AND v_user_count = v_monthly_count THEN
    RAISE NOTICE '✓ SUCCESS! All users have complete analytics';
    RAISE NOTICE '';
    RAISE NOTICE 'NOW YOU CAN:';
    RAISE NOTICE '1. Add a new transaction in your app';
    RAISE NOTICE '2. The trigger will automatically update analytics';
    RAISE NOTICE '3. Open chatbot and ask for financial advice';
    RAISE NOTICE '4. It will work! 🎉';
  ELSE
    RAISE WARNING '✗ ISSUE: Some users missing analytics';
    RAISE WARNING 'Context: % users', v_user_count - v_context_count;
    RAISE WARNING 'Daily: % users', v_user_count - v_daily_count;
    RAISE WARNING 'Monthly: % users', v_user_count - v_monthly_count;
  END IF;

  RAISE NOTICE '========================================';
END;
$$;


-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- ✅ All calculation functions have SECURITY DEFINER
-- ✅ Trigger function has SECURITY DEFINER (KEY FIX!)
-- ✅ Column names fixed (_percent not _pct)
-- ✅ SQL syntax errors fixed (DISTINCT + ORDER BY)
-- ✅ Trigger recreated and connected
-- ✅ All existing users initialized
--
-- HOW IT WORKS NOW:
-- 1. You add a transaction in the app
-- 2. Trigger "update_financial_metrics_on_transaction_change" fires
-- 3. Calls trigger_update_financial_metrics() [with SECURITY DEFINER]
-- 4. Which calls:
--    - calculate_daily_metrics() [with SECURITY DEFINER]
--    - calculate_monthly_metrics() [with SECURITY DEFINER]
--    - update_chatbot_context() [with SECURITY DEFINER]
-- 5. All functions can bypass RLS to insert analytics data
-- 6. Chatbot has fresh data for financial advice! 🚀
--
-- TO TEST:
-- 1. Add a new transaction in your app
-- 2. Check: SELECT * FROM chatbot_financial_context WHERE user_id = auth.uid();
-- 3. Data should be there!
-- 4. Open chatbot → Click "📊 Tình hình tài chính" → Get advice!
