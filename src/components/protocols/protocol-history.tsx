import { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Calendar, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { getCurrentUser } from '@/lib/auth';
import { getPatientProtocols, subscribeToProtocolUpdates } from '@/lib/supabase/protocols';
import type { Protocol } from '@/types/protocol';

export function ProtocolHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Protocol['status'] | 'all'>('all');
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadProtocols = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getPatientProtocols(user.id);
        setProtocols(data || []);
      } catch (err) {
        console.error('Error loading protocols:', err);
        setError(err instanceof Error ? err.message : 'Failed to load protocols');
      } finally {
        setLoading(false);
      }
    };

    loadProtocols();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToProtocolUpdates(user.id);

    return () => {
      unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const toggleProtocol = (protocolId: string) => {
    setExpandedProtocol(expandedProtocol === protocolId ? null : protocolId);
  };

  const getStatusColor = (status: Protocol['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredProtocols = protocols.filter(protocol => {
    const matchesSearch = protocol.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         protocol.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || protocol.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ClipboardList className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading protocols...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load protocols</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          {error.includes('database') && (
            <p className="mt-4 text-sm text-gray-500">
              Please click the "Connect to Supabase" button in the top right to set up your database connection.
            </p>
          )}
          <Button
            onClick={handleRetry}
            className="mt-4 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">Protocol History</h1>
        <p className="text-lg text-gray-600">View your treatment protocols and medical guidance</p>
      </div>

      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search protocols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('all')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              All
            </Button>
            <Button
              variant={selectedStatus === 'active' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('active')}
            >
              Active
            </Button>
            <Button
              variant={selectedStatus === 'completed' ? 'default' : 'outline'}
              onClick={() => setSelectedStatus('completed')}
            >
              Completed
            </Button>
          </div>
        </div>

        {/* Protocols List */}
        <div className="space-y-4">
          {filteredProtocols.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 font-medium text-gray-900">No protocols found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? "No protocols match your search criteria"
                  : "You don't have any protocols yet"}
              </p>
            </div>
          ) : (
            filteredProtocols.map((protocol) => (
              <div
                key={protocol.id}
                className="rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{protocol.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(protocol.status)}`}>
                        {protocol.status.charAt(0).toUpperCase() + protocol.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Started {new Date(protocol.startDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {protocol.endDate
                          ? `Ends ${new Date(protocol.endDate).toLocaleDateString()}`
                          : 'Ongoing'}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{protocol.description}</p>
                  </div>
                  <button
                    onClick={() => toggleProtocol(protocol.id)}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    {expandedProtocol === protocol.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {expandedProtocol === protocol.id && (
                  <div className="mt-6 space-y-6 border-t pt-6">
                    {/* Tasks */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Tasks & Requirements</h4>
                      <div className="grid gap-4">
                        {protocol.tasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 rounded-lg border p-4"
                          >
                            <div className={`mt-0.5 rounded-full p-1 ${getTaskStatusColor(task.status)}`}>
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900">{task.title}</h5>
                                  {task.description && (
                                    <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                                  )}
                                </div>
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                  {task.frequency.replace('_', ' ')}
                                </span>
                              </div>
                              {task.dueDate && (
                                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Provider Notes */}
                    {protocol.notes && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Provider Notes</h4>
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm text-gray-600">{protocol.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {protocol.attachments && protocol.attachments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Resources & Documents</h4>
                        <div className="grid gap-2">
                          {protocol.attachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border p-3 text-sm text-blue-600 hover:bg-gray-50"
                            >
                              <ClipboardList className="h-4 w-4" />
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Alert */}
                    {protocol.status === 'active' && (
                      <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Active Protocol</p>
                          <p className="mt-1">Follow this protocol as directed by your healthcare provider. Contact them if you have any questions or concerns.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}