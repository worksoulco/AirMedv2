-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow providers to read patient PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own PDFs" ON storage.objects;

-- Create policies
CREATE POLICY "Allow authenticated users to upload PDFs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'labs' 
  AND (storage.foldername(name))[1] = auth.uid()::text 
  AND lower(storage.extension(name)) = 'pdf'
);

CREATE POLICY "Allow users to read their own PDFs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'labs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow providers to read patient PDFs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'labs' 
  AND EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = (storage.foldername(name))[1]::uuid
    AND status = 'active'
  )
);

CREATE POLICY "Allow users to delete their own PDFs" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'labs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
