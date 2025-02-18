-- Create lab reports table
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

-- Create lab sections table
CREATE TABLE IF NOT EXISTS lab_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES lab_reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'table')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create lab results table
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

-- Create test types catalog
CREATE TABLE IF NOT EXISTS test_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  default_units TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_types ENABLE ROW LEVEL SECURITY;

-- Create policies for lab_reports
CREATE POLICY "Users can view their own lab reports"
  ON lab_reports FOR SELECT
  USING (patient_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Users can insert their own lab reports"
  ON lab_reports FOR INSERT
  WITH CHECK (patient_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Users can update their own lab reports"
  ON lab_reports FOR UPDATE
  USING (patient_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Users can delete their own lab reports"
  ON lab_reports FOR DELETE
  USING (patient_id = auth.uid() OR provider_id = auth.uid());

-- Create policies for lab_sections
CREATE POLICY "Users can view sections of their lab reports"
  ON lab_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND (lab_reports.patient_id = auth.uid() OR lab_reports.provider_id = auth.uid())
  ));

CREATE POLICY "Users can insert sections to their lab reports"
  ON lab_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND (lab_reports.patient_id = auth.uid() OR lab_reports.provider_id = auth.uid())
  ));

-- Create policies for lab_results
CREATE POLICY "Users can view results of their lab reports"
  ON lab_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = lab_results.section_id
    AND (lab_reports.patient_id = auth.uid() OR lab_reports.provider_id = auth.uid())
  ));

CREATE POLICY "Users can insert results to their lab reports"
  ON lab_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM lab_sections
    JOIN lab_reports ON lab_reports.id = lab_sections.report_id
    WHERE lab_sections.id = lab_results.section_id
    AND (lab_reports.patient_id = auth.uid() OR lab_reports.provider_id = auth.uid())
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
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'provider'
  ));
