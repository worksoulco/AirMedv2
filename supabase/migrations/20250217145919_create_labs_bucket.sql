-- Create labs storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('labs', 'labs', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create policy to allow authenticated users to upload PDFs
  CREATE POLICY "Allow authenticated users to upload PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'labs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = 'pdf'
  );

  -- Create policy to allow users to read their own PDFs
  CREATE POLICY "Allow users to read their own PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'labs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Create policy to allow providers to read their patients' PDFs
  CREATE POLICY "Allow providers to read patient PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'labs'
    AND EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE provider_id = auth.uid()
      AND patient_id = (storage.foldername(name))[1]::uuid
      AND status = 'active'
    )
  );

  -- Create policy to allow users to delete their own PDFs
  CREATE POLICY "Allow users to delete their own PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'labs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
END $$;
