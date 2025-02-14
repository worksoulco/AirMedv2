import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create public/pdf directory if it doesn't exist
const pdfDir = join(__dirname, '../public/pdf');
mkdirSync(pdfDir, { recursive: true });

// Copy PDF.js worker from node_modules to public directory
const workerSrc = join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js');
const workerDest = join(pdfDir, 'pdf.worker.min.js');

try {
  copyFileSync(workerSrc, workerDest);
  console.log('PDF.js worker file copied successfully');
} catch (error) {
  console.error('Error copying PDF.js worker file:', error);
  process.exit(1);
}