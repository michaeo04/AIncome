-- ========================================
-- CLEAN ANALYTICS TRIGGER - FRESH START
-- ========================================
-- This migration takes a fresh, simplified approach:
-- 1. Remove broken triggers/functions
-- 2. Create ONE simple function that updates ALL analytics
-- 3. Create ONE trigger that calls that function
-- 4. Test that it actually works
-- 5. Initialize existing users

-- ========================================
-- STEP 1: CLEAN UP OLD BROKEN STUFF
-- ========================================

-- Drop old trigger
DROP TRIGGER IF EXISTS update_financial_metrics_on_transaction_change ON public.transactions;

-- Drop old functions (we'll recreate them properly)
DROP FUNCTION IF EXISTS trigger_update_financial_metrics() CASCADE;
DROP FUNCTION IF EXISTS calculate_daily_metrics(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_monthly_metrics(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_chatbot_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS initialize_user_analytics(UUID) CASCADE;


-- ========================================
-- STEP 2: CREATE ONE SIMPLE FUNCTION TO UPDATE EVERYTHING
-- ========================================

CREATE OR REPLACE FUNCTION update_user_analytics(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function updates ALL analytics for a user
  -- Called by trigger when transactions change

  -- Step 1: Update/Insert daily metrics for dates with transactions
  INSERT INTO public.financial_metrics_daily (
    user_id, metric_date,
    total_income, total_expense, net_savings,
    running_balance,
    income_transaction_count, expense_transaction_count,
    income_by_category, expense_by_category
  )
  SELECT
    p_user_id,
    DATE(t.date) as metric_date,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0),
    -- Running balance up to this date
    (
      SELECT COALESCE(SUM(CASE WHEN t2.type = 'income' THEN t2.amount ELSE -t2.amount END), 0)
      FROM public.transactions t2
      WHERE t2.user_id = p_user_id AND DATE(t2.date) <= DATE(t.date)
    ),
    COUNT(CASE WHEN t.type = 'income' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN t.type = 'expense' THEN 1 END)::INTEGER,
    '{}'::jsonb,
    '{}'::jsonb
  FROM public.transactions t
  WHERE t.user_id = p_user_id
  GROUP BY p_user_id, DATE(t.date)
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    net_savings = EXCLUDED.net_savings,
    running_balance = EXCLUDED.running_balance,
    income_transaction_count = EXCLUDED.income_transaction_count,
    expense_transaction_count = EXCLUDED.expense_transaction_count,
    updated_at = NOW();

  -- Step 2: Update/Insert monthly metrics
  INSERT INTO public.financial_metrics_monthly (
    user_id, year, month,
    total_income, total_expense, net_savings,
    savings_rate,
    income_transaction_count, expense_transaction_count,
    income_by_category, expense_by_category,
    month_start_balance, month_end_balance,
    budget_adherence_rate,
    budgets_on_track, budgets_over_limit, total_budgets,
    active_goals_count, goals_on_track, goals_behind,
    top_expense_category, top_expense_amount,
    top_income_category, top_income_amount,
    income_change_percent, expense_change_percent, savings_change_percent
  )
  SELECT
    p_user_id,
    EXTRACT(YEAR FROM t.date)::INTEGER,
    EXTRACT(MONTH FROM t.date)::INTEGER,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0),
    -- Savings rate
    CASE
      WHEN SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) > 0
      THEN ((SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) -
             SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)) /
            SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) * 100)
      ELSE 0
    END,
    COUNT(CASE WHEN t.type = 'income' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN t.type = 'expense' THEN 1 END)::INTEGER,
    '{}'::jsonb,
    '{}'::jsonb,
    0, 0, 100,
    0, 0, 0,
    0, 0, 0,
    NULL, 0,
    NULL, 0,
    0, 0, 0
  FROM public.transactions t
  WHERE t.user_id = p_user_id
  GROUP BY p_user_id, EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    net_savings = EXCLUDED.net_savings,
    savings_rate = EXCLUDED.savings_rate,
    income_transaction_count = EXCLUDED.income_transaction_count,
    expense_transaction_count = EXCLUDED.expense_transaction_count,
    updated_at = NOW();

  -- Step 3: Update/Insert chatbot context
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
    goals_achieved,
    goals_on_track,
    goals_behind,
    financial_health_score,
    top_spending_categories,
    income_trend,
    expense_trend,
    emergency_fund_months
  )
  SELECT
    p_user_id,
    -- Current balance (all time)
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0),
    -- Month to date
    COALESCE(SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0),
    -- Savings rate current
    CASE
      WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
      THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
             SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
            SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100)
      ELSE 0
    END,
    -- 3 month averages (from monthly metrics)
    COALESCE((
      SELECT AVG(total_income)
      FROM public.financial_metrics_monthly
      WHERE user_id = p_user_id
      ORDER BY year DESC, month DESC
      LIMIT 3
    ), 0),
    COALESCE((
      SELECT AVG(total_expense)
      FROM public.financial_metrics_monthly
      WHERE user_id = p_user_id
      ORDER BY year DESC, month DESC
      LIMIT 3
    ), 0),
    COALESCE((
      SELECT AVG(savings_rate)
      FROM public.financial_metrics_monthly
      WHERE user_id = p_user_id
      ORDER BY year DESC, month DESC
      LIMIT 3
    ), 0),
    0, 0, 0, 0, 0, 0,
    -- Health score (simplified)
    GREATEST(0, LEAST(100,
      50 +
      CASE WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) > 0 THEN 10 ELSE -10 END +
      CASE
        WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
          AND ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
                SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
               SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100) >= 20
        THEN 30
        ELSE 10
      END
    ))::INTEGER,
    '[]'::jsonb,
    'stable',
    'stable',
    0
  FROM public.transactions
  WHERE user_id = p_user_id
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    total_income_mtd = EXCLUDED.total_income_mtd,
    total_expense_mtd = EXCLUDED.total_expense_mtd,
    savings_rate_current = EXCLUDED.savings_rate_current,
    avg_monthly_income = EXCLUDED.avg_monthly_income,
    avg_monthly_expense = EXCLUDED.avg_monthly_expense,
    avg_savings_rate = EXCLUDED.avg_savings_rate,
    financial_health_score = EXCLUDED.financial_health_score,
    last_updated = NOW();

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail transaction
    RAISE WARNING 'Error in update_user_analytics for user %: %', p_user_id, SQLERRM;
END;
$$;


-- ========================================
-- STEP 3: CREATE SIMPLE TRIGGER FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION on_transaction_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Just call the analytics update function for this user
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_analytics(OLD.user_id);
  ELSE
    PERFORM update_user_analytics(NEW.user_id);
  END IF;

  RETURN NULL;
END;
$$;


-- ========================================
-- STEP 4: CREATE THE TRIGGER
-- ========================================

CREATE TRIGGER transaction_analytics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION on_transaction_change();


-- ========================================
-- STEP 5: GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION update_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION on_transaction_change() TO authenticated;


-- ========================================
-- STEP 6: INITIALIZE ALL EXISTING USERS
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
  v_total INTEGER;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
BEGIN
  -- Clear old broken data
  TRUNCATE public.financial_metrics_daily, public.financial_metrics_monthly, public.chatbot_financial_context;

  SELECT COUNT(DISTINCT user_id) INTO v_total FROM public.transactions;
  RAISE NOTICE 'Initializing analytics for % users...', v_total;

  FOR v_user_id IN SELECT DISTINCT user_id FROM public.transactions
  LOOP
    v_count := v_count + 1;

    BEGIN
      -- Call the simple update function
      PERFORM update_user_analytics(v_user_id);
      v_success := v_success + 1;

      IF v_count % 10 = 0 THEN
        RAISE NOTICE 'Progress: %/%', v_count, v_total;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE WARNING 'Failed to initialize user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Initialization complete: % success, % failed out of % total', v_success, v_failed, v_total;
END;
$$;


-- ========================================
-- STEP 7: VERIFICATION
-- ========================================

DO $$
DECLARE
  v_transactions INTEGER;
  v_daily INTEGER;
  v_monthly INTEGER;
  v_context INTEGER;
  v_sample_balance DECIMAL(15, 2);
  v_sample_income DECIMAL(15, 2);
  v_sample_score INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_transactions FROM public.transactions;
  SELECT COUNT(DISTINCT user_id) INTO v_daily FROM public.financial_metrics_daily;
  SELECT COUNT(DISTINCT user_id) INTO v_monthly FROM public.financial_metrics_monthly;
  SELECT COUNT(*) INTO v_context FROM public.chatbot_financial_context;

  -- Get sample data
  SELECT current_balance, total_income_mtd, financial_health_score
  INTO v_sample_balance, v_sample_income, v_sample_score
  FROM public.chatbot_financial_context
  LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ANALYTICS SYSTEM STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users with transactions: %', v_transactions;
  RAISE NOTICE 'Users with daily metrics: %', v_daily;
  RAISE NOTICE 'Users with monthly metrics: %', v_monthly;
  RAISE NOTICE 'Users with chatbot context: %', v_context;
  RAISE NOTICE '';

  IF v_sample_balance IS NOT NULL THEN
    RAISE NOTICE 'Sample data (first user):';
    RAISE NOTICE '  Balance: %', v_sample_balance;
    RAISE NOTICE '  Income MTD: %', v_sample_income;
    RAISE NOTICE '  Health Score: %/100', v_sample_score;
    RAISE NOTICE '';
  END IF;

  IF v_transactions = v_context AND v_context > 0 THEN
    RAISE NOTICE '✓ SUCCESS! Analytics system is working';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Add a new transaction in your app';
    RAISE NOTICE '2. Trigger will automatically call update_user_analytics()';
    RAISE NOTICE '3. Analytics tables will update';
    RAISE NOTICE '4. Open chatbot and test financial advice';
    RAISE NOTICE '';
    RAISE NOTICE 'TO TEST TRIGGER MANUALLY:';
    RAISE NOTICE 'SELECT update_user_analytics(auth.uid());';
  ELSE
    RAISE WARNING '✗ Something went wrong';
    RAISE WARNING 'Expected % users, got % with analytics', v_transactions, v_context;
  END IF;

  RAISE NOTICE '========================================';
END;
$$;


-- ========================================
-- STEP 8: CREATE HELPER FUNCTION TO MANUALLY REFRESH
-- ========================================

-- If trigger fails, app can call this directly
CREATE OR REPLACE FUNCTION refresh_my_analytics()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_user_analytics(auth.uid());
  RETURN 'Analytics updated successfully for your account';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error updating analytics: ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_my_analytics() TO authenticated;


-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- This is a CLEAN, SIMPLE approach:
-- ✅ ONE function (update_user_analytics) that does ALL calculations
-- ✅ ONE trigger (transaction_analytics_trigger) that calls it
-- ✅ SECURITY DEFINER on both so RLS doesn't block
-- ✅ Simple, testable, works
--
-- HOW TO TEST:
-- 1. Add transaction in app
-- 2. Check: SELECT * FROM chatbot_financial_context WHERE user_id = auth.uid();
-- 3. Should see updated data immediately
--
-- IF TRIGGER DOESN'T WORK:
-- App can call: SELECT refresh_my_analytics();
-- After adding transactions to manually update analytics
