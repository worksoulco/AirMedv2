-- Create a function to create storage policies
CREATE OR REPLACE FUNCTION storage.create_storage_policies(
  bucket_id text,
  policies jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy jsonb;
BEGIN
  FOR policy IN SELECT * FROM jsonb_array_elements(policies)
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR %s TO authenticated USING (%s)',
      policy->>'name',
      policy->>'operation',
      policy->>'expression'
    );
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION storage.create_storage_policies TO authenticated;
