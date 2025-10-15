-- ========================================
-- ADD HAS_COMPLETED_ONBOARDING FIELD
-- ========================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_onboarding_completed_idx ON public.profiles(has_completed_onboarding);

COMMENT ON COLUMN public.profiles.has_completed_onboarding IS 'Whether user has completed the onboarding flow';
