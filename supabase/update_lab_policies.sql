-- Drop existing policies
DROP POLICY IF EXISTS "Patients can insert sections for their lab reports" ON lab_sections;
DROP POLICY IF EXISTS "Providers can insert sections for their lab reports" ON lab_sections;
DROP POLICY IF EXISTS "Patients can insert results for their lab reports" ON lab_results;
DROP POLICY IF EXISTS "Providers can insert results for their lab reports" ON lab_results;

-- Lab Sections INSERT policies
CREATE POLICY "Patients can insert sections for their lab reports"
  ON lab_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = report_id
    AND lab_reports.patient_id = auth.uid()
  ));

CREATE POLICY "Providers can insert sections for their lab reports"
  ON lab_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = report_id
    AND (lab_reports.provider_id = auth.uid() OR EXISTS (
      SELECT 1 FROM patient_providers
      WHERE patient_providers.provider_id = auth.uid()
      AND patient_providers.patient_id = lab_reports.patient_id
      AND patient_providers.status = 'active'
    ))
  ));

-- Lab Results INSERT policies
CREATE POLICY "Patients can insert results for their lab reports"
  ON lab_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = section_id
    AND lab_reports.patient_id = auth.uid()
  ));

CREATE POLICY "Providers can insert results for their lab reports"
  ON lab_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = section_id
    AND (lab_reports.provider_id = auth.uid() OR EXISTS (
      SELECT 1 FROM patient_providers
      WHERE patient_providers.provider_id = auth.uid()
      AND patient_providers.patient_id = lab_reports.patient_id
      AND patient_providers.status = 'active'
    ))
  ));
