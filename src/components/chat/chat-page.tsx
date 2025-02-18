import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import ConnectProviderModal from '../patient/ConnectProviderModal';
import { ChatThread } from './ChatThread';
import { useAuth } from '@/hooks/useAuth';
import { getOrCreateChatThread, subscribeToMessages } from '@/lib/chat';
import { supabase } from '@/lib/supabase/client';
import type { ChatParticipant } from '@/types/chat';

interface Provider {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  provider_details: {
    title: string;
    specialties: string[];
    npi: string;
    facility: {
      name: string;
      address: string;
      phone: string;
    };
  };
}

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user.role === 'patient') {
          // Get patient's chat thread and provider
          type ThreadResponse = {
            thread_id: string;
            provider: {
              user: {
                id: string;
                raw_user_meta_data: {
                  name: string;
                  email: string;
                  photo_url?: string;
                };
                provider_details: Array<{
                  title: string;
                  specialties: string[];
                  npi: string;
                  facility: {
                    name: string;
                    address: string;
                    phone: string;
                  };
                }>;
              };
            };
          };

          // First get the patient's thread
          const { data: threadData, error: threadError } = await supabase
            .from('chat_participants')
            .select('thread_id')
            .eq('user_id', user.id)
            .eq('role', 'patient')
            .single();

          if (threadError) {
            if (threadError.code === 'PGRST116') {
              // No thread found
              setProvider(null);
              setThread(null);
              setLoading(false);
              return;
            }
            throw threadError;
          }

          type ProviderResponse = {
            user: {
              id: string;
              raw_user_meta_data: {
                name: string;
                email: string;
                photo_url?: string;
              };
              provider_details: Array<{
                title: string;
                specialties: string[];
                npi: string;
                facility: {
                  name: string;
                  address: string;
                  phone: string;
                };
              }>;
            };
          };

          // Then get the provider from the same thread
          const { data: providerData, error: providerError } = await supabase
            .from('chat_participants')
            .select(`
              user:users!user_id (
                id,
                raw_user_meta_data,
                provider_details (*)
              )
            `)
            .eq('thread_id', threadData.thread_id)
            .eq('role', 'provider')
            .single() as { data: ProviderResponse | null; error: any };

          if (providerError) throw providerError;

          if (!providerData?.user) {
            setProvider(null);
            setThread(null);
            setLoading(false);
            return;
          }

          const providerInfo: Provider = {
            id: providerData.user.id,
            name: providerData.user.raw_user_meta_data.name,
            email: providerData.user.raw_user_meta_data.email,
            photo_url: providerData.user.raw_user_meta_data.photo_url,
            provider_details: providerData.user.provider_details[0]
          };

          setProvider(providerInfo);
          setThread(threadData.thread_id);

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
    if (thread) {
      const subscription = subscribeToMessages(
        thread,
        () => {
          // Reload data on new messages
          loadData();
        },
        (error) => {
          console.error('Chat subscription error:', error);
          setError(error.message);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
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
            onClick={() => setShowConnectModal(true)}
            className="mt-4"
          >
            Connect to Provider
          </Button>
          {showConnectModal && (
            <ConnectProviderModal 
              onClose={() => setShowConnectModal(false)}
              onSuccess={() => {
                setShowConnectModal(false);
                setRetryCount(prev => prev + 1);
              }}
            />
          )}
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
