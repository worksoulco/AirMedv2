-- Function to create storage policies
CREATE OR REPLACE FUNCTION storage.create_policy(
  table_name text,
  name text,
  operation text,
  expression text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drop existing policy if it exists
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.%I', name, table_name);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors from non-existent policies
    NULL;
  END;

  -- Create new policy
  EXECUTE format(
    'CREATE POLICY %I ON storage.%I FOR %s TO authenticated USING (%s)',
    name,
    table_name,
    operation,
    expression
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION storage.create_policy TO authenticated;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
