-- ========================================
-- Migration 005: Add Transaction Name/Title Field
-- Adds a name/title field to transactions for better description
-- ========================================

-- Add name column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN transactions.name IS 'Transaction name/title for better identification (e.g., "Grocery Shopping", "Monthly Salary")';

-- Update existing transactions to have a default name based on category (optional)
-- This makes existing transactions look better in the UI
-- You can skip this if you want existing transactions to have NULL name
UPDATE transactions t
SET name = CASE
  WHEN t.note IS NOT NULL AND t.note != '' THEN
    LEFT(t.note, 50)  -- Use first 50 chars of note as name
  ELSE
    (SELECT c.name FROM categories c WHERE c.id = t.category_id)  -- Use category name
END
WHERE t.name IS NULL;

-- Verify column was added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'name'
  ) THEN
    RAISE EXCEPTION 'Column name was not added successfully to transactions table';
  END IF;

  RAISE NOTICE 'Migration 005 completed successfully - Transaction name field added';
END $$;
