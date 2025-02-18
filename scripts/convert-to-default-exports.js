#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of components to convert
const componentsToConvert = [
  'src/components/analytics/analytics-page.tsx',
  'src/components/chat/chat-page.tsx',
  'src/components/protocols/protocol-history.tsx',
  'src/components/profile/profile-page.tsx',
  'src/components/profile/settings-page.tsx',
  'src/components/help/help-page.tsx',
  'src/components/provider/ProviderDashboard.tsx',
  'src/components/provider/PatientList.tsx',
  'src/components/provider/PatientDetail.tsx',
  'src/components/provider/NotesPage.tsx',
  'src/components/provider/messaging/MessagingPage.tsx',
  'src/components/provider/InvitePatientModal.tsx',
  'src/components/tracking/food-journal.tsx'
];

function convertToDefaultExport(filePath) {
  const fullPath = resolve(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = readFileSync(fullPath, 'utf8');
  
  // Extract the component name from the file path
  const componentName = basename(filePath, '.tsx')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Replace named export with default export
  const namedExportRegex = new RegExp(`export function ${componentName}`, 'g');
  if (namedExportRegex.test(content)) {
    content = content.replace(namedExportRegex, `function ${componentName}`);
    
    // Add default export at the end if it doesn't exist
    if (!content.includes('export default')) {
      content = content.trim() + `\n\nexport default ${componentName};\n`;
    }
    
    writeFileSync(fullPath, content);
    console.log(`Converted ${filePath} to use default export`);
  } else {
    console.log(`No named export found in ${filePath}`);
  }
}

// Convert each component
componentsToConvert.forEach(convertToDefaultExport);
