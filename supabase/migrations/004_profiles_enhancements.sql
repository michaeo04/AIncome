-- ========================================
-- Migration 004: Profile & Settings Enhancements
-- Phase 9: Add profile fields for settings and avatar
-- ========================================
-- Note: Avatar storage bucket and policies already created in migration 003
-- This migration only adds new columns to profiles table

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget_alerts BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_reminders BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.full_name IS 'User full name for display';
COMMENT ON COLUMN profiles.avatar_url IS 'Path to avatar image in storage bucket (avatars bucket created in migration 003)';
COMMENT ON COLUMN profiles.language IS 'Preferred app language: EN (English), VI (Vietnamese), ES (Spanish), FR (French), DE (German), ZH (Chinese), JA (Japanese), KO (Korean)';
COMMENT ON COLUMN profiles.theme IS 'Theme preference: light, dark, or auto';
COMMENT ON COLUMN profiles.notifications IS 'Master notification toggle - enables/disables all notifications';
COMMENT ON COLUMN profiles.budget_alerts IS 'Enable budget threshold alerts (only works if notifications enabled)';
COMMENT ON COLUMN profiles.goal_reminders IS 'Enable saving goal reminder notifications (only works if notifications enabled)';

-- Verify columns were added successfully
DO $$
BEGIN
  -- Check if all columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    RAISE EXCEPTION 'Column full_name was not added successfully';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    RAISE EXCEPTION 'Column avatar_url was not added successfully';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'language'
  ) THEN
    RAISE EXCEPTION 'Column language was not added successfully';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    RAISE EXCEPTION 'Column theme was not added successfully';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notifications'
  ) THEN
    RAISE EXCEPTION 'Column notifications was not added successfully';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'budget_alerts'
  ) THEN
    RAISE EXCEPTION 'Column budget_alerts was not added successfully';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'goal_reminders'
  ) THEN
    RAISE EXCEPTION 'Column goal_reminders was not added successfully';
  END IF;

  RAISE NOTICE 'Migration 004 completed successfully - All profile enhancement columns added';
END $$;
