-- Create provider_details table
CREATE TABLE IF NOT EXISTS provider_details (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  title TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  npi TEXT,
  facility JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create provider_codes table
CREATE TABLE IF NOT EXISTS provider_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  CONSTRAINT code_format CHECK (code ~ '^[A-Z0-9]{6}$')
);

-- Create patient_providers table
CREATE TABLE IF NOT EXISTS patient_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  code_id UUID NOT NULL REFERENCES provider_codes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, provider_id)
);

-- Create function to generate a unique provider code
CREATE OR REPLACE FUNCTION generate_provider_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM provider_codes WHERE code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Create function to create a provider code
CREATE OR REPLACE FUNCTION create_provider_code(expiry_days INTEGER DEFAULT 30)
RETURNS provider_codes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code provider_codes;
  code_count INTEGER;
BEGIN
  -- Check if user is a provider
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'provider'
  ) THEN
    RAISE EXCEPTION 'Only providers can create connection codes';
  END IF;

  -- Check active code limit
  SELECT COUNT(*) INTO code_count 
  FROM provider_codes 
  WHERE provider_id = auth.uid() 
  AND status = 'active';

  IF code_count >= 10 THEN
    RAISE EXCEPTION 'Maximum number of active codes reached (10)';
  END IF;

  -- Create new code
  INSERT INTO provider_codes (
    provider_id,
    code,
    expires_at
  ) VALUES (
    auth.uid(),
    generate_provider_code(),
    NOW() + (expiry_days || ' days')::INTERVAL
  )
  RETURNING * INTO new_code;

  RETURN new_code;
END;
$$;

-- Create function to request provider connection
CREATE OR REPLACE FUNCTION request_provider_connection(connection_code TEXT)
RETURNS patient_providers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code provider_codes;
  new_connection patient_providers;
BEGIN
  -- Check if user is a patient
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'patient'
  ) THEN
    RAISE EXCEPTION 'Only patients can request provider connections';
  END IF;

  -- Get and validate code
  SELECT * INTO code 
  FROM provider_codes 
  WHERE code = connection_code 
  AND status = 'active' 
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired connection code';
  END IF;

  -- Create connection request
  INSERT INTO patient_providers (
    patient_id,
    provider_id,
    code_id
  ) VALUES (
    auth.uid(),
    code.provider_id,
    code.id
  )
  RETURNING * INTO new_connection;

  -- Mark code as used
  UPDATE provider_codes SET
    status = 'used',
    used_by = auth.uid(),
    used_at = NOW()
  WHERE id = code.id;

  RETURN new_connection;
END;
$$;

-- Create function to handle connection request
CREATE OR REPLACE FUNCTION handle_connection_request(
  request_id UUID,
  new_status TEXT
)
RETURNS patient_providers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  connection patient_providers;
BEGIN
  -- Check if user is a provider
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'provider'
  ) THEN
    RAISE EXCEPTION 'Only providers can handle connection requests';
  END IF;

  -- Update connection status
  UPDATE patient_providers SET
    status = new_status,
    updated_at = NOW()
  WHERE id = request_id
  AND provider_id = auth.uid()
  RETURNING * INTO connection;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found';
  END IF;

  RETURN connection;
END;
$$;

-- Create RLS policies
ALTER TABLE provider_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_providers ENABLE ROW LEVEL SECURITY;

-- Provider details policies
CREATE POLICY "Providers can insert their own details"
  ON provider_details FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Providers can update their own details"
  ON provider_details FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Anyone can view provider details"
  ON provider_details FOR SELECT
  USING (true);

-- Provider codes policies
CREATE POLICY "Providers can manage their own codes"
  ON provider_codes
  USING (provider_id = auth.uid());

CREATE POLICY "Patients can view codes when connecting"
  ON provider_codes FOR SELECT
  USING (status = 'active' AND expires_at > NOW());

-- Patient providers policies
CREATE POLICY "Providers can view their patient connections"
  ON patient_providers FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Patients can view their provider connections"
  ON patient_providers FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can request connections"
  ON patient_providers FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Providers can update connection status"
  ON patient_providers FOR UPDATE
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());
