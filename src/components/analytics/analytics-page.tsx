import { useState } from 'react';
import { Activity, Smartphone, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { WellnessTrends } from '../dashboard/wellness-trends';
import { Link } from 'react-router-dom';

function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load analytics</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          {error.includes('database') && (
            <p className="mt-4 text-sm text-gray-500">
              Please click the "Connect to Supabase" button in the top right to set up your database connection.
            </p>
          )}
          <Button
            onClick={() => setError(null)}
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
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl">Analytics</h1>
          <p className="text-lg text-gray-600">Track your health and wellness trends</p>
        </div>

        <div className="grid gap-6">
          {/* Wellness Trends */}
          <div>
            <WellnessTrends />
          </div>

          {/* Device Data */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-violet-100 p-2">
                  <Smartphone className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Connected Devices</h2>
                  <p className="text-sm text-gray-500">Health device readings</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed p-6 text-center">
              <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 font-medium text-gray-900">No Devices Connected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Connect your health devices to see your data here
              </p>
              <Link
                to="/settings"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/90"
              >
                <Plus className="h-4 w-4" />
                Connect a Device
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
