import { useState, useEffect } from 'react';
import { Search, MessageSquare, Phone, Video, ChevronRight, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadProviderData } from '@/lib/provider';
import { Patient } from '@/types/provider';
import { ChatThread } from './ChatThread';

function MessagingPage() {
  const [provider, setProvider] = useState(loadProviderData());
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'flagged'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      const providerData = loadProviderData();
      setProvider(providerData);
      setLoading(false);
    };

    loadData();
    window.addEventListener('providerUpdate', loadData);
    window.addEventListener('messageUpdate', loadData);

    return () => {
      window.removeEventListener('providerUpdate', loadData);
      window.removeEventListener('messageUpdate', loadData);
    };
  }, []);

  if (!provider) return null;

  const filteredPatients = provider.patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    // Add additional filtering logic for unread/flagged messages
    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Patient List Sidebar */}
      <div className="w-96 flex-shrink-0 border-r bg-white">
        <div className="border-b p-4">
          <h1 className="mb-4 font-serif text-2xl">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
            <Button
              variant={filter === 'flagged' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('flagged')}
            >
              Flagged
            </Button>
          </div>
        </div>

        <div className="divide-y overflow-y-auto">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className={`flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-gray-50 ${
                selectedPatient?.id === patient.id ? 'bg-gray-50' : ''
              }`}
            >
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
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{patient.name}</h3>
                  <span className="text-xs text-gray-500">12m ago</span>
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">
                  Last message preview goes here...
                </p>
                {patient.conditions.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {patient.conditions.slice(0, 2).map((condition, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                      >
                        {condition}
                      </span>
                    ))}
                    {patient.conditions.length > 2 && (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        +{patient.conditions.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedPatient ? (
        <div className="flex flex-1 flex-col">
          {/* Patient Header */}
          <div className="flex items-center justify-between border-b bg-white px-6 py-4">
            <div className="flex items-center gap-4">
              {selectedPatient.photo ? (
                <img
                  src={selectedPatient.photo}
                  alt={selectedPatient.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Users className="h-6 w-6 text-gray-600" />
                </div>
              )}
              <div>
                <h2 className="font-medium text-gray-900">{selectedPatient.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Last visit: {new Date(selectedPatient.lastVisit || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Chat Thread */}
          <ChatThread patient={selectedPatient} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Select a Patient</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose a patient to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessagingPage;
