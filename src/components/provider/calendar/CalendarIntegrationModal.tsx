import { useState } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarIntegration } from '@/types/calendar';
import { connectCalendar } from '@/lib/calendar';

interface CalendarIntegrationModalProps {
  onClose: () => void;
  onComplete: () => void;
  integrations: CalendarIntegration[];
}

export function CalendarIntegrationModal({
  onClose,
  onComplete,
  integrations
}: CalendarIntegrationModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setError(null);
      setConnecting(true);
      await connectCalendar(email);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Calendar Integration</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Connected Calendars */}
          {integrations.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Connected Calendars
              </h3>
              <div className="space-y-2">
                {integrations.map(integration => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connect New Calendar */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Connect New Calendar
            </h3>
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleConnect}
                disabled={!email || connecting}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                {connecting ? 'Connecting...' : 'Connect Calendar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}