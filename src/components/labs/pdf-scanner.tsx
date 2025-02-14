import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { BiomarkerData } from '@/types/provider';
import { getCurrentUser } from '@/lib/auth';

interface PDFScannerProps {
  onScanComplete: (data: BiomarkerData[]) => void;
}

// Initialize PDF.js worker with proper path
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.js';

export function PDFScanner({ onScanComplete }: PDFScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const processPDF = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Validate file type
      if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are supported');
      }

      setProgress(10);

      // Load the PDF document with proper error handling
      const loadingTask = pdfjsLib.getDocument({
        data: await file.arrayBuffer(),
        verbosity: 0, // Reduce console noise
        disableFontFace: true, // Improve performance
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      // Add error handler for the loading task
      loadingTask.onPassword = () => {
        throw new Error('Password-protected PDFs are not supported');
      };

      setProgress(30);

      const pdf = await loadingTask.promise;
      
      setProgress(50);

      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((item: any) => item.str).join(' ');
        setProgress(50 + Math.floor((i / pdf.numPages) * 30));
      }

      setProgress(85);

      // Process the text to find lab results
      const biomarkers: BiomarkerData[] = [];

      // Common patterns for lab values with variations in formatting
      const patterns = [
        // CBC
        {
          name: 'White Blood Cell Count',
          pattern: /(?:WBC|White Blood Cell|White Blood Cells|Leukocytes)[\s:]*(\d+\.?\d*)\s*(?:K\/[μµ]L|10\^3\/[μµ]L)/i,
          unit: 'K/µL',
          range: '4.5-11.0',
          category: 'CBC'
        },
        {
          name: 'Red Blood Cell Count',
          pattern: /(?:RBC|Red Blood Cell|Red Blood Cells|Erythrocytes)[\s:]*(\d+\.?\d*)\s*(?:M\/[μµ]L|10\^6\/[μµ]L)/i,
          unit: 'M/µL',
          range: '4.2-5.8',
          category: 'CBC'
        },
        {
          name: 'Hemoglobin',
          pattern: /(?:HGB|HB|Hemoglobin|Haemoglobin)[\s:]*(\d+\.?\d*)\s*(?:g\/dL|g\/L)/i,
          unit: 'g/dL',
          range: '12.0-15.5',
          category: 'CBC'
        },
        {
          name: 'Hematocrit',
          pattern: /(?:HCT|Hematocrit|Haematocrit|PCV)[\s:]*(\d+\.?\d*)\s*(?:%|L\/L)/i,
          unit: '%',
          range: '36-46',
          category: 'CBC'
        },
        {
          name: 'Platelet Count',
          pattern: /(?:PLT|Platelets|Thrombocytes)[\s:]*(\d+)\s*(?:K\/[μµ]L|10\^3\/[μµ]L)/i,
          unit: 'K/µL',
          range: '150-450',
          category: 'CBC'
        },
        
        // Basic Metabolic Panel
        {
          name: 'Glucose',
          pattern: /(?:Glucose|GLU|FBS|Blood Sugar)[\s:]*(\d+)\s*(?:mg\/dL|mmol\/L)/i,
          unit: 'mg/dL',
          range: '70-100',
          category: 'Metabolic'
        },
        {
          name: 'BUN',
          pattern: /(?:BUN|Blood Urea Nitrogen|Urea)[\s:]*(\d+)\s*(?:mg\/dL|mmol\/L)/i,
          unit: 'mg/dL',
          range: '7-20',
          category: 'Metabolic'
        },
        {
          name: 'Creatinine',
          pattern: /(?:Creatinine|CREA)[\s:]*(\d+\.?\d*)\s*(?:mg\/dL|[μµ]mol\/L)/i,
          unit: 'mg/dL',
          range: '0.6-1.2',
          category: 'Metabolic'
        },
        {
          name: 'Sodium',
          pattern: /(?:Sodium|Na\+?)[\s:]*(\d+)\s*(?:mEq\/L|mmol\/L)/i,
          unit: 'mEq/L',
          range: '135-145',
          category: 'Metabolic'
        },
        {
          name: 'Potassium',
          pattern: /(?:Potassium|K\+?)[\s:]*(\d+\.?\d*)\s*(?:mEq\/L|mmol\/L)/i,
          unit: 'mEq/L',
          range: '3.5-5.0',
          category: 'Metabolic'
        },
        {
          name: 'Chloride',
          pattern: /(?:Chloride|Cl\-?)[\s:]*(\d+)\s*(?:mEq\/L|mmol\/L)/i,
          unit: 'mEq/L',
          range: '98-108',
          category: 'Metabolic'
        },
        {
          name: 'CO2',
          pattern: /(?:CO2|Carbon Dioxide|Bicarbonate|HCO3)[\s:]*(\d+)\s*(?:mEq\/L|mmol\/L)/i,
          unit: 'mEq/L',
          range: '23-29',
          category: 'Metabolic'
        },
        
        // Lipid Panel
        {
          name: 'Total Cholesterol',
          pattern: /(?:Total Cholesterol|Cholesterol|CHOL)[\s:]*(\d+)\s*(?:mg\/dL|mmol\/L)/i,
          unit: 'mg/dL',
          range: '125-200',
          category: 'Lipids'
        },
        {
          name: 'Triglycerides',
          pattern: /(?:Triglycerides|TRIG)[\s:]*(\d+)\s*(?:mg\/dL|mmol\/L)/i,
          unit: 'mg/dL',
          range: '0-150',
          category: 'Lipids'
        },
        {
          name: 'HDL Cholesterol',
          pattern: /(?:HDL|HDL-C|HDL Cholesterol)[\s:]*(\d+)\s*(?:mg\/dL|mmol\/L)/i,
          unit: 'mg/dL',
          range: '40-60',
          category: 'Lipids'
        },
        {
          name: 'LDL Cholesterol',
          pattern: /(?:LDL|LDL-C|LDL Cholesterol)[\s:]*(\d+)\s*(?:mg\/dL|mmol\/L)/i,
          unit: 'mg/dL',
          range: '0-100',
          category: 'Lipids'
        }
      ];

      setProgress(90);

      // Process each pattern
      for (const { name, pattern, unit, range, category } of patterns) {
        const match = extractedText.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            const [min, max] = range.split('-').map(Number);
            let status: BiomarkerData['status'] = 'normal';
            if (value < min) status = 'low';
            if (value > max) status = 'high';

            const user = getCurrentUser();
            if (!user) {
              throw new Error('User not authenticated');
            }

            biomarkers.push({
              name,
              value,
              unit,
              referenceRange: range,
              status,
              category,
              date: new Date().toISOString(),
              metadata: {
                method: 'PDF Scan',
                performer: user.role === 'provider' ? user.userData.name : 'Lab Report'
              }
            });
          }
        }
      }

      if (biomarkers.length === 0) {
        throw new Error('No lab results found in this PDF. Please ensure this is a valid lab report.');
      }

      // Sort biomarkers by category and name
      biomarkers.sort((a, b) => {
        if (a.category === b.category) {
          return a.name.localeCompare(b.name);
        }
        return a.category.localeCompare(b.category);
      });

      setProgress(100);
      onScanComplete(biomarkers);
    } catch (err) {
      console.error('PDF processing error:', err);
      const message = err instanceof Error 
        ? err.message 
        : 'Failed to process the PDF. Please ensure the file is not corrupted and try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processPDF(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
          ${isProcessing && 'opacity-50 cursor-not-allowed'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <FileUp className="h-8 w-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? 'Drop your lab results PDF here' : 'Drag & drop your lab results PDF'}
            </p>
            <p className="text-xs text-gray-500">
              {!isProcessing && 'or click to select a file'}
            </p>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing PDF...
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-500">
            {progress < 30 && 'Loading PDF...'}
            {progress >= 30 && progress < 50 && 'Extracting text...'}
            {progress >= 50 && progress < 85 && 'Processing pages...'}
            {progress >= 85 && progress < 95 && 'Analyzing lab results...'}
            {progress >= 95 && 'Finalizing...'}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Error processing PDF</p>
              <p className="mt-1">{error}</p>
              {error.includes('Password-protected') && (
                <p className="mt-2">Please remove the password protection from your PDF and try again.</p>
              )}
              {error.includes('No lab results found') && (
                <p className="mt-2">Make sure you're uploading a lab report PDF that contains test results.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}