-- ========================================
-- GOAL ALLOCATIONS SYSTEM
-- ========================================
-- This migration adds a goal allocation system where users can transfer money
-- from their net balance to specific saving goals. The allocated money is tracked
-- separately and doesn't affect the displayed net balance.
--
-- Concept:
-- - Net Balance (Real) = Total Income - Total Expense
-- - Allocated Balance = Sum of all goal allocations
-- - Available Balance (Displayed) = Net Balance - Allocated Balance
-- - Users can only allocate if: Allocated Balance + New Allocation <= Net Balance

-- ========================================
-- 1. ADD ALLOCATED AMOUNT TO SAVING_GOALS
-- ========================================

-- Add allocated_amount column to track money allocated to each goal
ALTER TABLE public.saving_goals
ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL CHECK (allocated_amount >= 0);

COMMENT ON COLUMN public.saving_goals.allocated_amount IS 'Amount of money user has allocated to this goal from their net balance';

-- ========================================
-- 2. CREATE GOAL_ALLOCATIONS TABLE
-- ========================================
-- Tracks individual allocation transactions (deposits/withdrawals) for each goal

CREATE TABLE IF NOT EXISTS public.goal_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.saving_goals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount != 0), -- Positive = deposit, Negative = withdrawal
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT positive_deposit CHECK (
    (type = 'deposit' AND amount > 0) OR (type = 'withdrawal' AND amount < 0)
  )
);

COMMENT ON TABLE public.goal_allocations IS 'Tracks money transfers between net balance and saving goals';
COMMENT ON COLUMN public.goal_allocations.amount IS 'Positive for deposits to goal, negative for withdrawals from goal';
COMMENT ON COLUMN public.goal_allocations.type IS 'deposit = transfer to goal, withdrawal = transfer from goal';

-- Indexes
CREATE INDEX IF NOT EXISTS goal_allocations_user_id_idx ON public.goal_allocations(user_id);
CREATE INDEX IF NOT EXISTS goal_allocations_goal_id_idx ON public.goal_allocations(goal_id);
CREATE INDEX IF NOT EXISTS goal_allocations_created_at_idx ON public.goal_allocations(created_at DESC);

-- RLS Policies
ALTER TABLE public.goal_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own allocations"
  ON public.goal_allocations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own allocations"
  ON public.goal_allocations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocations"
  ON public.goal_allocations FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 3. CREATE FUNCTIONS FOR ALLOCATION SYSTEM
-- ========================================

-- Function: Get user's net balance
CREATE OR REPLACE FUNCTION public.get_user_net_balance(p_user_id UUID)
RETURNS DECIMAL(15, 2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
     FROM public.transactions
     WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_net_balance IS 'Calculate total net balance (income - expense)';

-- Function: Get user's total allocated balance
CREATE OR REPLACE FUNCTION public.get_total_allocated_balance(p_user_id UUID)
RETURNS DECIMAL(15, 2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(allocated_amount)
     FROM public.saving_goals
     WHERE user_id = p_user_id AND status = 'active'),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_total_allocated_balance IS 'Calculate total amount allocated across all active goals';

-- Function: Get user's available balance (for display and allocation)
CREATE OR REPLACE FUNCTION public.get_available_balance(p_user_id UUID)
RETURNS TABLE (
  net_balance DECIMAL(15, 2),
  allocated_balance DECIMAL(15, 2),
  available_balance DECIMAL(15, 2)
) AS $$
DECLARE
  v_net_balance DECIMAL(15, 2);
  v_allocated_balance DECIMAL(15, 2);
BEGIN
  v_net_balance := public.get_user_net_balance(p_user_id);
  v_allocated_balance := public.get_total_allocated_balance(p_user_id);

  RETURN QUERY SELECT
    v_net_balance as net_balance,
    v_allocated_balance as allocated_balance,
    (v_net_balance - v_allocated_balance) as available_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_available_balance IS 'Get net balance, allocated balance, and available balance';

-- Function: Validate allocation (check if user has enough balance)
CREATE OR REPLACE FUNCTION public.can_allocate_to_goal(
  p_user_id UUID,
  p_goal_id UUID,
  p_amount DECIMAL(15, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_net_balance DECIMAL(15, 2);
  v_allocated_balance DECIMAL(15, 2);
  v_available_balance DECIMAL(15, 2);
  v_goal_allocated DECIMAL(15, 2);
BEGIN
  -- Get balances
  v_net_balance := public.get_user_net_balance(p_user_id);
  v_allocated_balance := public.get_total_allocated_balance(p_user_id);
  v_available_balance := v_net_balance - v_allocated_balance;

  -- For deposits: check if enough available balance
  IF p_amount > 0 THEN
    RETURN p_amount <= v_available_balance;

  -- For withdrawals: check if goal has enough allocated
  ELSE
    SELECT allocated_amount INTO v_goal_allocated
    FROM public.saving_goals
    WHERE id = p_goal_id AND user_id = p_user_id;

    RETURN ABS(p_amount) <= v_goal_allocated;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_allocate_to_goal IS 'Check if user can allocate/withdraw specified amount to/from goal';

-- Function: Allocate money to goal (deposit)
CREATE OR REPLACE FUNCTION public.allocate_to_goal(
  p_user_id UUID,
  p_goal_id UUID,
  p_amount DECIMAL(15, 2),
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_can_allocate BOOLEAN;
  v_allocation_id UUID;
  v_new_allocated DECIMAL(15, 2);
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  -- Check if can allocate
  v_can_allocate := public.can_allocate_to_goal(p_user_id, p_goal_id, p_amount);

  IF NOT v_can_allocate THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient available balance'
    );
  END IF;

  -- Create allocation record
  INSERT INTO public.goal_allocations (user_id, goal_id, amount, type, note)
  VALUES (p_user_id, p_goal_id, p_amount, 'deposit', p_note)
  RETURNING id INTO v_allocation_id;

  -- Update goal allocated_amount
  UPDATE public.saving_goals
  SET allocated_amount = allocated_amount + p_amount,
      updated_at = NOW()
  WHERE id = p_goal_id AND user_id = p_user_id
  RETURNING allocated_amount INTO v_new_allocated;

  RETURN json_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'new_allocated_amount', v_new_allocated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.allocate_to_goal IS 'Transfer money from available balance to a saving goal';

-- Function: Withdraw money from goal
CREATE OR REPLACE FUNCTION public.withdraw_from_goal(
  p_user_id UUID,
  p_goal_id UUID,
  p_amount DECIMAL(15, 2),
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_can_withdraw BOOLEAN;
  v_allocation_id UUID;
  v_new_allocated DECIMAL(15, 2);
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  -- Check if can withdraw (pass negative amount)
  v_can_withdraw := public.can_allocate_to_goal(p_user_id, p_goal_id, -p_amount);

  IF NOT v_can_withdraw THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient allocated balance in this goal'
    );
  END IF;

  -- Create allocation record (negative amount)
  INSERT INTO public.goal_allocations (user_id, goal_id, amount, type, note)
  VALUES (p_user_id, p_goal_id, -p_amount, 'withdrawal', p_note)
  RETURNING id INTO v_allocation_id;

  -- Update goal allocated_amount
  UPDATE public.saving_goals
  SET allocated_amount = allocated_amount - p_amount,
      updated_at = NOW()
  WHERE id = p_goal_id AND user_id = p_user_id
  RETURNING allocated_amount INTO v_new_allocated;

  RETURN json_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'new_allocated_amount', v_new_allocated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.withdraw_from_goal IS 'Transfer money from a saving goal back to available balance';

-- ========================================
-- 4. CREATE VIEW FOR GOAL PROGRESS
-- ========================================

CREATE OR REPLACE VIEW public.goal_progress_view AS
SELECT
  sg.id as goal_id,
  sg.user_id,
  sg.name,
  sg.target_amount,
  sg.allocated_amount,
  sg.start_date,
  sg.target_date,
  sg.icon,
  sg.color,
  sg.status,
  sg.note,
  ROUND((sg.allocated_amount / NULLIF(sg.target_amount, 0)) * 100, 2) as progress_percent,
  (sg.target_amount - sg.allocated_amount) as remaining_amount,
  CASE
    WHEN sg.allocated_amount >= sg.target_amount THEN true
    ELSE false
  END as is_completed,
  EXTRACT(DAY FROM (sg.target_date::timestamp - CURRENT_DATE::timestamp)) as days_remaining,
  sg.created_at,
  sg.updated_at
FROM public.saving_goals sg
WHERE sg.status = 'active';

COMMENT ON VIEW public.goal_progress_view IS 'View showing goal progress based on allocated amounts';

-- Grant access to view
GRANT SELECT ON public.goal_progress_view TO authenticated;

-- RLS for view
ALTER VIEW public.goal_progress_view SET (security_invoker = true);

-- ========================================
-- 5. CREATE TRIGGER TO AUTO-COMPLETE GOALS
-- ========================================

CREATE OR REPLACE FUNCTION public.check_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if goal is now completed
  IF NEW.allocated_amount >= NEW.target_amount AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_goal_completion
  BEFORE UPDATE OF allocated_amount ON public.saving_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_goal_completion();

COMMENT ON TRIGGER trigger_check_goal_completion ON public.saving_goals IS 'Auto-complete goal when allocated amount reaches target';
