import { useState, useEffect, lazy } from 'react';
import { Activity, ChevronRight, FileText, Plus, Search, Filter, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { LazyComponent } from '../common/LazyComponent';
const PDFScanner = lazy(() => import('./pdf-scanner'));
import { LabReportSystem } from './lab-report-system';
import type { LabReport, LabSection, LabResult, LabReportData } from '@/types/labs';
import { loadLabReports, subscribeToLabUpdates, saveLabReport } from '@/lib/labs';
import { getCurrentUser } from '@/lib/auth';

function LabsPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();

  // Load data on mount and when localStorage changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await loadLabReports(user?.id || '');
        setReports(data);
        
        // Extract unique categories from all sections
        const uniqueCategories = Array.from(new Set(
          data.flatMap(report => 
            report.sections.map(section => section.name)
          )
        )).sort();
        setCategories(uniqueCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lab results');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToLabUpdates(user?.id || '');

    // Listen for lab updates
    const handleLabUpdate = () => loadData();
    window.addEventListener('labUpdate', handleLabUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('labUpdate', handleLabUpdate);
    };
  }, [user?.id]);

  const handleScanComplete = async (reportData: LabReportData, file: File) => {
    try {
      // Save results and PDF to Supabase
      await saveLabReport(reportData, file);
      setShowScanner(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lab results');
    }
  };

  // Filter sections based on search and category
  const filteredSections = reports.flatMap(report => 
    report.sections.filter(section => {
      const matchesCategory = selectedCategory === 'all' || section.name === selectedCategory;
      if (!matchesCategory) return false;

      if (section.type === 'text') {
        return section.content?.toLowerCase().includes(searchQuery.toLowerCase());
      }

      return section.results?.some(result =>
        result.testName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }).map(section => ({
      ...section,
      reportId: report.id,
      reportDate: report.collectionDate,
      pdfUrl: report.pdfUrl
    }))
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-600">Loading lab results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl">Lab Results</h1>
            <p className="text-lg text-gray-600">Track your biomarkers</p>
          </div>
          <div className="relative">
            <Button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Results
            </Button>

            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowAddMenu(false);
                      setShowScanner(true);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Upload PDF
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowAddMenu(false);
                      // Handle manual entry
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Manually
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search lab results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
            >
              All Results
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* PDF Scanner */}
        {showScanner && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Upload Lab Results</h2>
                  <p className="text-sm text-gray-500">Scan your PDF lab results</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <LazyComponent>
                <PDFScanner onScanComplete={handleScanComplete} />
              </LazyComponent>
              <Button
                variant="outline"
                onClick={() => setShowScanner(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Lab Results */}
        <div className="space-y-6">
          {filteredSections.map((section) => (
            <div key={`${section.reportId}-${section.id}`}>
              <LabReportSystem 
                onParseComplete={() => {}} // Not used in render mode
                key={`${section.reportId}-${section.id}`}
              >
                {({ renderSection }) => renderSection(section.name, section)}
              </LabReportSystem>
              {section.pdfUrl && (
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(section.pdfUrl, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View Full Report
                  </Button>
                </div>
              )}
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="rounded-xl bg-white p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 font-medium text-gray-900">No lab results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? "No lab results match your search criteria"
                  : "Start by uploading your lab results"}
              </p>
              <Button
                onClick={() => setShowScanner(true)}
                className="mt-4"
              >
                Upload Results
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LabsPage;
