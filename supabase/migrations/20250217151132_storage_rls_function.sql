-- Function to enable RLS on storage.objects
CREATE OR REPLACE FUNCTION storage.enable_rls_on_storage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION storage.enable_rls_on_storage TO authenticated;

-- Create base policy for storage.objects
CREATE POLICY "Enable read access for authenticated users" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'labs'
);
