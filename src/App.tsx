import { useState, useEffect, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import type { Patient } from './types/patient';
import type { AuthUser } from './hooks/useAuth';
import { TopNav, BottomNav } from './components/layout/navigation';
import { SideMenu } from './components/layout/side-menu';
import { LoginPage, OnboardingFlow, PrivateRoute } from './components/auth';
import { LazyComponent } from './components/common/LazyComponent';
import { getCurrentUser, logout } from './lib/auth';
import { setupLabResultsTable } from './lib/supabase/setup';
import { loadProviderData, initializeMockData } from './lib/provider';

// Lazy load major feature chunks
// Core features
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'));
const TrackingPage = lazy(() => import(/* webpackChunkName: "tracking" */ '@/components/tracking/tracking-page'));
const FoodJournal = lazy(() => import(/* webpackChunkName: "tracking" */ '@/components/tracking/food-journal'));
const AnalyticsPage = lazy(() => import(/* webpackChunkName: "analytics" */ '@/components/analytics/analytics-page'));
const LabsPage = lazy(() => import(/* webpackChunkName: "labs" */ '@/components/labs/labs-page'));
const ChatPage = lazy(() => import(/* webpackChunkName: "chat" */ '@/components/chat/chat-page'));
const ProtocolHistory = lazy(() => import(/* webpackChunkName: "protocols" */ '@/components/protocols/protocol-history'));

// Profile and Settings chunk
const ProfileFeatures = {
  ProfilePage: lazy(() => import(/* webpackChunkName: "profile" */ '@/components/profile/profile-page')),
  SettingsPage: lazy(() => import(/* webpackChunkName: "profile" */ '@/components/profile/settings-page')),
  HelpPage: lazy(() => import(/* webpackChunkName: "profile" */ '@/components/help/help-page'))
};

// Provider features chunk
const ProviderFeatures = {
  Dashboard: lazy(() => import(/* webpackChunkName: "provider" */ '@/components/provider/ProviderDashboard')),
  PatientList: lazy(() => import(/* webpackChunkName: "provider" */ '@/components/provider/PatientList')),
  PatientDetail: lazy(() => import(/* webpackChunkName: "provider" */ '@/components/provider/PatientDetail')),
  NotesPage: lazy(() => import(/* webpackChunkName: "provider" */ '@/components/provider/NotesPage')),
  MessagingPage: lazy(() => import(/* webpackChunkName: "provider" */ '@/components/provider/messaging/MessagingPage')),
  InvitePatientModal: lazy(() => import(/* webpackChunkName: "provider" */ '@/components/provider/InvitePatientModal'))
};

// Wrapper component to handle patient data fetching
const PatientDetailWrapper = () => {
  const { id } = useParams();
  const provider = loadProviderData();
  const patient = provider?.patients.find((p) => p.id === id);

  if (!patient) {
    return <Navigate to="/provider/patients" replace />;
  }

  const handleUpdatePatient = (updatedPatient: Patient) => {
    // Handle patient updates
  };

  return (
    <LazyComponent>
      <ProviderFeatures.PatientDetail
        patient={patient}
        onUpdatePatient={handleUpdatePatient}
      />
    </LazyComponent>
  );
};

function App() {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [providerData, setProviderData] = useState(loadProviderData());

  useEffect(() => {
    // Initialize mock data and database tables
    const initialize = async () => {
      try {
        initializeMockData();
        await setupLabResultsTable();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initialize();

    const handleAuthUpdate = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      if (currentUser?.role === 'provider') {
        setProviderData(loadProviderData());
      }
    };

    const handleProviderUpdate = () => {
      setProviderData(loadProviderData());
    };

    window.addEventListener('authUpdate', handleAuthUpdate);
    window.addEventListener('providerUpdate', handleProviderUpdate);
    
    return () => {
      window.removeEventListener('authUpdate', handleAuthUpdate);
      window.removeEventListener('providerUpdate', handleProviderUpdate);
    };
  }, []);

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="relative min-h-screen bg-gray-50/50">
        <TopNav
          onMenuClick={() => setIsSideMenuOpen(true)}
          onLogout={logout}
          user={user}
        />
        <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
        <main className="mx-auto w-full pb-20 pt-20">
          <Routes>
            {/* Patient Routes */}
            <Route
              path="/"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <Dashboard />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/tracking"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <TrackingPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/food-journal"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <FoodJournal />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <AnalyticsPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/labs"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <LabsPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <ChatPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/protocols"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <ProtocolHistory />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <ProfileFeatures.ProfilePage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <ProfileFeatures.SettingsPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/help"
              element={
                <PrivateRoute allowedRole="patient">
                  <LazyComponent>
                    <ProfileFeatures.HelpPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />

            {/* Provider Routes */}
            <Route
              path="/provider"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <ProviderFeatures.Dashboard />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/patients"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <>
                      <ProviderFeatures.PatientList
                        patients={providerData?.patients || []}
                        onInvitePatient={() => setShowInviteModal(true)}
                      />
                      {showInviteModal && (
                        <ProviderFeatures.InvitePatientModal onClose={() => setShowInviteModal(false)} />
                      )}
                    </>
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/patients/:id"
              element={
                <PrivateRoute allowedRole="provider">
                  <PatientDetailWrapper />
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/notes"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <ProviderFeatures.NotesPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/messages"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <ProviderFeatures.MessagingPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/profile"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <ProfileFeatures.ProfilePage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/settings"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <ProfileFeatures.SettingsPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/help"
              element={
                <PrivateRoute allowedRole="provider">
                  <LazyComponent>
                    <ProfileFeatures.HelpPage />
                  </LazyComponent>
                </PrivateRoute>
              }
            />

            {/* Catch-all route - redirect to appropriate dashboard based on role */}
            <Route
              path="*"
              element={
                user.role === 'provider' ? (
                  <Navigate to="/provider" replace />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </main>
        <BottomNav user={user} />
      </div>
    </Router>
  );
}

export default App;
