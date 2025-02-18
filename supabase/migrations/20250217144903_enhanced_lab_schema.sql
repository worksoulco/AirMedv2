-- Create enum for result status
CREATE TYPE public.lab_result_status AS ENUM ('normal', 'high', 'low');

-- Create lab reports table
CREATE TABLE IF NOT EXISTS public.lab_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  specimen_id text,
  collection_date timestamptz NOT NULL,
  report_date timestamptz NOT NULL DEFAULT now(),
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lab sections table
CREATE TABLE IF NOT EXISTS public.lab_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES public.lab_reports(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('table', 'text')),
  content text, -- For text-type sections
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lab results table (for table-type sections)
CREATE TABLE IF NOT EXISTS public.lab_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id uuid REFERENCES public.lab_sections(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  current_result text NOT NULL,
  flag lab_result_status,
  previous_result text,
  previous_date timestamptz,
  units text,
  reference_interval text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create test types catalog
CREATE TABLE IF NOT EXISTS public.test_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  default_units text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;

-- Create policies for lab reports
CREATE POLICY "lab_reports_self_access"
ON public.lab_reports
FOR ALL
USING (
  auth.uid() = patient_id
)
WITH CHECK (
  auth.uid() = patient_id
);

CREATE POLICY "lab_reports_provider_access"
ON public.lab_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = lab_reports.patient_id
    AND status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patient_providers
    WHERE provider_id = auth.uid()
    AND patient_id = lab_reports.patient_id
    AND status = 'active'
  )
);

-- Create policies for lab sections
CREATE POLICY "lab_sections_self_access"
ON public.lab_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lab_reports
    WHERE lab_reports.id = lab_sections.report_id
    AND lab_reports.patient_id = auth.uid()
  )
);

CREATE POLICY "lab_sections_provider_access"
ON public.lab_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lab_reports
    JOIN public.patient_providers ON lab_reports.patient_id = patient_providers.patient_id
    WHERE lab_reports.id = lab_sections.report_id
    AND patient_providers.provider_id = auth.uid()
    AND patient_providers.status = 'active'
  )
);

-- Create policies for lab results
CREATE POLICY "lab_results_self_access"
ON public.lab_results
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lab_sections
    JOIN public.lab_reports ON lab_sections.report_id = lab_reports.id
    WHERE lab_sections.id = lab_results.section_id
    AND lab_reports.patient_id = auth.uid()
  )
);

CREATE POLICY "lab_results_provider_access"
ON public.lab_results
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lab_sections
    JOIN public.lab_reports ON lab_sections.report_id = lab_reports.id
    JOIN public.patient_providers ON lab_reports.patient_id = patient_providers.patient_id
    WHERE lab_sections.id = lab_results.section_id
    AND patient_providers.provider_id = auth.uid()
    AND patient_providers.status = 'active'
  )
);

-- Create policies for test types
CREATE POLICY "test_types_read_access"
ON public.test_types
FOR SELECT
USING (true);

CREATE POLICY "test_types_modify_access"
ON public.test_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = users.id
    AND users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Add indexes for better query performance
CREATE INDEX idx_lab_reports_patient_date ON public.lab_reports(patient_id, collection_date DESC);
CREATE INDEX idx_lab_reports_provider ON public.lab_reports(provider_id);
CREATE INDEX idx_lab_sections_report ON public.lab_sections(report_id);
CREATE INDEX idx_lab_results_section ON public.lab_results(section_id);
CREATE INDEX idx_lab_results_test_name ON public.lab_results(test_name);
CREATE INDEX idx_test_types_category ON public.test_types(category);

-- Add triggers for updated_at
CREATE TRIGGER set_lab_reports_timestamp
  BEFORE UPDATE ON public.lab_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_lab_sections_timestamp
  BEFORE UPDATE ON public.lab_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_lab_results_timestamp
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_test_types_timestamp
  BEFORE UPDATE ON public.test_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.lab_reports TO authenticated;
GRANT ALL ON public.lab_sections TO authenticated;
GRANT ALL ON public.lab_results TO authenticated;
GRANT SELECT ON public.test_types TO authenticated;
