import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Users, Filter, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Patient } from '@/types/provider';
import { Link } from 'react-router-dom';
import { loadProviderData, getPatientsNeedingAttention } from '@/lib/provider';

interface PatientListProps {
  patients: Patient[];
  onInvitePatient: () => void;
}

function PatientList({ patients, onInvitePatient }: PatientListProps) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'attention' | 'checkins'>(
    (location.state?.filter as any) || 'all'
  );

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = patient.status === 'active';
    } else if (statusFilter === 'inactive') {
      matchesStatus = patient.status === 'inactive';
    } else if (statusFilter === 'attention') {
      const needsAttention = getPatientsNeedingAttention('1'); // Replace with actual provider ID
      matchesStatus = needsAttention.some(p => p.id === patient.id);
    } else if (statusFilter === 'checkins') {
      const today = new Date().toISOString().split('T')[0];
      const checkIns = JSON.parse(localStorage.getItem(`checkIns_${patient.id}`) || '[]');
      matchesStatus = checkIns.some((ci: any) => ci.date === today);
    }

    return matchesSearch && matchesStatus;
  });

  // Reset filter when location state changes
  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl">Patients</h1>
            <p className="text-lg text-gray-600">
              {statusFilter === 'attention' ? 'Patients needing attention' :
               statusFilter === 'checkins' ? "Today's check-ins" :
               statusFilter === 'active' ? 'Active patients' :
               statusFilter === 'inactive' ? 'Inactive patients' :
               'Manage your patient list'}
            </p>
          </div>
          <Button onClick={onInvitePatient} className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Invite Patient
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              All
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'attention' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('attention')}
            >
              Needs Attention
            </Button>
            <Button
              variant={statusFilter === 'checkins' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('checkins')}
            >
              Today's Check-ins
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              to={`/provider/patients/${patient.id}`}
              className="group rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {patient.photo ? (
                  <img
                    src={patient.photo}
                    alt={patient.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Users className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{patient.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      patient.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{patient.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {patient.conditions.slice(0, 2).map((condition, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                      >
                        {condition}
                      </span>
                    ))}
                    {patient.conditions.length > 2 && (
                      <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                        +{patient.conditions.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 font-medium text-gray-900">No patients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? "No patients match your search criteria"
                : "Start by inviting patients to join your practice"}
            </p>
            <Button
              onClick={onInvitePatient}
              className="mt-4"
            >
              Invite Patient
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientList;
