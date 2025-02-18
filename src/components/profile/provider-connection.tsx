import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ConnectProviderModal } from '../patient';
import { requestProviderConnection, getActiveConnections } from '@/lib/provider-connection';
import { useAuth } from '@/hooks/useAuth';
import type { Provider } from '@/types/provider-connection';

export default function ProviderConnection() {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const loadConnection = async () => {
      try {
        setLoading(true);
        setError(null);

        const connections = await getActiveConnections();
        if (connections && connections.length > 0) {
          if (connections[0]?.provider) {
            const providerData = connections[0].provider;
            setProvider({
              id: providerData.id,
              name: providerData.raw_user_meta_data.name,
              email: providerData.raw_user_meta_data.email,
              photo_url: providerData.raw_user_meta_data.photo_url,
              provider_details: providerData.provider_details[0]
            });
          }
        }
      } catch (err) {
        console.error('Error loading provider connection:', err);
        setError(err instanceof Error ? err.message : 'Failed to load provider connection');
      } finally {
        setLoading(false);
      }
    };

    loadConnection();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!provider) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Healthcare Provider</h2>
        <p className="mt-2 text-gray-600">
          Connect with your healthcare provider to enable secure communication and data sharing.
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
              window.location.reload();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Healthcare Provider</h2>
      <div className="mt-4">
        <div className="flex items-start gap-4">
          {provider.photo_url && (
            <img
              src={provider.photo_url}
              alt={provider.name}
              className="h-12 w-12 rounded-full"
            />
          )}
          <div>
            <h3 className="font-medium">{provider.name}</h3>
            <p className="text-sm text-gray-600">{provider.provider_details.title}</p>
            <p className="mt-1 text-sm text-gray-500">
              {provider.provider_details.facility.name}
            </p>
            <p className="text-sm text-gray-500">
              {provider.provider_details.facility.address}
            </p>
            <p className="text-sm text-gray-500">
              {provider.provider_details.facility.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
