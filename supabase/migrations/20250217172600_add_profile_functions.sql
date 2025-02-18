-- Function to get full profile data
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
                    'facility_name', pd.facility_name,
                    'facility_address', pd.facility_address,
                    'facility_phone', pd.facility_phone
                )
                FROM provider_details pd
                WHERE pd.provider_id = p_user_id
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
                    'facility', pd.facility_name,
                    'phone', pd.facility_phone,
                    'email', p.email
                ))
                FROM patient_providers pp
                JOIN profiles p ON p.id = pp.provider_id
                JOIN provider_details pd ON pd.provider_id = p.id
                WHERE pp.patient_id = p_user_id
                AND pp.status = 'active'
            )
        );
    END IF;

    RETURN v_profile;
END;
$$;

-- Function to update profile
CREATE OR REPLACE FUNCTION update_profile(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET
        name = COALESCE(p_updates->>'name', name),
        phone = COALESCE(p_updates->>'phone', phone),
        photo_url = COALESCE(p_updates->>'photo_url', photo_url),
        date_of_birth = COALESCE((p_updates->>'date_of_birth')::date, date_of_birth),
        gender = COALESCE(p_updates->>'gender', gender),
        address = COALESCE(p_updates->>'address', address),
        metadata = CASE 
            WHEN p_updates ? 'metadata' THEN p_updates->'metadata'
            ELSE metadata
        END,
        updated_at = now()
    WHERE id = auth.uid();
END;
$$;
