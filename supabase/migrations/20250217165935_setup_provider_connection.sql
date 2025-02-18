-- Create provider codes table
CREATE TABLE IF NOT EXISTS provider_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  CONSTRAINT valid_code_format CHECK (code ~ '^[A-Z0-9]{6}$')
);

-- Create patient-provider relationships table
CREATE TABLE IF NOT EXISTS patient_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, provider_id)
);

-- Function to generate a unique provider code
CREATE OR REPLACE FUNCTION generate_unique_code() RETURNS VARCHAR(6) AS $$
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

-- Function to create a provider code
CREATE OR REPLACE FUNCTION create_provider_code(expiry_days INTEGER DEFAULT 30)
RETURNS provider_codes AS $$
DECLARE
  new_code provider_codes;
  active_codes INTEGER;
BEGIN
  -- Check if provider has reached the maximum number of active codes
  SELECT COUNT(*) INTO active_codes
  FROM provider_codes
  WHERE provider_id = auth.uid()
  AND status = 'active';

  IF active_codes >= 10 THEN
    RAISE EXCEPTION 'Maximum number of active codes (10) reached';
  END IF;

  -- Create new code
  INSERT INTO provider_codes (
    provider_id,
    code,
    expires_at
  ) VALUES (
    auth.uid(),
    generate_unique_code(),
    now() + (expiry_days || ' days')::interval
  )
  RETURNING * INTO new_code;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request a provider connection
CREATE OR REPLACE FUNCTION request_provider_connection(connection_code VARCHAR)
RETURNS patient_providers AS $$
DECLARE
  code_record provider_codes;
  connection patient_providers;
BEGIN
  -- Get and validate code
  SELECT * INTO code_record
  FROM provider_codes
  WHERE code = upper(connection_code)
  AND status = 'active'
  AND expires_at > now()
  FOR UPDATE;

  IF code_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired code';
  END IF;

  -- Create connection request
  INSERT INTO patient_providers (
    patient_id,
    provider_id
  ) VALUES (
    auth.uid(),
    code_record.provider_id
  )
  RETURNING * INTO connection;

  -- Mark code as used
  UPDATE provider_codes
  SET status = 'used',
      used_by = auth.uid(),
      used_at = now()
  WHERE id = code_record.id;

  RETURN connection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle connection request
CREATE OR REPLACE FUNCTION handle_connection_request(
  request_id UUID,
  new_status VARCHAR
)
RETURNS patient_providers AS $$
DECLARE
  connection patient_providers;
BEGIN
  -- Verify the provider owns this request
  SELECT * INTO connection
  FROM patient_providers
  WHERE id = request_id
  AND provider_id = auth.uid()
  AND status = 'pending'
  FOR UPDATE;

  IF connection IS NULL THEN
    RAISE EXCEPTION 'Invalid request ID or not authorized';
  END IF;

  -- Update status
  UPDATE patient_providers
  SET status = new_status,
      updated_at = now()
  WHERE id = request_id
  RETURNING * INTO connection;

  RETURN connection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE provider_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_providers ENABLE ROW LEVEL SECURITY;

-- Provider can see their own codes
CREATE POLICY provider_codes_select ON provider_codes
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Provider can create codes
CREATE POLICY provider_codes_insert ON provider_codes
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = auth.uid());

-- Provider can update their own codes
CREATE POLICY provider_codes_update ON provider_codes
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid());

-- Patient can see their connections
CREATE POLICY patient_providers_select_patient ON patient_providers
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- Provider can see their connections
CREATE POLICY patient_providers_select_provider ON patient_providers
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Patient can create connection requests
CREATE POLICY patient_providers_insert ON patient_providers
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Provider can update connection status
CREATE POLICY patient_providers_update ON patient_providers
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_provider_codes_provider_id ON provider_codes(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_codes_status ON provider_codes(status);
CREATE INDEX IF NOT EXISTS idx_provider_codes_code ON provider_codes(code);
CREATE INDEX IF NOT EXISTS idx_patient_providers_patient_id ON patient_providers(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_providers_provider_id ON patient_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_patient_providers_status ON patient_providers(status);
