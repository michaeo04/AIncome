-- ========================================
-- SIMPLE FIX - NO COMPLEX FUNCTIONS
-- ========================================
-- This creates analytics data directly from your transactions
-- Matching the ACTUAL column names in the tables

-- ========================================
-- STEP 1: CLEAN OLD DATA
-- ========================================

DELETE FROM public.financial_metrics_daily WHERE user_id = auth.uid();
DELETE FROM public.financial_metrics_monthly WHERE user_id = auth.uid();
DELETE FROM public.chatbot_financial_context WHERE user_id = auth.uid();


-- ========================================
-- STEP 2: CREATE DAILY METRICS
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
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
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
-- STEP 3: CREATE MONTHLY METRICS
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
  active_goals_count, goals_on_track, goals_behind,
  top_expense_category, top_expense_amount,
  top_income_category, top_income_amount,
  income_change_percent, expense_change_percent, savings_change_percent
)
SELECT
  auth.uid(),
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  EXTRACT(MONTH FROM t.date)::INTEGER as month,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_savings,
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
  0 as active_goals_count,
  0 as goals_on_track,
  0 as goals_behind,
  NULL as top_expense_category,
  0 as top_expense_amount,
  NULL as top_income_category,
  0 as top_income_amount,
  0 as income_change_percent,
  0 as expense_change_percent,
  0 as savings_change_percent
FROM public.transactions t
WHERE t.user_id = auth.uid()
GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year, month;


-- ========================================
-- STEP 4: CREATE CHATBOT CONTEXT
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
  0 as budgets_exceeded,
  0 as budgets_warning,
  0 as budgets_healthy,
  0 as goals_achieved,
  0 as goals_on_track,
  0 as goals_behind,
  -- Health score calculation
  GREATEST(0, LEAST(100,
    50 +
    CASE WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) > 0 THEN 10 ELSE -10 END +
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
  '[]'::jsonb as top_spending_categories,
  'stable' as income_trend,
  'stable' as expense_trend,
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
-- STEP 5: UPDATE TOP SPENDING CATEGORIES
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
-- STEP 6: VERIFICATION
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
  SELECT COUNT(*) INTO v_transactions FROM public.transactions WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_daily FROM public.financial_metrics_daily WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_monthly FROM public.financial_metrics_monthly WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_context FROM public.chatbot_financial_context WHERE user_id = auth.uid();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Transactions: % %', v_transactions, CASE WHEN v_transactions > 0 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Daily metrics: % %', v_daily, CASE WHEN v_daily > 0 THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Monthly metrics: % %', v_monthly, CASE WHEN v_monthly > 0 THEN '✓' ELSE '✗' END;
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
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS! Analytics created!';
    RAISE NOTICE '';
    RAISE NOTICE 'NOW TEST IN APP:';
    RAISE NOTICE '1. Restart: npm start';
    RAISE NOTICE '2. Open chatbot';
    RAISE NOTICE '3. Click 💡 button';
    RAISE NOTICE '4. Click "📊 Tình hình tài chính"';
    RAISE NOTICE '5. Get financial analysis!';
  ELSE
    RAISE NOTICE '❌ No data created. Check if you have transactions.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
