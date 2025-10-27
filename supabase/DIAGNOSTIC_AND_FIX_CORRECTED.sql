-- ========================================
-- COMPREHENSIVE DIAGNOSTIC & FIX (CORRECTED)
-- ========================================
-- This script will diagnose the issue and then fix it
-- Run this entire script in Supabase SQL Editor

-- ========================================
-- PART 1: DIAGNOSTICS
-- ========================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_function_count INTEGER;
  v_trigger_count INTEGER;
  v_secdef_count INTEGER;
  v_transaction_count INTEGER;
  v_daily_count INTEGER;
  v_monthly_count INTEGER;
  v_context_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check tables exist
  RAISE NOTICE '1. CHECKING TABLES:';
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('financial_metrics_daily', 'financial_metrics_monthly', 'chatbot_financial_context', 'financial_insights');

  RAISE NOTICE '   Analytics tables exist: % / 4', v_table_count;

  IF v_table_count < 4 THEN
    RAISE WARNING '   ✗ MISSING TABLES! Migration 007 may not have run properly';
  ELSE
    RAISE NOTICE '   ✓ All analytics tables exist';
  END IF;

  RAISE NOTICE '';

  -- Check functions exist
  RAISE NOTICE '2. CHECKING FUNCTIONS:';
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN ('calculate_daily_metrics', 'calculate_monthly_metrics', 'update_chatbot_context', 'initialize_user_analytics');

  RAISE NOTICE '   Core functions exist: % / 4', v_function_count;

  IF v_function_count < 4 THEN
    RAISE WARNING '   ✗ MISSING FUNCTIONS! Migrations may not have run properly';
  ELSE
    RAISE NOTICE '   ✓ All core functions exist';
  END IF;

  RAISE NOTICE '';

  -- Check SECURITY DEFINER
  RAISE NOTICE '3. CHECKING SECURITY DEFINER:';
  SELECT COUNT(*) INTO v_secdef_count
  FROM pg_proc
  WHERE proname IN ('calculate_daily_metrics', 'calculate_monthly_metrics', 'update_chatbot_context', 'initialize_user_analytics')
    AND prosecdef = true;

  RAISE NOTICE '   Functions with SECURITY DEFINER: % / 4', v_secdef_count;

  IF v_secdef_count < 4 THEN
    RAISE WARNING '   ✗ MISSING SECURITY DEFINER! Migrations 009/010 may not have run';
  ELSE
    RAISE NOTICE '   ✓ All functions have SECURITY DEFINER';
  END IF;

  RAISE NOTICE '';

  -- Check trigger exists
  RAISE NOTICE '4. CHECKING TRIGGER:';
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname = 'update_financial_metrics_on_transaction_change';

  IF v_trigger_count = 0 THEN
    RAISE WARNING '   ✗ TRIGGER MISSING!';
  ELSE
    RAISE NOTICE '   ✓ Trigger exists';
  END IF;

  RAISE NOTICE '';

  -- Check data counts
  RAISE NOTICE '5. CHECKING DATA FOR CURRENT USER:';

  SELECT COUNT(*) INTO v_transaction_count
  FROM public.transactions
  WHERE user_id = auth.uid();
  RAISE NOTICE '   Transactions: %', v_transaction_count;

  SELECT COUNT(*) INTO v_daily_count
  FROM public.financial_metrics_daily
  WHERE user_id = auth.uid();
  RAISE NOTICE '   Daily metrics: %', v_daily_count;

  SELECT COUNT(*) INTO v_monthly_count
  FROM public.financial_metrics_monthly
  WHERE user_id = auth.uid();
  RAISE NOTICE '   Monthly metrics: %', v_monthly_count;

  SELECT COUNT(*) INTO v_context_count
  FROM public.chatbot_financial_context
  WHERE user_id = auth.uid();
  RAISE NOTICE '   Chatbot context: %', v_context_count;

  RAISE NOTICE '';

  -- Summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS:';
  RAISE NOTICE '========================================';

  IF v_table_count < 4 THEN
    RAISE NOTICE '❌ Run migration 007 first';
  ELSIF v_function_count < 4 THEN
    RAISE NOTICE '❌ Functions missing - migrations not complete';
  ELSIF v_secdef_count < 4 THEN
    RAISE NOTICE '❌ SECURITY DEFINER missing - run migrations 009 & 010';
  ELSIF v_trigger_count = 0 THEN
    RAISE NOTICE '❌ Trigger missing - run migration 007';
  ELSIF v_transaction_count = 0 THEN
    RAISE NOTICE '⚠️  No transactions found - add some transactions first';
  ELSIF v_context_count = 0 THEN
    RAISE NOTICE '❌ Analytics not calculated - will fix below';
  ELSE
    RAISE NOTICE '✓ Everything looks good!';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;


-- ========================================
-- PART 2: MANUAL FIX (BYPASSES ALL FUNCTIONS)
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'STARTING MANUAL FIX...';
  RAISE NOTICE '';
END $$;

-- Delete existing (broken) data
DELETE FROM public.financial_metrics_daily WHERE user_id = auth.uid();
DELETE FROM public.financial_metrics_monthly WHERE user_id = auth.uid();
DELETE FROM public.chatbot_financial_context WHERE user_id = auth.uid();


-- ========================================
-- CREATE DAILY METRICS MANUALLY
-- ========================================

INSERT INTO public.financial_metrics_daily (
  user_id, metric_date,
  total_income, total_expense, net_savings,
  running_balance,
  income_transaction_count, expense_transaction_count,
  income_by_category, expense_by_category
)
SELECT
  auth.uid(),
  DATE(t.date) as metric_date,
  -- Totals for this date
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
  -- Running balance (calculated in subquery)
  (
    SELECT COALESCE(SUM(CASE WHEN t2.type = 'income' THEN t2.amount ELSE -t2.amount END), 0)
    FROM public.transactions t2
    WHERE t2.user_id = auth.uid()
      AND DATE(t2.date) <= DATE(t.date)
  ) as running_balance,
  COUNT(CASE WHEN t.type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN t.type = 'expense' THEN 1 END) as expense_count,
  '{}'::jsonb as income_by_category,
  '{}'::jsonb as expense_by_category
FROM public.transactions t
WHERE t.user_id = auth.uid()
GROUP BY DATE(t.date)
ORDER BY DATE(t.date);


-- ========================================
-- CREATE MONTHLY METRICS MANUALLY
-- ========================================

INSERT INTO public.financial_metrics_monthly (
  user_id, year, month,
  total_income, total_expense, net_savings,
  savings_rate,
  income_transaction_count, expense_transaction_count,
  income_by_category, expense_by_category,
  month_start_balance, month_end_balance,
  budget_adherence_rate,
  budgets_on_track, budgets_over_limit, total_budgets,
  income_change_pct, expense_change_pct, savings_change_pct
)
SELECT
  auth.uid(),
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  EXTRACT(MONTH FROM t.date)::INTEGER as month,
  -- Totals
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
  -- Savings rate
  CASE
    WHEN SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) > 0
    THEN ((SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) -
           SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)) /
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) * 100)
    ELSE 0
  END as savings_rate,
  COUNT(CASE WHEN t.type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN t.type = 'expense' THEN 1 END) as expense_count,
  '{}'::jsonb as income_by_category,
  '{}'::jsonb as expense_by_category,
  0 as month_start_balance,
  0 as month_end_balance,
  100 as budget_adherence_rate,
  0 as budgets_on_track,
  0 as budgets_over_limit,
  0 as total_budgets,
  0 as income_change_pct,
  0 as expense_change_pct,
  0 as savings_change_pct
FROM public.transactions t
WHERE t.user_id = auth.uid()
GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year, month;


-- ========================================
-- CREATE CHATBOT CONTEXT MANUALLY (WITH MORE METRICS)
-- ========================================

INSERT INTO public.chatbot_financial_context (
  user_id,
  current_balance,
  total_income_mtd,
  total_expense_mtd,
  savings_rate_current,
  avg_monthly_income,
  avg_monthly_expense,
  avg_savings_rate,
  budgets_exceeded,
  budgets_warning,
  budgets_healthy,
  financial_health_score,
  top_spending_categories,
  income_trend,
  expense_trend,
  emergency_fund_months
)
SELECT
  auth.uid(),
  -- Current balance (all time)
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as current_balance,
  -- Month to date
  COALESCE(SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as total_income_mtd,
  COALESCE(SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as total_expense_mtd,
  -- Savings rate current
  CASE
    WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
    THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
           SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
          SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100)
    ELSE 0
  END as savings_rate_current,
  -- 3 month averages
  COALESCE(
    (SELECT AVG(monthly_income) FROM (
      SELECT
        EXTRACT(YEAR FROM date)::INTEGER as year,
        EXTRACT(MONTH FROM date)::INTEGER as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as monthly_income
      FROM transactions
      WHERE user_id = auth.uid()
        AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT 3
    ) recent), 0
  ) as avg_monthly_income,
  COALESCE(
    (SELECT AVG(monthly_expense) FROM (
      SELECT
        EXTRACT(YEAR FROM date)::INTEGER as year,
        EXTRACT(MONTH FROM date)::INTEGER as month,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as monthly_expense
      FROM transactions
      WHERE user_id = auth.uid()
        AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY year, month
      ORDER BY year DESC, month DESC
      LIMIT 3
    ) recent), 0
  ) as avg_monthly_expense,
  CASE
    WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months' THEN amount ELSE 0 END) > 0
    THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months' THEN amount ELSE 0 END) -
           SUM(CASE WHEN type = 'expense' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months' THEN amount ELSE 0 END)) /
          SUM(CASE WHEN type = 'income' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months' THEN amount ELSE 0 END) * 100)
    ELSE 0
  END as avg_savings_rate,
  -- Budgets (will calculate properly later)
  0 as budgets_exceeded,
  0 as budgets_warning,
  0 as budgets_healthy,
  -- Health score (basic calculation)
  GREATEST(0, LEAST(100,
    50 + -- Base score
    CASE WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) > 0 THEN 10 ELSE -10 END + -- Has positive balance
    CASE
      WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
        AND ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
              SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
             SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100) >= 20
      THEN 30
      WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
        AND ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
              SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
             SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100) >= 10
      THEN 20
      ELSE 5
    END
  )) as financial_health_score,
  -- Top spending (will be calculated with categories)
  '[]'::jsonb as top_spending_categories,
  -- Trends (will calculate based on monthly data)
  'stable' as income_trend,
  'stable' as expense_trend,
  -- Emergency fund
  CASE
    WHEN (SELECT AVG(monthly_expense) FROM (
      SELECT SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as monthly_expense
      FROM transactions
      WHERE user_id = auth.uid() AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
    ) recent) > 0
    THEN COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) /
         (SELECT AVG(monthly_expense) FROM (
           SELECT SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as monthly_expense
           FROM transactions
           WHERE user_id = auth.uid() AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months'
           GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
         ) recent)
    ELSE 0
  END as emergency_fund_months
FROM public.transactions
WHERE user_id = auth.uid();


-- ========================================
-- UPDATE WITH TOP SPENDING CATEGORIES
-- ========================================

UPDATE public.chatbot_financial_context
SET top_spending_categories = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', category_name,
      'amount', total_amount,
      'percentage', percentage
    ) ORDER BY total_amount DESC
  ), '[]'::jsonb)
  FROM (
    SELECT
      c.name as category_name,
      SUM(t.amount) as total_amount,
      CASE
        WHEN (SELECT SUM(amount) FROM transactions WHERE user_id = auth.uid() AND type = 'expense' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months') > 0
        THEN (SUM(t.amount) / (SELECT SUM(amount) FROM transactions WHERE user_id = auth.uid() AND type = 'expense' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months')) * 100
        ELSE 0
      END as percentage
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = auth.uid()
      AND t.type = 'expense'
      AND DATE(t.date) >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY c.name
    ORDER BY total_amount DESC
    LIMIT 5
  ) top_categories
)
WHERE user_id = auth.uid();


-- ========================================
-- PART 3: VERIFICATION
-- ========================================

DO $$
DECLARE
  v_transactions INTEGER;
  v_daily INTEGER;
  v_monthly INTEGER;
  v_context INTEGER;
  v_balance DECIMAL(15,2);
  v_income_mtd DECIMAL(15,2);
  v_expense_mtd DECIMAL(15,2);
  v_score INTEGER;
  v_avg_income DECIMAL(15,2);
  v_avg_expense DECIMAL(15,2);
  v_emergency_fund DECIMAL(4,2);
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_transactions FROM public.transactions WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_daily FROM public.financial_metrics_daily WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_monthly FROM public.financial_metrics_monthly WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_context FROM public.chatbot_financial_context WHERE user_id = auth.uid();

  RAISE NOTICE 'Transactions: % %', v_transactions, CASE WHEN v_transactions > 0 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Daily metrics: % %', v_daily, CASE WHEN v_daily > 0 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Monthly metrics: % %', v_monthly, CASE WHEN v_monthly > 0 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Chatbot context: % %', v_context, CASE WHEN v_context > 0 THEN '✓' ELSE '✗' END;

  IF v_context > 0 THEN
    SELECT
      current_balance,
      total_income_mtd,
      total_expense_mtd,
      financial_health_score,
      avg_monthly_income,
      avg_monthly_expense,
      emergency_fund_months
    INTO
      v_balance,
      v_income_mtd,
      v_expense_mtd,
      v_score,
      v_avg_income,
      v_avg_expense,
      v_emergency_fund
    FROM public.chatbot_financial_context
    WHERE user_id = auth.uid();

    RAISE NOTICE '';
    RAISE NOTICE 'YOUR FINANCIAL DATA:';
    RAISE NOTICE '  Current Balance: %', v_balance;
    RAISE NOTICE '  Income (Month-to-Date): %', v_income_mtd;
    RAISE NOTICE '  Expense (Month-to-Date): %', v_expense_mtd;
    RAISE NOTICE '  Avg Monthly Income (3mo): %', v_avg_income;
    RAISE NOTICE '  Avg Monthly Expense (3mo): %', v_avg_expense;
    RAISE NOTICE '  Emergency Fund: % months', v_emergency_fund;
    RAISE NOTICE '  Health Score: %/100', v_score;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';

  IF v_context > 0 THEN
    RAISE NOTICE '✅ SUCCESS! Analytics data created!';
    RAISE NOTICE '';
    RAISE NOTICE 'NOW TEST IN YOUR APP:';
    RAISE NOTICE '1. Restart app: npm start';
    RAISE NOTICE '2. Open chatbot';
    RAISE NOTICE '3. Click 💡 button';
    RAISE NOTICE '4. Click "📊 Tình hình tài chính"';
    RAISE NOTICE '5. You should get financial analysis!';
  ELSE
    RAISE NOTICE '❌ Still no data. Check if you have transactions.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
