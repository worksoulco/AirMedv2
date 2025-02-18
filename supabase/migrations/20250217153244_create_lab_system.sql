-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES auth.users(id),
  provider_id UUID REFERENCES auth.users(id),
  specimen_id TEXT,
  collection_date TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES lab_reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'table')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES lab_sections(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  current_result TEXT NOT NULL,
  flag TEXT CHECK (flag IN ('high', 'low')),
  previous_result TEXT,
  previous_date TIMESTAMP WITH TIME ZONE,
  units TEXT,
  reference_interval TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  default_units TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES auth.users(id),
  provider_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(patient_id, provider_id)
);

-- Enable RLS
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_providers ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Lab Reports
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

-- Lab Sections
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

-- Lab Results
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

-- Test Types
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

-- Patient Providers
CREATE POLICY "Providers can view their patients"
  ON patient_providers FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Storage Policies
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
