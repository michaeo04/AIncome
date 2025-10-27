-- ========================================
-- FIX FOR EXISTING USERS - ANALYTICS INITIALIZATION
-- ========================================
-- This migration fixes issues with old accounts that existed before
-- the analytics system was added. It initializes analytics data for
-- existing users and adds better error handling.

-- ========================================
-- 1. SAFER TRIGGER FUNCTION WITH ERROR HANDLING
-- ========================================

-- Replace the trigger function with a safer version that won't fail transactions
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
$$ LANGUAGE plpgsql;


-- ========================================
-- 2. INITIALIZE ANALYTICS FOR EXISTING USERS
-- ========================================

-- Function to initialize analytics for a specific user
CREATE OR REPLACE FUNCTION initialize_user_analytics(p_user_id UUID)
RETURNS void AS $$
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


-- ========================================
-- 3. BATCH INITIALIZE ALL EXISTING USERS
-- ========================================

-- Initialize analytics for all users who have transactions but no analytics
DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_user_id IN
    SELECT DISTINCT t.user_id
    FROM public.transactions t
    LEFT JOIN public.chatbot_financial_context c ON c.user_id = t.user_id
    WHERE c.user_id IS NULL
  LOOP
    BEGIN
      RAISE NOTICE 'Initializing analytics for user %', v_user_id;
      PERFORM initialize_user_analytics(v_user_id);
      v_count := v_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to initialize user %: %', v_user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Initialized analytics for % existing users', v_count;
END;
$$;


-- ========================================
-- 4. ADD HELPFUL UTILITY FUNCTIONS
-- ========================================

-- Function to recalculate all analytics for a user (useful for debugging)
CREATE OR REPLACE FUNCTION recalculate_user_analytics(p_user_id UUID)
RETURNS void AS $$
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


-- Function to check analytics status for a user
CREATE OR REPLACE FUNCTION check_user_analytics(p_user_id UUID)
RETURNS TABLE(
  metric TEXT,
  count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Transactions'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '✗' END::TEXT
  FROM public.transactions WHERE user_id = p_user_id
  UNION ALL
  SELECT
    'Daily Metrics'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '✗' END::TEXT
  FROM public.financial_metrics_daily WHERE user_id = p_user_id
  UNION ALL
  SELECT
    'Monthly Metrics'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '✗' END::TEXT
  FROM public.financial_metrics_monthly WHERE user_id = p_user_id
  UNION ALL
  SELECT
    'Chatbot Context'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '✗' END::TEXT
  FROM public.chatbot_financial_context WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- 5. CREATE FUNCTION TO FIX SPECIFIC USER
-- ========================================

-- If a specific user is having issues, run this function
-- Usage: SELECT fix_user_analytics('user-id-here');
CREATE OR REPLACE FUNCTION fix_user_analytics(p_user_id UUID)
RETURNS TEXT AS $$
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


-- ========================================
-- 6. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION initialize_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_analytics(UUID) TO authenticated;


-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- This migration:
-- 1. ✅ Added error handling to prevent transaction failures
-- 2. ✅ Initialized analytics for all existing users
-- 3. ✅ Added utility functions for debugging
-- 4. ✅ Created fix function for specific users
--
-- If you still have issues with a specific account, run in SQL editor:
-- SELECT fix_user_analytics('your-user-id-here');
--
-- To check if analytics are working for a user:
-- SELECT * FROM check_user_analytics('your-user-id-here');
