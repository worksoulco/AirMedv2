-- Create provider_codes table
CREATE TABLE IF NOT EXISTS provider_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('active', 'used', 'expired', 'revoked'))
);

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    code_id UUID REFERENCES provider_codes(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    UNIQUE(provider_id, patient_id, code_id)
);

-- Create RLS policies
ALTER TABLE provider_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Provider can see and manage their own codes
CREATE POLICY provider_codes_select ON provider_codes
    FOR SELECT TO authenticated
    USING (provider_id = auth.uid());

CREATE POLICY provider_codes_insert ON provider_codes
    FOR INSERT TO authenticated
    WITH CHECK (provider_id = auth.uid());

CREATE POLICY provider_codes_update ON provider_codes
    FOR UPDATE TO authenticated
    USING (provider_id = auth.uid());

-- Patients can verify codes when connecting
CREATE POLICY patient_verify_code ON provider_codes
    FOR SELECT TO authenticated
    USING (status = 'active' AND expires_at > NOW());

-- Connection request policies
CREATE POLICY connection_requests_provider ON connection_requests
    FOR ALL TO authenticated
    USING (provider_id = auth.uid());

CREATE POLICY connection_requests_patient ON connection_requests
    FOR ALL TO authenticated
    USING (patient_id = auth.uid());

-- Function to generate unique provider code
CREATE OR REPLACE FUNCTION generate_provider_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code VARCHAR(6);
    exists BOOLEAN;
BEGIN
    LOOP
        code := '';
        FOR i IN 1..6 LOOP
            code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM provider_codes WHERE provider_codes.code = code) INTO exists;
        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to create a new provider code
CREATE OR REPLACE FUNCTION create_provider_code(
    provider_id UUID,
    expiry_days INTEGER DEFAULT 30
)
RETURNS provider_codes AS $$
DECLARE
    new_code provider_codes;
    active_codes INTEGER;
BEGIN
    -- Check number of active codes
    SELECT COUNT(*) INTO active_codes
    FROM provider_codes
    WHERE provider_codes.provider_id = create_provider_code.provider_id
    AND status = 'active'
    AND expires_at > NOW();

    IF active_codes >= 10 THEN
        RAISE EXCEPTION 'Maximum number of active codes (10) reached';
    END IF;

    INSERT INTO provider_codes (
        provider_id,
        code,
        expires_at
    ) VALUES (
        provider_id,
        generate_provider_code(),
        NOW() + (expiry_days || ' days')::INTERVAL
    )
    RETURNING * INTO new_code;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request provider connection
CREATE OR REPLACE FUNCTION request_provider_connection(
    patient_id UUID,
    connection_code VARCHAR(6)
)
RETURNS connection_requests AS $$
DECLARE
    code_record provider_codes;
    new_request connection_requests;
BEGIN
    -- Get and validate code
    SELECT * INTO code_record
    FROM provider_codes
    WHERE code = connection_code
    AND status = 'active'
    AND expires_at > NOW();

    IF code_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired connection code';
    END IF;

    -- Create connection request
    INSERT INTO connection_requests (
        provider_id,
        patient_id,
        code_id,
        status
    ) VALUES (
        code_record.provider_id,
        patient_id,
        code_record.id,
        'pending'
    )
    RETURNING * INTO new_request;

    -- Update code status
    UPDATE provider_codes
    SET status = 'used',
        used_by = patient_id,
        used_at = NOW()
    WHERE id = code_record.id;

    RETURN new_request;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle connection request response
CREATE OR REPLACE FUNCTION handle_connection_request(
    request_id UUID,
    new_status VARCHAR
)
RETURNS connection_requests AS $$
DECLARE
    request_record connection_requests;
BEGIN
    IF new_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
    END IF;

    UPDATE connection_requests
    SET status = new_status,
        updated_at = NOW()
    WHERE id = request_id
    AND status = 'pending'
    RETURNING * INTO request_record;

    IF request_record IS NULL THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;

    RETURN request_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
