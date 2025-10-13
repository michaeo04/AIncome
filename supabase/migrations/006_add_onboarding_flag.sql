-- ========================================
-- Migration 006: Add Onboarding Completion Flag
-- Adds flag to track if user has completed onboarding
-- ========================================

-- Add has_completed_onboarding column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false NOT NULL;

-- Update existing users with data to mark onboarding as completed
-- If user has any transactions, categories, budgets, or goals, they've used the app
UPDATE public.profiles p
SET has_completed_onboarding = true
WHERE EXISTS (
  SELECT 1 FROM public.transactions t WHERE t.user_id = p.id
  UNION
  SELECT 1 FROM public.categories c WHERE c.user_id = p.id
  UNION
  SELECT 1 FROM public.budgets b WHERE b.user_id = p.id
  UNION
  SELECT 1 FROM public.saving_goals sg WHERE sg.user_id = p.id
);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.has_completed_onboarding IS
  'Tracks whether user has completed the initial onboarding flow. Set to true after onboarding or if user has existing data.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS profiles_onboarding_idx ON public.profiles(has_completed_onboarding);

-- Verify column was added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_completed_onboarding'
  ) THEN
    RAISE EXCEPTION 'Column has_completed_onboarding was not added successfully to profiles table';
  END IF;

  RAISE NOTICE 'Migration 006 completed successfully - Onboarding flag added to profiles';
END $$;
