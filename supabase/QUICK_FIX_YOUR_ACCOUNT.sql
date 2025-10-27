-- ========================================
-- QUICK FIX FOR YOUR SPECIFIC ACCOUNT
-- ========================================
-- Run this in Supabase SQL Editor to diagnose and fix your account
-- User ID: 80074eeb-35de-48e7-b3bc-da8e9a80e47e

-- ========================================
-- STEP 1: DIAGNOSTIC - Check what's missing
-- ========================================

-- Check if you have transactions
SELECT
  'Transactions' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING' END as status
FROM transactions
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- Check if you have daily metrics
SELECT
  'Daily Metrics' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING' END as status
FROM financial_metrics_daily
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- Check if you have monthly metrics
SELECT
  'Monthly Metrics' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING' END as status
FROM financial_metrics_monthly
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- Check if you have chatbot context
SELECT
  'Chatbot Context' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✓ OK' ELSE '✗ MISSING' END as status
FROM chatbot_financial_context
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- ========================================
-- STEP 2: CHECK IF FUNCTIONS EXIST
-- ========================================

-- Check if calculate_monthly_metrics exists
SELECT
  'calculate_monthly_metrics' as function_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM pg_proc
WHERE proname = 'calculate_monthly_metrics';

-- Check if update_chatbot_context exists
SELECT
  'update_chatbot_context' as function_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM pg_proc
WHERE proname = 'update_chatbot_context';

-- Check if initialize_user_analytics exists
SELECT
  'initialize_user_analytics' as function_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM pg_proc
WHERE proname = 'initialize_user_analytics';

-- ========================================
-- STEP 3: MANUAL FIX - Calculate metrics for current month
-- ========================================

-- Get your transaction date range
SELECT
  MIN(date) as first_transaction,
  MAX(date) as last_transaction,
  COUNT(*) as total_transactions
FROM transactions
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- ========================================
-- STEP 4: FORCE CALCULATE METRICS
-- ========================================
-- This will manually calculate metrics for current month

DO $$
DECLARE
  v_user_id UUID := '80074eeb-35de-48e7-b3bc-da8e9a80e47e';
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
  -- Try to calculate monthly metrics
  BEGIN
    PERFORM calculate_monthly_metrics(v_user_id, v_year, v_month);
    RAISE NOTICE 'Monthly metrics calculated for % - %', v_year, v_month;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to calculate monthly metrics: %', SQLERRM;
  END;

  -- Try to update chatbot context
  BEGIN
    PERFORM update_chatbot_context(v_user_id);
    RAISE NOTICE 'Chatbot context updated';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to update chatbot context: %', SQLERRM;
  END;
END $$;

-- ========================================
-- STEP 5: VERIFY FIX WORKED
-- ========================================

-- Check chatbot context was created
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ SUCCESS! Analytics created'
    ELSE '❌ FAILED! Still no analytics'
  END as result,
  COUNT(*) as context_count
FROM chatbot_financial_context
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- Show your financial data if it exists
SELECT
  current_balance,
  total_income_mtd,
  total_expense_mtd,
  savings_rate_current,
  financial_health_score
FROM chatbot_financial_context
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- ========================================
-- STEP 6: IF STILL FAILING - MANUAL CREATION
-- ========================================
-- If the above didn't work, this creates a basic context manually

INSERT INTO chatbot_financial_context (
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
  '80074eeb-35de-48e7-b3bc-da8e9a80e47e'::uuid,
  -- Current balance (total income - total expense)
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as current_balance,
  -- Month to date income
  COALESCE(SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as total_income_mtd,
  -- Month to date expense
  COALESCE(SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as total_expense_mtd,
  -- Savings rate
  CASE
    WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
    THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
           SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
          SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100)
    ELSE 0
  END as savings_rate,
  -- 3-month averages (simplified - just use current month)
  COALESCE(SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as avg_income,
  COALESCE(SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as avg_expense,
  CASE
    WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
    THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
           SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
          SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100)
    ELSE 0
  END as avg_savings_rate,
  -- Budgets (default 0 for now)
  0 as budgets_exceeded,
  0 as budgets_warning,
  0 as budgets_healthy,
  -- Basic health score (50 for now)
  50 as financial_health_score,
  -- Empty top spending
  '[]'::jsonb as top_spending_categories,
  -- Unknown trends
  'unknown' as income_trend,
  'unknown' as expense_trend,
  -- Emergency fund (0 for now)
  0 as emergency_fund_months
FROM transactions
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e'
ON CONFLICT (user_id) DO UPDATE SET
  current_balance = EXCLUDED.current_balance,
  total_income_mtd = EXCLUDED.total_income_mtd,
  total_expense_mtd = EXCLUDED.total_expense_mtd,
  savings_rate_current = EXCLUDED.savings_rate_current,
  last_updated = NOW();

-- ========================================
-- STEP 7: FINAL VERIFICATION
-- ========================================

SELECT
  '✅ FINAL CHECK' as status,
  current_balance,
  total_income_mtd,
  total_expense_mtd,
  savings_rate_current || '%' as savings_rate,
  financial_health_score || '/100' as health_score
FROM chatbot_financial_context
WHERE user_id = '80074eeb-35de-48e7-b3bc-da8e9a80e47e';

-- ========================================
-- DONE!
-- ========================================
-- If you see data in STEP 7, your account is fixed!
-- Now try adding a transaction and asking for financial advice in the app.
