-- ========================================
-- FIX FUNCTION SECURITY SETTINGS
-- ========================================
-- The calculation functions need SECURITY DEFINER to bypass RLS
-- when inserting/updating analytics tables
--
-- This is the ROOT CAUSE of the issue: functions were failing
-- silently because they couldn't insert data into RLS-protected tables

-- ========================================
-- 1. ADD SECURITY DEFINER TO calculate_daily_metrics
-- ========================================

CREATE OR REPLACE FUNCTION calculate_daily_metrics(
  p_user_id UUID,
  p_date DATE
)
RETURNS void
SECURITY DEFINER
SET search_path = public
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
$$ LANGUAGE plpgsql;


-- ========================================
-- 2. ADD SECURITY DEFINER TO calculate_monthly_metrics
-- ========================================

CREATE OR REPLACE FUNCTION calculate_monthly_metrics(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS void
SECURITY DEFINER
SET search_path = public
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
    COUNT(CASE WHEN budget_spent.spent <= b.amount THEN 1 END),
    COUNT(CASE WHEN budget_spent.spent > b.amount THEN 1 END)
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
    AND (year = p_year AND month = p_month - 1)
       OR (year = p_year - 1 AND month = 12 AND p_month = 1)
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

  -- Insert or update monthly metrics
  INSERT INTO public.financial_metrics_monthly (
    user_id, year, month,
    total_income, total_expense, net_savings, savings_rate,
    income_transaction_count, expense_transaction_count,
    income_by_category, expense_by_category,
    month_start_balance, month_end_balance,
    top_expense_category, top_expense_amount,
    top_income_category, top_income_amount,
    budget_adherence_rate, budgets_on_track, budgets_over_limit, total_budgets,
    income_change_pct, expense_change_pct, savings_change_pct
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
    income_change_pct = EXCLUDED.income_change_pct,
    expense_change_pct = EXCLUDED.expense_change_pct,
    savings_change_pct = EXCLUDED.savings_change_pct,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- 3. ADD SECURITY DEFINER TO update_chatbot_context
-- ========================================

CREATE OR REPLACE FUNCTION update_chatbot_context(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
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
  v_current_month_year TEXT;
BEGIN
  v_current_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

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
      CASE WHEN b.amount > 0 THEN (spent.total / b.amount * 100) ELSE 0 END as percentage
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
    )
  ), '[]'::jsonb)
  INTO v_top_spending
  FROM (
    SELECT
      c.name as category_name,
      SUM(t.amount) as total_amount,
      (SUM(t.amount) / NULLIF(total_expenses.total, 0) * 100) as percentage
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    CROSS JOIN (
      SELECT SUM(amount) as total
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'expense'
        AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months'
    ) total_expenses
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND DATE(t.date) >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY c.name, total_expenses.total
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
$$ LANGUAGE plpgsql;


-- ========================================
-- 4. GRANT EXECUTE PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION calculate_daily_metrics(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_monthly_metrics(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_chatbot_context(UUID) TO authenticated;


-- ========================================
-- 5. RE-RUN INITIALIZATION FOR ALL USERS
-- ========================================

-- Now that functions have SECURITY DEFINER, re-initialize all users
DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Re-initializing analytics with fixed functions...';

  FOR v_user_id IN
    SELECT DISTINCT user_id
    FROM public.transactions
  LOOP
    BEGIN
      -- Delete existing analytics (to recalculate with working functions)
      DELETE FROM public.financial_metrics_daily WHERE user_id = v_user_id;
      DELETE FROM public.financial_metrics_monthly WHERE user_id = v_user_id;
      DELETE FROM public.chatbot_financial_context WHERE user_id = v_user_id;

      -- Re-initialize
      PERFORM initialize_user_analytics(v_user_id);
      v_count := v_count + 1;

      RAISE NOTICE 'Re-initialized user % (%/%)', v_user_id, v_count, (SELECT COUNT(DISTINCT user_id) FROM public.transactions);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to re-initialize user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Re-initialization complete! % users processed', v_count;
END;
$$;


-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- This migration fixes the ROOT CAUSE:
-- ✅ Added SECURITY DEFINER to all calculation functions
-- ✅ Functions can now bypass RLS to insert/update analytics tables
-- ✅ Re-initialized all users with working functions
--
-- The issue was that functions couldn't insert data because of RLS policies.
-- Now they have SECURITY DEFINER and can insert data properly.
