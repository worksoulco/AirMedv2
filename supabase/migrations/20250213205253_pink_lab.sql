/*
  # Create Meals Table

  1. New Table
    - `meals` - For storing meal entries with photos and metadata
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `type` (text, enum: breakfast, lunch, dinner, snack)
      - `date` (date)
      - `time` (time)
      - `notes` (text)
      - `photo_url` (text)
      - `thumbnail_url` (text)

  2. Security
    - Enable RLS
    - Add policies for secure access
    - Add performance indexes
*/

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
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

-- Create policies with unique names
CREATE POLICY "meals_self_access"
ON public.meals
FOR ALL
USING (
  auth.uid() = patient_id
)
WITH CHECK (
  auth.uid() = patient_id
);

CREATE POLICY "meals_provider_access"
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

-- Add indexes
CREATE INDEX idx_meals_patient_date ON public.meals(patient_id, date DESC);
CREATE INDEX idx_meals_type ON public.meals(type);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_meals_timestamp
  BEFORE UPDATE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.meals TO authenticated;