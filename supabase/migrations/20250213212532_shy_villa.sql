/*
  # Fix Storage Policies

  1. Changes
    - Drop existing storage policies before creating new ones
    - Make storage buckets public for direct URL access
    - Update meals table structure
    - Add proper RLS policies
*/

-- First drop ALL existing storage policies
DO $$ 
BEGIN
  -- Drop existing storage policies
  DROP POLICY IF EXISTS "food_photos_insert" ON storage.objects;
  DROP POLICY IF EXISTS "food_photos_select" ON storage.objects;
  DROP POLICY IF EXISTS "food_photos_delete" ON storage.objects;
  DROP POLICY IF EXISTS "food_thumbnails_insert" ON storage.objects;
  DROP POLICY IF EXISTS "food_thumbnails_select" ON storage.objects;
  DROP POLICY IF EXISTS "food_thumbnails_delete" ON storage.objects;
END $$;

-- Drop existing table and related objects
DO $$ 
BEGIN
  -- Drop existing triggers
  DROP TRIGGER IF EXISTS set_meals_timestamp ON public.meals;
  DROP TRIGGER IF EXISTS set_meals_updated_at ON public.meals;

  -- Drop existing indexes
  DROP INDEX IF EXISTS idx_meals_patient_date;
  DROP INDEX IF EXISTS idx_meals_type;
  DROP INDEX IF EXISTS idx_meals_patient_date_new;
  DROP INDEX IF EXISTS idx_meals_type_new;

  -- Drop existing table
  DROP TABLE IF EXISTS public.meals;
END $$;

-- Create meals table with correct structure
CREATE TABLE public.meals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  date date NOT NULL,
  time time NOT NULL,
  notes text,
  photo_url text,
  thumbnail_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Create policies for meals table
CREATE POLICY "meals_patient_access"
ON public.meals
FOR ALL
USING (
  auth.uid() = patient_id
)
WITH CHECK (
  auth.uid() = patient_id
);

CREATE POLICY "meals_provider_view"
ON public.meals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = meals.patient_id
    AND status = 'active'
  )
);

-- Create storage buckets if they don't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('food-photos', 'food-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('food-thumbnails', 'food-thumbnails', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- Create new storage policies
CREATE POLICY "food_photos_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "food_photos_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-photos');

CREATE POLICY "food_photos_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "food_thumbnails_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "food_thumbnails_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-thumbnails');

CREATE POLICY "food_thumbnails_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add indexes for better performance
CREATE INDEX idx_meals_patient_date 
ON public.meals(patient_id, date DESC);

CREATE INDEX idx_meals_type 
ON public.meals(type);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_meals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_meals_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION update_meals_timestamp();

-- Add function to clean up orphaned photos
CREATE OR REPLACE FUNCTION cleanup_orphaned_food_photos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_object record;
BEGIN
  -- Clean up photos
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

  -- Clean up thumbnails
  FOR v_object IN
    SELECT obj.name
    FROM storage.objects obj
    WHERE obj.bucket_id = 'food-thumbnails'
    AND NOT EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.thumbnail_url LIKE '%' || obj.name
    )
  LOOP
    DELETE FROM storage.objects WHERE name = v_object.name;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT ALL ON public.meals TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_food_photos TO authenticated;