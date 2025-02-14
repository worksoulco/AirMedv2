/*
  # Food Journal Photo Thumbnails Migration

  1. Storage Configuration
    - Create thumbnails bucket for food photos
    - Enable RLS on the bucket
    - Add policies for secure access

  2. Security
    - Only allow authenticated users to access thumbnails
    - Users can only access their own thumbnails
    - Providers can access their patients' thumbnails
*/

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-thumbnails', 'food-thumbnails', false);

-- Enable RLS on the thumbnails bucket
CREATE POLICY "Users can upload own food thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own thumbnails
CREATE POLICY "Users can read own food thumbnails"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'food-thumbnails'
  AND (
    -- User's own thumbnails
    auth.uid()::text = (storage.foldername(name))[1]
    -- Provider access to patient thumbnails
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id::text = (storage.foldername(name))[1]
      AND status = 'active'
    )
  )
);

-- Allow users to delete their own thumbnails
CREATE POLICY "Users can delete own food thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add function to clean up orphaned thumbnails
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_food_thumbnails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_object record;
BEGIN
  FOR v_object IN
    SELECT obj.name
    FROM storage.objects obj
    WHERE obj.bucket_id = 'food-thumbnails'
    AND NOT EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.photo_url LIKE '%' || obj.name
    )
  LOOP
    DELETE FROM storage.objects WHERE name = v_object.name;
  END LOOP;
END;
$$;