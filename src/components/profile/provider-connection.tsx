import { useState } from 'react';
import { Plus, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { requestProviderConnection } from '@/lib/profile';

interface ProviderConnectionProps {
  onClose: () => void;
}

export function ProviderConnectionModal({ onClose }: ProviderConnectionProps) {
  const [connectionCode, setConnectionCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      setError(null);
      if (!connectionCode.trim()) {
        setError('Please enter a connection code');
        return;
      }

      await requestProviderConnection(connectionCode.trim().toUpperCase());
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to provider');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connect to Provider</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Connection Request Sent</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your provider will need to approve the connection
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Provider Connection Code
              </label>
              <input
                type="text"
                value={connectionCode}
                onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., ABC12345)"
                className="w-full rounded-lg border-gray-200 px-4 py-2 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary"
                maxLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the connection code provided by your healthcare provider
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Connect
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}