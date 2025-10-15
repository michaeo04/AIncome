-- ========================================
-- ADD USER PERSONALIZATION FIELDS
-- ========================================
-- This migration adds personalization fields to the profiles table
-- to enable personalized chatbot responses and user experience

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS financial_goals JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS financial_knowledge TEXT CHECK (financial_knowledge IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS communication_style TEXT CHECK (communication_style IN ('casual', 'professional', 'brief', 'detailed', 'encouraging')),
  ADD COLUMN IF NOT EXISTS age_range TEXT CHECK (age_range IN ('18-25', '26-35', '36-45', '46-55', '56+')),
  ADD COLUMN IF NOT EXISTS financial_concerns JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS income_level TEXT CHECK (income_level IN ('student', 'entry', 'middle', 'upper_middle', 'high', 'prefer_not_say')),
  ADD COLUMN IF NOT EXISTS family_situation TEXT CHECK (family_situation IN ('single', 'partnered_no_kids', 'partnered_with_kids', 'single_parent', 'living_with_parents', 'retired')),
  ADD COLUMN IF NOT EXISTS has_completed_personalization BOOLEAN DEFAULT false NOT NULL;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS profiles_personalization_completed_idx ON public.profiles(has_completed_personalization);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.financial_goals IS 'Array of financial goals: save_house, pay_debt, emergency_fund, retirement, investment, travel, education, track_spending';
COMMENT ON COLUMN public.profiles.financial_knowledge IS 'User financial knowledge level: beginner, intermediate, advanced';
COMMENT ON COLUMN public.profiles.communication_style IS 'Preferred chatbot communication style: casual, professional, brief, detailed, encouraging';
COMMENT ON COLUMN public.profiles.age_range IS 'User age range for contextual advice';
COMMENT ON COLUMN public.profiles.financial_concerns IS 'Array of primary concerns: overspending, not_saving, debt, budgeting, investment, retirement_plan, education_costs, healthcare_costs';
COMMENT ON COLUMN public.profiles.income_level IS 'General income bracket';
COMMENT ON COLUMN public.profiles.family_situation IS 'Family/living situation for financial context';
COMMENT ON COLUMN public.profiles.has_completed_personalization IS 'Whether user has completed personalization onboarding';
