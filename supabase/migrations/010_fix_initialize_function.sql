-- ========================================
-- FIX initialize_user_analytics FUNCTION
-- ========================================
-- The initialize_user_analytics function ALSO needs SECURITY DEFINER
-- Without it, the re-initialization in migration 009 failed

-- Add SECURITY DEFINER to initialize_user_analytics
CREATE OR REPLACE FUNCTION initialize_user_analytics(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
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

  -- Calculate daily metrics for all dates
  v_current_date := v_min_date;
  WHILE v_current_date <= v_max_date LOOP
    BEGIN
      PERFORM calculate_daily_metrics(p_user_id, v_current_date);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error calculating daily metrics for user % on %: %', p_user_id, v_current_date, SQLERRM;
    END;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  -- Calculate monthly metrics for all months
  v_year := EXTRACT(YEAR FROM v_min_date);
  v_month := EXTRACT(MONTH FROM v_min_date);

  WHILE (v_year * 12 + v_month) <= (EXTRACT(YEAR FROM v_max_date) * 12 + EXTRACT(MONTH FROM v_max_date)) LOOP
    BEGIN
      PERFORM calculate_monthly_metrics(p_user_id, v_year, v_month);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error calculating monthly metrics for user % on %-%: %', p_user_id, v_year, v_month, SQLERRM;
    END;

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

  RAISE NOTICE 'Analytics initialized for user %', p_user_id;
END;
$$ LANGUAGE plpgsql;


-- Add SECURITY DEFINER to recalculate_user_analytics
CREATE OR REPLACE FUNCTION recalculate_user_analytics(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing analytics
  DELETE FROM public.financial_metrics_daily WHERE user_id = p_user_id;
  DELETE FROM public.financial_metrics_monthly WHERE user_id = p_user_id;
  DELETE FROM public.chatbot_financial_context WHERE user_id = p_user_id;

  -- Reinitialize
  PERFORM initialize_user_analytics(p_user_id);

  RAISE NOTICE 'Analytics recalculated for user %', p_user_id;
END;
$$ LANGUAGE plpgsql;


-- Add SECURITY DEFINER to fix_user_analytics
CREATE OR REPLACE FUNCTION fix_user_analytics(p_user_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result TEXT;
BEGIN
  -- Check current status
  RAISE NOTICE 'Checking analytics status for user %', p_user_id;

  -- Recalculate everything
  PERFORM recalculate_user_analytics(p_user_id);

  -- Verify fix
  SELECT string_agg(metric || ': ' || count::TEXT, ', ')
  INTO v_result
  FROM check_user_analytics(p_user_id);

  RETURN 'Fixed! Status: ' || v_result;
END;
$$ LANGUAGE plpgsql;


-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_analytics(UUID) TO authenticated;


-- ========================================
-- NOW RE-INITIALIZE ALL USERS
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
    SELECT DISTINCT user_id
    FROM public.transactions
  LOOP
    BEGIN
      -- Delete existing (incomplete) analytics
      DELETE FROM public.financial_metrics_daily WHERE user_id = v_user_id;
      DELETE FROM public.financial_metrics_monthly WHERE user_id = v_user_id;
      DELETE FROM public.chatbot_financial_context WHERE user_id = v_user_id;

      -- Initialize with working functions
      PERFORM initialize_user_analytics(v_user_id);

      v_count := v_count + 1;
      RAISE NOTICE 'Initialized user % (%/%)', v_user_id, v_count, v_total;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to initialize user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Initialization complete! Successfully processed % out of % users', v_count, v_total;
END;
$$;


-- ========================================
-- VERIFICATION
-- ========================================

-- This will show you if it worked
DO $$
DECLARE
  v_user_count INTEGER;
  v_context_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_user_count FROM public.transactions;
  SELECT COUNT(*) INTO v_context_count FROM public.chatbot_financial_context;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE 'Users with transactions: %', v_user_count;
  RAISE NOTICE 'Users with analytics: %', v_context_count;

  IF v_user_count = v_context_count THEN
    RAISE NOTICE '✓ SUCCESS! All users have analytics';
  ELSE
    RAISE WARNING '✗ ISSUE: % users missing analytics', v_user_count - v_context_count;
  END IF;
  RAISE NOTICE '===========================================';
END;
$$;
