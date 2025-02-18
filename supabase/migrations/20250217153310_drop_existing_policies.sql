-- Drop existing policies
DROP POLICY IF EXISTS "Patients can view their own lab reports" ON lab_reports;
DROP POLICY IF EXISTS "Providers can view their patients' lab reports" ON lab_reports;
DROP POLICY IF EXISTS "Patients can insert their own lab reports" ON lab_reports;
DROP POLICY IF EXISTS "Providers can insert lab reports" ON lab_reports;

DROP POLICY IF EXISTS "Patients can view sections of their lab reports" ON lab_sections;
DROP POLICY IF EXISTS "Providers can view sections of their patients' lab reports" ON lab_sections;

DROP POLICY IF EXISTS "Patients can view results of their lab reports" ON lab_results;
DROP POLICY IF EXISTS "Providers can view results of their patients' lab reports" ON lab_results;

DROP POLICY IF EXISTS "Anyone can view test types" ON test_types;
DROP POLICY IF EXISTS "Only providers can insert test types" ON test_types;

DROP POLICY IF EXISTS "Providers can view their patients" ON patient_providers;

DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow providers to read patient PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own PDFs" ON storage.objects;

-- Drop existing tables
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS lab_sections CASCADE;
DROP TABLE IF EXISTS lab_reports CASCADE;
DROP TABLE IF EXISTS test_types CASCADE;
DROP TABLE IF EXISTS patient_providers CASCADE;
