/*
  # Food Journal Storage Migration

  1. Storage Buckets
    - Create food-photos bucket for storing meal photos
    - Enable RLS on the bucket
    - Add policies for secure access

  2. Security
    - Only allow authenticated users to upload photos
    - Users can only access their own photos
    - Providers can access their patients' photos
*/

-- Create storage bucket for food photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', false);

-- Enable RLS on the bucket
CREATE POLICY "Users can upload own food photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own photos
CREATE POLICY "Users can read own food photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND (
    -- User's own photos
    auth.uid()::text = (storage.foldername(name))[1]
    -- Provider access to patient photos
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id::text = (storage.foldername(name))[1]
      AND status = 'active'
    )
  )
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own food photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add function to clean up orphaned photos
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_food_photos()
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
    WHERE obj.bucket_id = 'food-photos'
    AND NOT EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.photo_url LIKE '%' || obj.name
    )
  LOOP
    DELETE FROM storage.objects WHERE name = v_object.name;
  END LOOP;
END;
$$;