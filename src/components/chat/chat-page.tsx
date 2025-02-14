import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { ChatThread } from './ChatThread';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<any | null>(null);
  const [provider, setProvider] = useState<any | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user.role === 'patient') {
          // Get patient's provider
          const { data: providers, error: providerError } = await supabase
            .from('patient_providers')
            .select(`
              provider:provider_id (
                id,
                name,
                email,
                photo_url,
                provider_details (*)
              )
            `)
            .eq('patient_id', user.id)
            .eq('status', 'active');

          if (providerError) throw providerError;

          if (!providers || providers.length === 0) {
            setProvider(null);
            setLoading(false);
            return;
          }

          const provider = providers[0].provider;
          setProvider(provider);

          // Get or create chat thread
          const { data: threadId, error: threadError } = await supabase
            .rpc('get_or_create_chat_thread', {
              p_patient_id: user.id,
              p_provider_id: provider.id
            });

          if (threadError) throw threadError;
          setThread(threadId);
        } else {
          // For providers, they should select a patient first
          setThread(null);
        }
      } catch (err) {
        console.error('Error loading chat data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const threadSubscription = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: user.role === 'patient'
            ? `thread_id=eq.${thread}`
            : undefined
        },
        () => {
          // Reload data on any chat updates
          loadData();
        }
      )
      .subscribe();

    return () => {
      threadSubscription.unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load messages</h3>
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

  if (user?.role === 'patient' && !provider) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 font-medium text-gray-900">No Provider Connected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect with your healthcare provider to start messaging
          </p>
          <Button
            onClick={() => {/* Navigate to provider connection page */}}
            className="mt-4"
          >
            Find a Provider
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {thread && provider && (
        <ChatThread
          threadId={thread}
          participant={{
            id: provider.id,
            name: provider.name,
            photo: provider.photo_url,
            role: 'provider'
          }}
        />
      )}
    </div>
  );
}