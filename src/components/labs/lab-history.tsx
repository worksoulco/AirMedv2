import { useState } from 'react';
import { Activity, ArrowLeft, Search, Filter, TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

interface BiomarkerData {
  name: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
}

interface LabTest {
  id: string;
  name: string;
  date: string;
  status: 'scheduled' | 'completed' | 'pending';
  score?: number;
  biomarkers?: BiomarkerData[];
}

const labTests: LabTest[] = [
  {
    id: '1',
    name: 'Comprehensive Blood Panel',
    date: '2024-04-15',
    status: 'scheduled'
  },
  {
    id: '2',
    name: 'Biomarker Analysis',
    date: '2024-03-01',
    status: 'completed',
    score: 85
  },
  {
    id: '3',
    name: 'Hormone Panel',
    date: '2024-02-15',
    status: 'completed',
    score: 78
  },
  {
    id: '4',
    name: 'Vitamin Panel',
    date: '2024-01-20',
    status: 'completed',
    score: 92
  },
  {
    id: '5',
    name: 'Thyroid Function',
    date: '2023-12-15',
    status: 'completed',
    score: 88
  }
];

export function LabHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LabTest['status'] | 'all'>('all');

  const filteredTests = labTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || test.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Link
          to="/appointments"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-serif text-3xl">Lab History</h1>
          <p className="text-lg text-gray-600">View all your test results</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('all')}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            All
          </Button>
          <Button
            variant={selectedStatus === 'completed' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('completed')}
          >
            Completed
          </Button>
          <Button
            variant={selectedStatus === 'scheduled' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('scheduled')}
          >
            Scheduled
          </Button>
          <Button
            variant={selectedStatus === 'pending' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('pending')}
          >
            Pending
          </Button>
        </div>
      </div>

      {/* Test List */}
      <div className="space-y-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="space-y-4 rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${
                  test.status === 'completed' ? 'bg-green-100 text-green-600' :
                  test.status === 'scheduled' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-500">{test.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {test.score && (
                  <span className="text-sm font-medium text-gray-900">{test.score}</span>
                )}
                <Link to={`/lab-history/${test.id}`}>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Biomarkers Section */}
            {test.biomarkers && test.biomarkers.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="mb-3 text-sm font-medium text-gray-700">Biomarkers</h4>
                <div className="grid gap-3">
                  {test.biomarkers.map((biomarker) => (
                    <div
                      key={biomarker.name}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{biomarker.name}</p>
                        <p className="text-sm text-gray-500">
                          Reference: {biomarker.referenceRange} {biomarker.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          biomarker.status === 'normal' ? 'bg-green-100 text-green-700' :
                          biomarker.status === 'high' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {biomarker.value} {biomarker.unit}
                        </span>
                        <TrendingUp className={`h-4 w-4 ${
                          biomarker.status === 'normal' ? 'text-green-600' :
                          biomarker.status === 'high' ? 'text-red-600' :
                          'text-yellow-600'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}