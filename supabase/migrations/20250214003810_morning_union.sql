/*
  # User Profile and Menu Updates

  1. New Tables
    - `user_preferences` - Stores user preferences like theme, notifications, etc.
    - `user_settings` - Stores user settings and configurations

  2. Changes
    - Add additional fields to profiles table
    - Add preferences and settings relations
    - Add helper functions for profile management

  3. Security
    - Enable RLS on new tables
    - Add policies for user access
*/

-- Add additional fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT jsonb_build_object(
  'theme', 'light',
  'notifications', jsonb_build_object(
    'appointments', true,
    'labResults', true,
    'messages', true,
    'reminders', true
  ),
  'language', 'en'
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own settings"
ON public.user_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_preferences jsonb
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

  -- Update preferences
  UPDATE profiles
  SET
    preferences = preferences || p_preferences,
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING preferences INTO v_profile.preferences;

  RETURN v_profile.preferences;
END;
$$;

-- Add function to get user profile with settings
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id uuid)
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
      'preferences', p.preferences,
      'provider_details', CASE WHEN p.role = 'provider' THEN
        (SELECT jsonb_build_object(
          'title', pd.title,
          'specialties', pd.specialties,
          'facility_name', pd.facility_name
        )
        FROM provider_details pd
        WHERE pd.provider_id = p.id)
      ELSE NULL END,
      'settings', (
        SELECT jsonb_object_agg(category, settings)
        FROM user_settings
        WHERE user_id = p.id
      )
    )
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN v_profile;
END;
$$;

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;