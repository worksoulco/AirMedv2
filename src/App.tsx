import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TopNav, BottomNav } from './components/layout/navigation';
import { SideMenu } from './components/layout/side-menu';
import { Dashboard } from './components/dashboard/Dashboard';
import { TrackingPage } from './components/tracking/tracking-page';
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { PatientList } from './components/provider/PatientList';
import { PatientDetail } from './components/provider/PatientDetail';
import { NotesPage } from './components/provider/NotesPage';
import { MessagingPage } from './components/provider/messaging/MessagingPage';
import { InvitePatientModal } from './components/provider/InvitePatientModal';
import { LoginPage } from './components/auth/LoginPage';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { getCurrentUser, logout } from './lib/auth';
import { loadProviderData, initializeMockData } from './lib/provider';
import { FoodJournal } from './components/tracking/food-journal';
import { AnalyticsPage } from './components/analytics/analytics-page';
import { LabsPage } from './components/labs/labs-page';
import { ChatPage } from './components/chat/chat-page';
import { ProtocolHistory } from './components/protocols/protocol-history';
import { ProfilePage } from './components/profile/profile-page';
import { SettingsPage } from './components/profile/settings-page';
import { HelpPage } from './components/help/help-page';

// Wrapper component to handle patient data fetching
function PatientDetailWrapper() {
  const { id } = useParams();
  const provider = loadProviderData();
  const patient = provider?.patients.find(p => p.id === id);

  if (!patient) {
    return <Navigate to="/provider/patients" replace />;
  }

  const handleUpdatePatient = (updatedPatient: any) => {
    // Handle patient updates
  };

  return (
    <PatientDetail
      patient={patient}
      onUpdatePatient={handleUpdatePatient}
    />
  );
}

function App() {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [user, setUser] = useState(getCurrentUser());
  const [providerData, setProviderData] = useState(loadProviderData());

  useEffect(() => {
    // Initialize mock data if needed
    initializeMockData();

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
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/tracking"
              element={
                <PrivateRoute allowedRole="patient">
                  <TrackingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/food-journal"
              element={
                <PrivateRoute allowedRole="patient">
                  <FoodJournal />
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute allowedRole="patient">
                  <AnalyticsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/labs"
              element={
                <PrivateRoute allowedRole="patient">
                  <LabsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <PrivateRoute allowedRole="patient">
                  <ChatPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/protocols"
              element={
                <PrivateRoute allowedRole="patient">
                  <ProtocolHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute allowedRole="patient">
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute allowedRole="patient">
                  <SettingsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/help"
              element={
                <PrivateRoute allowedRole="patient">
                  <HelpPage />
                </PrivateRoute>
              }
            />

            {/* Provider Routes */}
            <Route
              path="/provider"
              element={
                <PrivateRoute allowedRole="provider">
                  <ProviderDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/patients"
              element={
                <PrivateRoute allowedRole="provider">
                  <>
                    <PatientList
                      patients={providerData?.patients || []}
                      onInvitePatient={() => setShowInviteModal(true)}
                    />
                    {showInviteModal && (
                      <InvitePatientModal onClose={() => setShowInviteModal(false)} />
                    )}
                  </>
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
                  <NotesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/messages"
              element={
                <PrivateRoute allowedRole="provider">
                  <MessagingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/profile"
              element={
                <PrivateRoute allowedRole="provider">
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/settings"
              element={
                <PrivateRoute allowedRole="provider">
                  <SettingsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/provider/help"
              element={
                <PrivateRoute allowedRole="provider">
                  <HelpPage />
                </PrivateRoute>
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