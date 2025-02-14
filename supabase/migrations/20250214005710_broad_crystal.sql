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
    preferences = COALESCE(p_updates->'preferences', preferences),
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
      ELSE NULL END
    )
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN v_profile;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_full_profile TO authenticated;