import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { LabReportSystem } from './lab-report-system';
import type { LabReportData } from '@/types/labs';
import { getCurrentUser } from '@/lib/auth';

interface PDFScannerProps {
  onScanComplete: (data: LabReportData, file: File) => void;
}

// Initialize PDF.js worker with proper path
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.js';

function PDFScanner({ onScanComplete }: PDFScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const parseLabReportRef = React.useRef<((text: string) => Promise<LabReportData>) | null>(null);

  const labSystem = (
    <LabReportSystem onParseComplete={(data) => {
      if (currentFile) {
        onScanComplete(data, currentFile);
      }
    }}>
      {({ parseLabReport }) => {
        parseLabReportRef.current = parseLabReport;
        return null;
      }}
    </LabReportSystem>
  );

  const processPDF = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setCurrentFile(file);

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

      // Parse the lab report
      if (parseLabReportRef.current) {
        await parseLabReportRef.current(extractedText);
      } else {
        throw new Error('Lab report parser not initialized');
      }
      setProgress(100);
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
    <>
      {labSystem}
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
    </>
  );
}

export default PDFScanner;
