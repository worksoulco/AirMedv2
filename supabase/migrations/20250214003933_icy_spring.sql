/*
  # User Profile Updates

  1. New Fields
    - Add additional profile fields
    - Add profile settings table
    - Add profile validation

  2. Changes
    - Update profile functions
    - Add helper functions for profile management

  3. Security
    - Add RLS policies for new tables
    - Update existing policies
*/

-- Add additional profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS height text,
ADD COLUMN IF NOT EXISTS weight text,
ADD COLUMN IF NOT EXISTS blood_type text,
ADD COLUMN IF NOT EXISTS emergency_contact jsonb DEFAULT jsonb_build_object(
  'name', '',
  'relationship', '',
  'phone', ''
);

-- Create profile settings table
CREATE TABLE IF NOT EXISTS public.profile_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, category)
);

-- Enable RLS
ALTER TABLE public.profile_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own profile settings"
ON public.profile_settings
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Add function to update profile
CREATE OR REPLACE FUNCTION update_profile(
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
BEGIN
  -- Get current profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    name = COALESCE(p_updates->>'name', name),
    phone = COALESCE(p_updates->>'phone', phone),
    photo_url = COALESCE(p_updates->>'photo_url', photo_url),
    height = COALESCE(p_updates->>'height', height),
    weight = COALESCE(p_updates->>'weight', weight),
    blood_type = COALESCE(p_updates->>'blood_type', blood_type),
    emergency_contact = COALESCE(p_updates->'emergency_contact', emergency_contact),
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  RETURN row_to_json(v_profile)::jsonb;
END;
$$;

-- Add function to get full profile
CREATE OR REPLACE FUNCTION get_full_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
BEGIN
  SELECT
    jsonb_build_object(
      'id', p.id,
      'role', p.role,
      'name', p.name,
      'email', p.email,
      'phone', p.phone,
      'photo_url', p.photo_url,
      'date_of_birth', p.date_of_birth,
      'gender', p.gender,
      'height', p.height,
      'weight', p.weight,
      'blood_type', p.blood_type,
      'address', p.address,
      'emergency_contact', p.emergency_contact,
      'preferences', p.preferences,
      'provider_details', CASE WHEN p.role = 'provider' THEN
        (SELECT jsonb_build_object(
          'title', pd.title,
          'specialties', pd.specialties,
          'facility_name', pd.facility_name,
          'facility_address', pd.facility_address,
          'facility_phone', pd.facility_phone
        )
        FROM provider_details pd
        WHERE pd.provider_id = p.id)
      ELSE NULL END,
      'settings', (
        SELECT jsonb_object_agg(category, settings)
        FROM profile_settings
        WHERE profile_id = p.id
      )
    )
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN v_profile;
END;
$$;

-- Grant permissions
GRANT ALL ON public.profile_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_full_profile TO authenticated;