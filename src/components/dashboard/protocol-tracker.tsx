import { useState, useEffect } from 'react';
import { ClipboardList, Plus, ChevronDown, ChevronUp, Calendar, CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { getCurrentUser } from '@/lib/auth';
import { getPatientProtocols, subscribeToProtocolUpdates } from '@/lib/supabase/protocols';
import type { Protocol } from '@/types/protocol';

export default function ProtocolTracker() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
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
        const activeProtocol = data.find(p => p.status === 'active');
        setProtocols(data);
        if (activeProtocol) {
          setExpandedProtocol(activeProtocol.id);
        }
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

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <ClipboardList className="h-5 w-5 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Protocol</h2>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load protocol</h3>
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

  const activeProtocol = protocols.find(p => p.status === 'active');

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Protocol</h2>
            <p className="text-sm text-gray-500">Your active treatment plan</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {activeProtocol ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{activeProtocol.title}</h3>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Active
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Started {new Date(activeProtocol.startDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activeProtocol.endDate
                      ? `Ends ${new Date(activeProtocol.endDate).toLocaleDateString()}`
                      : 'Ongoing'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleProtocol(activeProtocol.id)}
                className="rounded-full p-1 hover:bg-blue-100"
              >
                {expandedProtocol === activeProtocol.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            {expandedProtocol === activeProtocol.id && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600">{activeProtocol.description}</p>
                
                {/* Tasks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Tasks</h4>
                  {activeProtocol.tasks?.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-3"
                    >
                      <div className={`mt-0.5 rounded-full p-1 ${
                        task.status === 'completed' ? 'bg-green-100 text-green-600' :
                        task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        {task.description && (
                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-gray-100 px-2 py-1">
                            {task.frequency.replace('_', ' ')}
                          </span>
                          {task.dueDate && (
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {activeProtocol.notes && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Notes</h4>
                    <p className="text-sm text-gray-600">{activeProtocol.notes}</p>
                  </div>
                )}

                {/* Attachments */}
                {activeProtocol.attachments && activeProtocol.attachments.length > 0 && (
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Resources</h4>
                    <div className="space-y-2">
                      {activeProtocol.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border p-2 text-sm text-blue-600 hover:bg-gray-50"
                        >
                          <ClipboardList className="h-4 w-4" />
                          {attachment.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 font-medium text-gray-900">No Active Protocol</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any active treatment protocols at the moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export for use in other components
export { ProtocolTracker };