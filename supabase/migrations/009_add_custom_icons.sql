-- ========================================
-- ADD CUSTOM ICON SUPPORT
-- ========================================
-- Allows users to upload custom images for category and budget icons

-- Add icon_url column to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN public.categories.icon_url IS 'URL to custom uploaded icon image in Supabase Storage';

-- Add icon_url column to budgets table
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN public.budgets.icon_url IS 'URL to custom uploaded icon image in Supabase Storage';

-- ========================================
-- CREATE STORAGE BUCKET FOR ICONS
-- ========================================

-- Create bucket for category and budget icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('icons', 'icons', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Allow authenticated users to upload their own icons
CREATE POLICY "Users can upload own icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view all icons (public bucket)
CREATE POLICY "Anyone can view icons"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'icons');

-- Allow users to update their own icons
CREATE POLICY "Users can update own icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own icons
CREATE POLICY "Users can delete own icons"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 009 COMPLETE                      ║';
  RAISE NOTICE '╚══════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '1. ✓ icon_url column to categories table';
  RAISE NOTICE '2. ✓ icon_url column to budgets table';
  RAISE NOTICE '3. ✓ Storage bucket "icons" for uploads';
  RAISE NOTICE '4. ✓ RLS policies for user file access';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now upload custom images for icons!';
  RAISE NOTICE '';
END;
$$;
