export type LabResultStatus = 'normal' | 'high' | 'low';

export interface LabReport {
  id: string;
  patientId: string;
  providerId?: string;
  specimenId?: string;
  collectionDate: string;
  reportDate: string;
  pdfUrl?: string;
  sections: LabSection[];
  createdAt: string;
  updatedAt: string;
}

export interface LabSection {
  id: string;
  reportId: string;
  name: string;
  type: 'table' | 'text';
  content?: string; // For text-type sections
  results?: LabResult[]; // For table-type sections
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  id: string;
  sectionId: string;
  testName: string;
  currentResult: string;
  flag?: LabResultStatus;
  previousResult?: string;
  previousDate?: string;
  units?: string;
  referenceInterval?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TestType {
  id: string;
  name: string;
  category: string;
  defaultUnits?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Parser types
export interface ParsedSection {
  type: 'table' | 'text';
  name: string;
  content?: string;
  results?: ParsedResult[];
}

export interface ParsedResult {
  testName: string;
  currentResult: string;
  flag?: LabResultStatus;
  previousResult?: string;
  previousDate?: string;
  units?: string;
  referenceInterval?: string;
}

export interface LabReportData {
  specimenId?: string;
  collectionDate: string;
  sections: Record<string, ParsedSection>;
}

// Known section identifiers
export const KNOWN_SECTIONS = [
  'CBC With Differential/Platelet',
  'Comp. Metabolic Panel (14)',
  'Lipid Panel',
  'Testosterone',
  'Iron',
  'Ferritin',
  'Apolipoprotein B',
  'Hemoglobin A1C',
  'Thyroid Panel',
  'Vitamin D',
  'Vitamin B12',
  'Folate',
  'PSA',
  'CRP',
  'ESR',
  'Urinalysis',
  'Microalbumin',
  'Magnesium',
  'Phosphorus',
  'Uric Acid'
] as const;

export type KnownSection = typeof KNOWN_SECTIONS[number];

// Helper type to check if a section is known
export const isKnownSection = (section: string): section is KnownSection => {
  return KNOWN_SECTIONS.includes(section as KnownSection);
};

// Database types for Supabase
export type Tables = {
  lab_reports: LabReport;
  lab_sections: LabSection;
  lab_results: LabResult;
  test_types: TestType;
};
