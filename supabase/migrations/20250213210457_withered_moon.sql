/*
  # Create meals table and storage buckets

  1. New Tables
    - `meals`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `type` (text, enum)
      - `date` (date)
      - `time` (time)
      - `notes` (text)
      - `photo_url` (text)
      - `thumbnail_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create food-photos bucket
    - Create food-thumbnails bucket
    - Add storage policies for both buckets

  3. Security
    - Enable RLS on meals table
    - Add policies for patient self-access
    - Add policies for provider view access
*/

-- First drop existing table and related objects if they exist
DO $$ 
BEGIN
  -- Drop existing triggers
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_meals_timestamp') THEN
    DROP TRIGGER IF EXISTS set_meals_timestamp ON public.meals;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_meals_updated_at') THEN
    DROP TRIGGER IF EXISTS set_meals_updated_at ON public.meals;
  END IF;

  -- Drop existing indexes
  DROP INDEX IF EXISTS idx_meals_patient_date;
  DROP INDEX IF EXISTS idx_meals_type;
  DROP INDEX IF EXISTS idx_meals_patient_date_new;
  DROP INDEX IF EXISTS idx_meals_type_new;

  -- Drop existing table
  DROP TABLE IF EXISTS public.meals;
END $$;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('food-photos', 'food-photos', false),
  ('food-thumbnails', 'food-thumbnails', false)
ON CONFLICT (id) DO NOTHING;

-- Create meals table
CREATE TABLE public.meals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  date date NOT NULL,
  time time NOT NULL,
  notes text,
  photo_url text,
  thumbnail_url text,
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

-- Create policies for food photos bucket
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

CREATE POLICY "food_photos_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policies for thumbnails bucket
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

CREATE POLICY "food_thumbnails_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meals_patient_date_new 
ON public.meals(patient_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_meals_type_new 
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