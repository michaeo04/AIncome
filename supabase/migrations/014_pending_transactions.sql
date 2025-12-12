-- ========================================
-- PENDING TRANSACTIONS SYSTEM
-- ========================================
-- Purpose: Store bank transaction notifications before user confirmation
-- This enables auto-detection of transactions from bank SMS/webhooks

-- ========================================
-- 1. CREATE PENDING_TRANSACTIONS TABLE
-- ========================================

CREATE TABLE public.pending_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Raw data from bank
  raw_sms_text TEXT NOT NULL, -- Original bank SMS/notification text
  bank_name TEXT, -- e.g., 'BIDV', 'VietcomBank', 'Techcombank', 'VPBank'

  -- Parsed data (extracted by AI, editable by user)
  parsed_type TEXT NOT NULL CHECK (parsed_type IN ('income', 'expense')),
  parsed_amount DECIMAL(15, 2) NOT NULL CHECK (parsed_amount > 0),
  parsed_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  parsed_note TEXT,
  parsed_date DATE NOT NULL,
  parsed_merchant TEXT, -- Extracted merchant/vendor name (e.g., "Highlands Coffee")

  -- AI metadata
  confidence DECIMAL(3, 2), -- AI confidence score 0.0-1.0 (e.g., 0.95)

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- 2. RLS POLICIES
-- ========================================

ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending transactions
CREATE POLICY "Users can view own pending transactions"
  ON public.pending_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own pending transactions (for editing before confirm)
CREATE POLICY "Users can update own pending transactions"
  ON public.pending_transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pending transactions (reject)
CREATE POLICY "Users can delete own pending transactions"
  ON public.pending_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert (webhook will use service role key to bypass RLS)
CREATE POLICY "Service can insert pending transactions"
  ON public.pending_transactions FOR INSERT
  WITH CHECK (true); -- Authenticated via service role key in Edge Function

-- ========================================
-- 3. INDEXES
-- ========================================

CREATE INDEX pending_transactions_user_id_idx
  ON public.pending_transactions(user_id);

CREATE INDEX pending_transactions_status_idx
  ON public.pending_transactions(status);

CREATE INDEX pending_transactions_created_idx
  ON public.pending_transactions(created_at DESC);

-- Composite index for common query pattern (user's pending transactions)
CREATE INDEX pending_transactions_user_status_idx
  ON public.pending_transactions(user_id, status, created_at DESC);

-- ========================================
-- 4. TRIGGERS
-- ========================================

-- Trigger for updated_at
CREATE TRIGGER update_pending_transactions_updated_at
  BEFORE UPDATE ON public.pending_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Comments for documentation
COMMENT ON TABLE public.pending_transactions IS 'Stores detected bank transactions awaiting user review and confirmation';
COMMENT ON COLUMN public.pending_transactions.raw_sms_text IS 'Original bank SMS text received via webhook';
COMMENT ON COLUMN public.pending_transactions.confidence IS 'AI parsing confidence score (0.0 to 1.0)';
COMMENT ON COLUMN public.pending_transactions.parsed_merchant IS 'Merchant name extracted from SMS (e.g., "Highlands Coffee")';
COMMENT ON COLUMN public.pending_transactions.status IS 'pending: awaiting review | confirmed: added to transactions | rejected: discarded';
