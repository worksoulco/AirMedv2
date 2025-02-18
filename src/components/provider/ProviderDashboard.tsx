import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  MessageSquare,
  Bell,
  FileText,
  ChevronRight,
  Plus,
  Link as LinkIcon,
  UserPlus
} from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import InvitePatientModal from './InvitePatientModal';
import ConnectionRequestsModal from './ConnectionRequestsModal';
import type { Patient, PatientAlert, HealthMetric } from '@/types/patient';
import type { PatientProviderResponse, ProviderPatientResponse } from '@/types/supabase';

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showConnectionRequests, setShowConnectionRequests] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get connected patients
        const { data: patientProviders, error: ppError } = await supabase
          .from('patient_providers')
          .select(`
            id,
            patient:users!patient_id (
              id,
              raw_user_meta_data->>'name' as name,
              raw_user_meta_data->>'email' as email,
              raw_user_meta_data->>'photo_url' as photo_url,
              raw_user_meta_data as metadata
            )
          `)
          .eq('provider_id', user.id)
          .eq('status', 'active') as { data: ProviderPatientResponse[] | null; error: any };

        if (ppError) throw ppError;

        const connectedPatients = patientProviders?.map(pp => ({
          id: pp.patient.id,
          name: pp.patient.name,
          email: pp.patient.email,
          photo_url: pp.patient.photo_url,
          metadata: pp.patient.metadata
        })) || [];
        setPatients(connectedPatients);

        // Get alerts for connected patients
        const alerts: PatientAlert[] = [];
        for (const patient of connectedPatients) {
          // Get recent check-ins
          const { data: checkIns } = await supabase
            .from('check_ins')
            .select('*')
            .eq('patient_id', patient.id)
            .order('date', { ascending: false })
            .limit(7);

          if (checkIns && checkIns.length > 0) {
            // Check for concerning patterns
            const lowMoodDays = checkIns.filter(ci => {
              const moodScores: Record<string, number> = {
                '😊': 5, '🙂': 4, '😐': 3, '😕': 2
              };
              return moodScores[ci.mood] <= 2;
            }).length;

            if (lowMoodDays >= 3) {
              alerts.push({
                id: `mood-${patient.id}`,
                patientId: patient.id,
                patientName: patient.name,
                type: 'wellness',
                severity: 'high',
                message: 'Showing signs of persistent low mood',
                date: new Date().toISOString()
              });
            }

            const poorSleepDays = checkIns.filter(ci => ci.sleep <= 2).length;
            if (poorSleepDays >= 3) {
              alerts.push({
                id: `sleep-${patient.id}`,
                patientId: patient.id,
                patientName: patient.name,
                type: 'wellness',
                severity: 'medium',
                message: 'Reporting consistently poor sleep quality',
                date: new Date().toISOString()
              });
            }
          }
        }

        setAlerts(alerts);

        // Calculate metrics
        const metrics: HealthMetric[] = [];
        let totalCheckIns = 0;
        let totalPatients = connectedPatients.length;
        let patientsWithCheckIns = 0;
        let totalMoodScore = 0;
        let totalSleepScore = 0;
        let totalStressScore = 0;

        for (const patient of connectedPatients) {
          const { data: checkIns } = await supabase
            .from('check_ins')
            .select('*')
            .eq('patient_id', patient.id)
            .order('date', { ascending: false })
            .limit(30);

          if (checkIns && checkIns.length > 0) {
            patientsWithCheckIns++;
            totalCheckIns += checkIns.length;

            checkIns.forEach(ci => {
              const moodScores: Record<string, number> = {
                '😊': 5, '🙂': 4, '😐': 3, '😕': 2
              };
              totalMoodScore += moodScores[ci.mood] || 3;
              totalSleepScore += ci.sleep || 0;
              totalStressScore += ci.stress || 0;
            });
          }
        }

        if (totalCheckIns > 0) {
          metrics.push({
            id: 'engagement',
            patientName: 'All Patients',
            metric: 'Patient Engagement',
            value: `${Math.round((patientsWithCheckIns / totalPatients) * 100)}`,
            unit: '%',
            trend: patientsWithCheckIns > totalPatients / 2 ? 'up' : 'down' as const,
            change: `${Math.round(totalCheckIns / patientsWithCheckIns)} check-ins/patient`
          });

          metrics.push({
            id: 'mood',
            patientName: 'All Patients',
            metric: 'Average Mood Score',
            value: (totalMoodScore / totalCheckIns).toFixed(1),
            unit: '/5',
            trend: (totalMoodScore / totalCheckIns) >= 3.5 ? 'up' : 'down' as const,
            change: `${Math.round(((totalMoodScore / totalCheckIns - 3) / 3) * 100)}%`
          });

          metrics.push({
            id: 'sleep',
            patientName: 'All Patients',
            metric: 'Sleep Quality',
            value: (totalSleepScore / totalCheckIns).toFixed(1),
            unit: '/5',
            trend: (totalSleepScore / totalCheckIns) >= 3.5 ? 'up' : 'down' as const,
            change: `${Math.round(((totalSleepScore / totalCheckIns - 3) / 3) * 100)}%`
          });
        }

        setMetrics(metrics);

      } catch (err) {
        console.error('Error loading provider data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load provider data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const checkInsSubscription = supabase
      .channel('check_ins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      checkInsSubscription.unsubscribe();
    };
  }, [user?.id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-2 text-lg font-semibold text-red-900">Failed to load dashboard</h2>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const quickStats = [
    {
      id: 'active-patients',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      label: 'Active Patients',
      value: patients.length,
      onClick: () => navigate('/provider/patients', { state: { filter: 'active' } })
    },
    {
      id: 'needs-attention',
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      label: 'Needs Attention',
      value: alerts.length,
      onClick: () => navigate('/provider/patients', { state: { filter: 'attention' } })
    },
    {
      id: 'appointments',
      icon: Calendar,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      label: "Today's Appointments",
      value: appointments.length,
      linkTo: '/provider/calendar'
    }
  ];

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl">Welcome back, {user?.userData.name.split(' ')[0]}</h1>
              <p className="text-lg text-gray-600">Here's what needs your attention today</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConnectionRequests(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Connection Requests
              </Button>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2"
              >
                <LinkIcon className="h-4 w-4" />
                Manage Codes
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickStats.map(stat => (
            <div key={stat.id}>
              {stat.linkTo ? (
                <Link
                  to={stat.linkTo}
                  className="block rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full ${stat.iconBg} p-3`}>
                      <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-semibold">{stat.value}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ) : (
                <button
                  onClick={stat.onClick}
                  className="w-full rounded-xl bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full ${stat.iconBg} p-3`}>
                      <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-semibold">{stat.value}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Patient Alerts */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <Bell className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold">Patient Alerts</h2>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>

            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <Bell className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 font-medium">No active alerts</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All your patients are doing well
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className={`rounded-full p-2 ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-600' :
                      alert.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {alert.type === 'wellness' ? <Activity className="h-5 w-5" /> :
                       alert.type === 'lab' ? <FileText className="h-5 w-5" /> :
                       alert.type === 'medication' ? <Bell className="h-5 w-5" /> :
                       <Calendar className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{alert.patientName}</h3>
                          <p className="text-sm text-gray-600">{alert.message}</p>
                        </div>
                        <Link
                          to={`/provider/patients/${alert.patientId}`}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(alert.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Population Health Metrics */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold">Population Health</h2>
              </div>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>

            <div className="space-y-4">
              {metrics.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <Activity className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 font-medium">No metrics available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start tracking patient outcomes to see metrics
                  </p>
                </div>
              ) : (
                metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{metric.metric}</h3>
                        <p className="text-sm text-gray-500">{metric.patientName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-semibold">
                            {metric.value}{metric.unit}
                          </span>
                          <div className={`flex items-center ${
                            metric.trend === 'up' ? 'text-green-600' :
                            metric.trend === 'down' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {metric.trend === 'up' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="text-sm">
                              {metric.change}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InvitePatientModal onClose={() => setShowInviteModal(false)} />
      )}
      {showConnectionRequests && (
        <ConnectionRequestsModal onClose={() => setShowConnectionRequests(false)} />
      )}
    </div>
  );
}
