import { useState, useEffect } from 'react';
import { Activity, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { deviceClient } from '@/lib/integrations/devices';
import { getCurrentUser } from '@/lib/auth';

interface DeviceReading {
  timestamp: string;
  type: string;
  value: number | { systolic: number; diastolic: number };
  unit: string;
}

export function HealthScore() {
  const [deviceReadings, setDeviceReadings] = useState<DeviceReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasDevices, setHasDevices] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get last 7 days of device readings
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const deviceTypes = [
          'blood_pressure',
          'heart_rate',
          'blood_glucose',
          'weight',
          'temperature',
          'oxygen'
        ];

        // Fetch readings for each device type in parallel
        const readingsPromises = deviceTypes.map(type =>
          deviceClient.getDeviceReadings(user.id, type, startDate, endDate)
        );

        const allReadings = await Promise.all(readingsPromises);
        const readings = allReadings.flat();

        setDeviceReadings(readings);
        setHasDevices(readings.length > 0);
      } catch (err) {
        console.error('Error loading device data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load device data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time device updates
    const unsubscribe = deviceClient.subscribeToReadings(user.id, (reading) => {
      setDeviceReadings(prev => [reading, ...prev]);
      setHasDevices(true);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 font-medium text-gray-900">Unable to load health data</h3>
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
    <div className="space-y-6">
      {/* Device Data */}
      <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
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

        {hasDevices ? (
          <div className="space-y-4">
            {/* Blood Pressure */}
            {deviceReadings.some(r => r.type === 'blood_pressure') && (
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-gray-900">Blood Pressure</h3>
                </div>
                <div className="space-y-2">
                  {deviceReadings
                    .filter(r => r.type === 'blood_pressure')
                    .slice(0, 3)
                    .map((reading, index) => {
                      const bp = reading.value as { systolic: number; diastolic: number };
                      return (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {new Date(reading.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-medium text-gray-900">
                            {bp.systolic}/{bp.diastolic} {reading.unit}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Heart Rate */}
            {deviceReadings.some(r => r.type === 'heart_rate') && (
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-pink-500" />
                  <h3 className="font-medium text-gray-900">Heart Rate</h3>
                </div>
                <div className="space-y-2">
                  {deviceReadings
                    .filter(r => r.type === 'heart_rate')
                    .slice(0, 3)
                    .map((reading, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(reading.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-medium text-gray-900">
                          {reading.value as number} {reading.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Blood Glucose */}
            {deviceReadings.some(r => r.type === 'blood_glucose') && (
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium text-gray-900">Blood Glucose</h3>
                </div>
                <div className="space-y-2">
                  {deviceReadings
                    .filter(r => r.type === 'blood_glucose')
                    .slice(0, 3)
                    .map((reading, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(reading.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-medium text-gray-900">
                          {reading.value as number} {reading.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Oxygen Saturation */}
            {deviceReadings.some(r => r.type === 'oxygen') && (
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-medium text-gray-900">Oxygen Saturation</h3>
                </div>
                <div className="space-y-2">
                  {deviceReadings
                    .filter(r => r.type === 'oxygen')
                    .slice(0, 3)
                    .map((reading, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(reading.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-medium text-gray-900">
                          {reading.value as number}{reading.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
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
              <Smartphone className="h-4 w-4" />
              Connect a Device
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}