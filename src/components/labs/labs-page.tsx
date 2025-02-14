import { useState, useEffect } from 'react';
import { Activity, ChevronRight, FileText, Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { PDFScanner } from './pdf-scanner';
import { BiomarkerData } from '@/types/provider';
import { loadLabs, subscribeToLabUpdates } from '@/lib/labs';
import { getCurrentUser } from '@/lib/auth';

export function LabsPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [biomarkers, setBiomarkers] = useState<BiomarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();

  // Load data on mount and when localStorage changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await loadLabs(user?.id || '');
        setBiomarkers(data);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map(b => b.category))).sort();
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

  const handleScanComplete = async (results: BiomarkerData[]) => {
    try {
      // Results will be automatically saved through the lab service
      setBiomarkers(prev => [...results, ...prev]);
      setShowScanner(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lab results');
    }
  };

  // Filter biomarkers based on search and category
  const filteredBiomarkers = biomarkers.filter(biomarker => {
    const matchesSearch = biomarker.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || biomarker.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      <div className="mx-auto max-w-3xl">
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
              placeholder="Search biomarkers..."
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
              <PDFScanner onScanComplete={handleScanComplete} />
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

        {/* Biomarkers List */}
        <div className="space-y-6">
          {Object.entries(
            filteredBiomarkers.reduce((acc, biomarker) => {
              if (!acc[biomarker.category]) {
                acc[biomarker.category] = [];
              }
              acc[biomarker.category].push(biomarker);
              return acc;
            }, {} as Record<string, BiomarkerData[]>)
          ).map(([category, markers]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
              <div className="grid gap-4">
                {markers.map((biomarker) => (
                  <div
                    key={`${biomarker.name}-${biomarker.date}`}
                    className="rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{biomarker.name}</h3>
                      <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                        biomarker.status === 'normal' ? 'bg-green-100 text-green-700' :
                        biomarker.status === 'high' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {biomarker.status.charAt(0).toUpperCase() + biomarker.status.slice(1)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-2xl font-semibold text-gray-900">
                          {biomarker.value} <span className="text-sm text-gray-500">{biomarker.unit}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Range: {biomarker.referenceRange} {biomarker.unit}
                        </p>
                      </div>
                      <div className={`h-full w-1 rounded-full ${
                        biomarker.status === 'normal' ? 'bg-green-500' :
                        biomarker.status === 'high' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                    </div>
                    {biomarker.metadata && (
                      <div className="mt-2 text-xs text-gray-500">
                        {biomarker.metadata.method && (
                          <p>Method: {biomarker.metadata.method}</p>
                        )}
                        {biomarker.metadata.performer && (
                          <p>Performed by: {biomarker.metadata.performer}</p>
                        )}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(biomarker.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredBiomarkers.length === 0 && (
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