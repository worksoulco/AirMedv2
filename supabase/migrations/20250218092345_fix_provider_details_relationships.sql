-- Drop existing constraints if they exist
ALTER TABLE provider_details
DROP CONSTRAINT IF EXISTS provider_details_id_fkey;

-- Add foreign key relationship to profiles
ALTER TABLE provider_details
ADD CONSTRAINT provider_details_provider_id_fkey
  FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update get_full_profile function to use correct table aliases
CREATE OR REPLACE FUNCTION get_full_profile(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile jsonb;
    v_user_role text;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = p_user_id;

    -- Get base profile data
    SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email,
        'phone', p.phone,
        'photo_url', p.photo_url,
        'date_of_birth', p.date_of_birth,
        'gender', p.gender,
        'address', p.address,
        'role', p.role,
        'height', p.height,
        'weight', p.weight,
        'blood_type', p.blood_type,
        'emergency_contact', p.emergency_contact,
        'metadata', p.metadata
    )
    INTO v_profile
    FROM profiles p
    WHERE p.id = p_user_id;

    -- Add role-specific data
    IF v_user_role = 'provider' THEN
        -- Add provider details
        v_profile = v_profile || jsonb_build_object(
            'provider_details', (
                SELECT jsonb_build_object(
                    'title', pd.title,
                    'specialties', pd.specialties,
                    'npi', pd.npi,
                    'facility', pd.facility
                )
                FROM provider_details pd
                WHERE pd.id = p_user_id
            )
        );
    ELSIF v_user_role = 'patient' THEN
        -- Add patient's providers
        v_profile = v_profile || jsonb_build_object(
            'providers', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'role', pd.title,
                    'facility', pd.facility,
                    'email', p.email
                ))
                FROM patient_providers pp
                JOIN profiles p ON p.id = pp.provider_id
                LEFT JOIN provider_details pd ON pd.id = p.id
                WHERE pp.patient_id = p_user_id
                AND pp.status = 'active'
            )
        );
    END IF;

    RETURN v_profile;
END;
$$;
