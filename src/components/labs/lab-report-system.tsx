import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KNOWN_SECTIONS, type ParsedSection, type LabReportData, type LabResultStatus } from '@/types/labs';

interface LabReportSystemProps {
  onParseComplete: (data: LabReportData) => void;
}

interface LabReportSystemRenderProps {
  renderSection: (name: string, data: ParsedSection) => JSX.Element;
  parseLabReport: (text: string) => Promise<LabReportData>;
  error: string | null;
}

export function LabReportSystem({ 
  onParseComplete, 
  children 
}: LabReportSystemProps & { 
  children?: (props: LabReportSystemRenderProps) => React.ReactNode 
}) {
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, ParsedSection>>({});


  const findNextSection = (text: string, startPos: number) => {
    let earliestSection = null;
    let earliestPos = text.length;

    for (const section of KNOWN_SECTIONS) {
      const pos = text.indexOf(section, startPos);
      if (pos !== -1 && pos < earliestPos) {
        earliestPos = pos;
        earliestSection = {
          name: section,
          startIndex: pos,
          endIndex: text.length // Will be updated
        };
      }
    }

    if (earliestSection) {
      // Find the start of the next section
      const nextSectionStart = KNOWN_SECTIONS.reduce((earliest, section) => {
        const pos = text.indexOf(section, earliestPos + 1);
        return pos !== -1 && pos < earliest ? pos : earliest;
      }, text.length);

      earliestSection.endIndex = nextSectionStart;
    }

    return earliestSection;
  };

  const parseSection = (text: string, sectionInfo: { name: string; startIndex: number; endIndex: number }): ParsedSection | null => {
    const sectionText = text.substring(sectionInfo.startIndex, sectionInfo.endIndex).trim();
    const lines = sectionText.split('\n').filter(line => line.trim());

    // Find the header row
    const headerIndex = lines.findIndex(line => 
      line.includes('Test') && 
      (line.includes('Result') || line.includes('Value') || line.includes('Units') || line.includes('Reference'))
    );

    if (headerIndex === -1) {
      return {
        type: 'text',
        name: sectionInfo.name,
        content: sectionText
      };
    }

    const results = lines.slice(headerIndex + 1)
      .filter(line => line.trim() && !line.toLowerCase().includes('previous results'))
      .map(line => {
        const parts = line.split(/\s+/).filter(Boolean);
        
        // Extract test name (may contain spaces)
        const testNameEndIndex = parts.findIndex(part => /^[\d.]+$/.test(part));
        const testName = parts.slice(0, testNameEndIndex).join(' ');
        
        // Extract current result and flag
        const currentResult = parts[testNameEndIndex];
        let flag: LabResultStatus | undefined;
        let currentIndex = testNameEndIndex + 1;
        
        if (parts[currentIndex]?.match(/^(H|L|HIGH|LOW)$/i)) {
          flag = parts[currentIndex].toLowerCase().startsWith('h') ? 'high' : 'low';
          currentIndex++;
        }

        // Look for previous result and date
        let previousResult: string | undefined;
        let previousDate: string | undefined;
        const dateIndex = parts.findIndex((part, i) => i > currentIndex && /\d{1,2}\/\d{1,2}\/\d{4}/.test(part));
        
        if (dateIndex !== -1) {
          previousResult = parts[dateIndex - 1];
          previousDate = new Date(parts[dateIndex]).toISOString();
          currentIndex = dateIndex + 1;
        }

        // Extract units and reference interval
        let units: string | undefined;
        let referenceInterval: string | undefined;

        if (currentIndex < parts.length) {
          units = parts[currentIndex];
          currentIndex++;
          
          if (currentIndex < parts.length) {
            referenceInterval = parts.slice(currentIndex).join(' ');
          }
        }

        return {
          testName,
          currentResult,
          flag,
          previousResult,
          previousDate,
          units,
          referenceInterval
        };
      });

    return {
      type: 'table',
      name: sectionInfo.name,
      results
    };
  };

  const renderSection = (name: string, data: ParsedSection) => {
    if (data.type === 'text') {
      return (
        <Card key={name} className="mb-4">
          <CardHeader>
            <CardTitle>{name}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{data.content}</pre>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={name} className="mb-4">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left border">Test</th>
                  <th className="p-2 text-left border">Current Result</th>
                  <th className="p-2 text-left border">Flag</th>
                  <th className="p-2 text-left border">Previous Result</th>
                  <th className="p-2 text-left border">Previous Date</th>
                  <th className="p-2 text-left border">Units</th>
                  <th className="p-2 text-left border">Reference Interval</th>
                </tr>
              </thead>
              <tbody>
                {data.results?.map((result, index) => (
                  <tr 
                    key={index}
                    className={`${result.flag ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="p-2 border">{result.testName}</td>
                    <td className="p-2 border font-medium">{result.currentResult}</td>
                    <td className={`p-2 border ${
                      result.flag === 'high' ? 'text-red-600' :
                      result.flag === 'low' ? 'text-yellow-600' :
                      ''
                    }`}>
                      {result.flag ? result.flag.toUpperCase() : '-'}
                    </td>
                    <td className="p-2 border">{result.previousResult || '-'}</td>
                    <td className="p-2 border">
                      {result.previousDate 
                        ? new Date(result.previousDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-2 border">{result.units || '-'}</td>
                    <td className="p-2 border">{result.referenceInterval || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const parseLabReport = useCallback(async (text: string): Promise<LabReportData> => {
    try {
      const sections: Record<string, ParsedSection> = {};
      let currentPosition = 0;
      let specimenId: string | undefined;
      let collectionDate: string | undefined;

      // Extract specimen ID and collection date
      const specimenMatch = text.match(/(?:Specimen|Sample)\s+ID:\s*([A-Za-z0-9-]+)/i);
      if (specimenMatch) {
        specimenId = specimenMatch[1];
      }

      const dateMatch = text.match(/(?:Collection|Drawn|Sample)\s+Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (dateMatch) {
        collectionDate = new Date(dateMatch[1]).toISOString();
      }

      // Find and parse each section
      while (currentPosition < text.length) {
        const nextSection = findNextSection(text, currentPosition);
        if (!nextSection) break;

        const sectionData = parseSection(text, nextSection);
        if (sectionData) {
          sections[nextSection.name] = sectionData;
        }
        
        currentPosition = nextSection.endIndex;
      }

      if (!collectionDate) {
        collectionDate = new Date().toISOString();
      }

      const reportData: LabReportData = {
        specimenId,
        collectionDate,
        sections
      };

      setSections(sections);
      onParseComplete(reportData);
      return reportData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error parsing lab report';
      setError(message);
      throw err;
    }
  }, [onParseComplete]);

  if (children) {
    return <>{children({ renderSection, parseLabReport, error })}</>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        {Object.entries(sections).map(([name, data]) => 
          renderSection(name, data)
        )}
      </div>
    </div>
  );
}
