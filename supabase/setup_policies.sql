-- Create policies for lab_reports
CREATE POLICY "Patients can view their own lab reports"
  ON lab_reports FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Providers can view their patients' lab reports"
  ON lab_reports FOR SELECT
  USING (provider_id = auth.uid() OR EXISTS (
    SELECT 1 FROM patient_providers
    WHERE patient_providers.provider_id = auth.uid()
    AND patient_providers.patient_id = lab_reports.patient_id
    AND patient_providers.status = 'active'
  ));

CREATE POLICY "Patients can insert their own lab reports"
  ON lab_reports FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Providers can insert lab reports"
  ON lab_reports FOR INSERT
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Patients can update their own lab reports"
  ON lab_reports FOR UPDATE
  USING (patient_id = auth.uid());

CREATE POLICY "Providers can update their patients' lab reports"
  ON lab_reports FOR UPDATE
  USING (provider_id = auth.uid() OR EXISTS (
    SELECT 1 FROM patient_providers
    WHERE patient_providers.provider_id = auth.uid()
    AND patient_providers.patient_id = lab_reports.patient_id
    AND patient_providers.status = 'active'
  ));

CREATE POLICY "Patients can delete their own lab reports"
  ON lab_reports FOR DELETE
  USING (patient_id = auth.uid());

CREATE POLICY "Providers can delete their patients' lab reports"
  ON lab_reports FOR DELETE
  USING (provider_id = auth.uid() OR EXISTS (
    SELECT 1 FROM patient_providers
    WHERE patient_providers.provider_id = auth.uid()
    AND patient_providers.patient_id = lab_reports.patient_id
    AND patient_providers.status = 'active'
  ));

-- Create policies for lab_sections
CREATE POLICY "Patients can view sections of their lab reports"
  ON lab_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND lab_reports.patient_id = auth.uid()
  ));

CREATE POLICY "Providers can view sections of their patients' lab reports"
  ON lab_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND (lab_reports.provider_id = auth.uid() OR EXISTS (
      SELECT 1 FROM patient_providers
      WHERE patient_providers.provider_id = auth.uid()
      AND patient_providers.patient_id = lab_reports.patient_id
      AND patient_providers.status = 'active'
    ))
  ));

CREATE POLICY "Patients can insert sections to their lab reports"
  ON lab_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND lab_reports.patient_id = auth.uid()
  ));

CREATE POLICY "Providers can insert sections to their patients' lab reports"
  ON lab_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND (lab_reports.provider_id = auth.uid() OR EXISTS (
      SELECT 1 FROM patient_providers
      WHERE patient_providers.provider_id = auth.uid()
      AND patient_providers.patient_id = lab_reports.patient_id
      AND patient_providers.status = 'active'
    ))
  ));

-- Create policies for lab_results
CREATE POLICY "Patients can view results of their lab reports"
  ON lab_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = lab_results.section_id
    AND lab_reports.patient_id = auth.uid()
  ));

CREATE POLICY "Providers can view results of their patients' lab reports"
  ON lab_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = lab_results.section_id
    AND (lab_reports.provider_id = auth.uid() OR EXISTS (
      SELECT 1 FROM patient_providers
      WHERE patient_providers.provider_id = auth.uid()
      AND patient_providers.patient_id = lab_reports.patient_id
      AND patient_providers.status = 'active'
    ))
  ));

CREATE POLICY "Patients can insert results to their lab reports"
  ON lab_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = lab_results.section_id
    AND lab_reports.patient_id = auth.uid()
  ));

CREATE POLICY "Providers can insert results to their patients' lab reports"
  ON lab_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = lab_results.section_id
    AND (lab_reports.provider_id = auth.uid() OR EXISTS (
      SELECT 1 FROM patient_providers
      WHERE patient_providers.provider_id = auth.uid()
      AND patient_providers.patient_id = lab_reports.patient_id
      AND patient_providers.status = 'active'
    ))
  ));

-- Create policies for test_types
CREATE POLICY "Anyone can view test types"
  ON test_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only providers can insert test types"
  ON test_types FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'provider'
  ));

-- Create policies for patient_providers
CREATE POLICY "Providers can view their patients"
  ON patient_providers FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Create storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow providers to read patient PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own PDFs" ON storage.objects;

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
    SELECT 1 FROM patient_providers
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
