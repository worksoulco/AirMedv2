import { useState, useEffect } from 'react';
import { X, UserCheck, UserX, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PatientProviderResponse {
  id: string;
  created_at: string;
  patient: {
    id: string;
    raw_user_meta_data: {
      name: string;
      email: string;
      photo_url?: string;
    };
  };
}

interface ConnectionRequest {
  id: string;
  patient: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
  created_at: string;
}

interface Props {
  onClose: () => void;
}

export default function ConnectionRequestsModal({ onClose }: Props) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const loadRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('patient_providers')
          .select(`
            id,
            created_at,
            patient:users!patient_id (
              id,
              raw_user_meta_data
            )
          `)
          .eq('provider_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }) as { data: PatientProviderResponse[] | null; error: any };

        if (error) throw error;

        const formattedRequests: ConnectionRequest[] = (data || []).map(item => ({
          id: item.id,
          created_at: item.created_at,
          patient: {
            id: item.patient.id,
            name: item.patient.raw_user_meta_data.name,
            email: item.patient.raw_user_meta_data.email,
            photo_url: item.patient.raw_user_meta_data.photo_url
          }
        }));

        setRequests(formattedRequests);
      } catch (err) {
        console.error('Error loading requests:', err);
        setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('connection_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_providers',
          filter: `provider_id=eq.${user.id}`
        },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleRequest = async (requestId: string, accept: boolean) => {
    if (!user?.id) return;

    try {
      setProcessingId(requestId);
      setError(null);

      const { error } = await supabase
        .rpc('handle_connection_request', {
          request_id: requestId,
          new_status: accept ? 'active' : 'rejected'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error handling request:', err);
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Connection Requests</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-2"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <h3 className="font-medium">No pending requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              You'll see connection requests from patients here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-medium">{request.patient.name}</h3>
                  <p className="text-sm text-gray-500">{request.patient.email}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Requested {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleRequest(request.id, false)}
                    disabled={!!processingId}
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                    <span className="ml-2">Decline</span>
                  </Button>
                  <Button
                    onClick={() => handleRequest(request.id, true)}
                    disabled={!!processingId}
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    <span className="ml-2">Accept</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
