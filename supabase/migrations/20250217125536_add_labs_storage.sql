-- Create labs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('labs', 'labs', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
CREATE POLICY "Allow public read access to lab reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'labs'
);

-- Allow authenticated users to upload lab reports
CREATE POLICY "Allow authenticated users to upload lab reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'labs'
  AND auth.role() = 'authenticated'
  -- Only allow PDFs
  AND storage.extension(name) = 'pdf'
  -- Ensure users can only upload to their own directory
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own lab reports
CREATE POLICY "Allow users to delete their own lab reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'labs'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
