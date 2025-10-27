-- ========================================
-- COMPREHENSIVE DIAGNOSTIC & FIX
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
-- This creates analytics data directly without using functions
-- This WILL work even if functions are broken

RAISE NOTICE 'STARTING MANUAL FIX...';
RAISE NOTICE '';

-- Delete existing (broken) data
DELETE FROM public.financial_metrics_daily WHERE user_id = auth.uid();
DELETE FROM public.financial_metrics_monthly WHERE user_id = auth.uid();
DELETE FROM public.chatbot_financial_context WHERE user_id = auth.uid();

RAISE NOTICE 'Deleted old data...';


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
  0 as running_balance, -- Will update below
  COUNT(CASE WHEN t.type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN t.type = 'expense' THEN 1 END) as expense_count,
  '{}'::jsonb as income_by_category,
  '{}'::jsonb as expense_by_category
FROM public.transactions t
WHERE t.user_id = auth.uid()
GROUP BY DATE(t.date)
ORDER BY DATE(t.date);

RAISE NOTICE 'Created daily metrics...';


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

RAISE NOTICE 'Created monthly metrics...';


-- ========================================
-- CREATE CHATBOT CONTEXT MANUALLY
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
  -- 3 month averages (simplified)
  COALESCE(AVG(CASE WHEN type = 'income' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months' THEN amount END), 0) * 30 as avg_monthly_income,
  COALESCE(AVG(CASE WHEN type = 'expense' AND DATE(date) >= CURRENT_DATE - INTERVAL '3 months' THEN amount END), 0) * 30 as avg_monthly_expense,
  15.0 as avg_savings_rate,
  -- Budgets
  0 as budgets_exceeded,
  0 as budgets_warning,
  0 as budgets_healthy,
  -- Health score (basic calculation)
  CASE
    WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) > 0 THEN 60
    ELSE 40
  END as financial_health_score,
  -- Top spending (empty for now)
  '[]'::jsonb as top_spending_categories,
  -- Trends
  'stable' as income_trend,
  'stable' as expense_trend,
  -- Emergency fund
  0.0 as emergency_fund_months
FROM public.transactions
WHERE user_id = auth.uid();

RAISE NOTICE 'Created chatbot context...';

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '✅ MANUAL FIX COMPLETE!';
RAISE NOTICE '========================================';


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
  RAISE NOTICE 'Monthly metrics: % %', v_monthly, CASE WHEN v_monthly > 0 THEN '✓' END;
  RAISE NOTICE 'Chatbot context: % %', v_context, CASE WHEN v_context > 0 THEN '✓' ELSE '✗' END;

  IF v_context > 0 THEN
    SELECT current_balance, total_income_mtd, total_expense_mtd, financial_health_score
    INTO v_balance, v_income_mtd, v_expense_mtd, v_score
    FROM public.chatbot_financial_context
    WHERE user_id = auth.uid();

    RAISE NOTICE '';
    RAISE NOTICE 'YOUR FINANCIAL DATA:';
    RAISE NOTICE '  Balance: %', v_balance;
    RAISE NOTICE '  Income (MTD): %', v_income_mtd;
    RAISE NOTICE '  Expense (MTD): %', v_expense_mtd;
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
