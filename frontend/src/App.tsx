import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CitizenSubmitPage } from './pages/CitizenSubmitPage';
import { CitizenTrackPage } from './pages/CitizenTrackPage';
import { MapExplorePage } from './pages/MapExplorePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { OfficerLoginPage } from './pages/OfficerLoginPage';
import { OfficerDashboardPage } from './pages/OfficerDashboardPage';
import { MyGrievancesPage } from './pages/MyGrievancesPage';
import { Shield } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('submit');
  const [trackComplaintId, setTrackComplaintId] = useState<string>('');
  const { isAuthenticated } = useAuth();

  const handleNavigateToTrack = (complaintId: string) => {
    setTrackComplaintId(complaintId);
    setActiveTab('track');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-16">
        {activeTab === 'submit' && (
          <CitizenSubmitPage onNavigateToTrack={handleNavigateToTrack} />
        )}

        {activeTab === 'track' && (
          <CitizenTrackPage initialComplaintId={trackComplaintId} />
        )}

        {activeTab === 'my-grievances' && (
          <MyGrievancesPage
            onNavigateToTrack={handleNavigateToTrack}
            onNavigateToSubmit={() => setActiveTab('submit')}
          />
        )}

        {activeTab === 'map' && <MapExplorePage />}

        {activeTab === 'analytics' && (
          isAuthenticated ? (
            <AnalyticsPage />
          ) : (
            <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-slate-200 rounded-lg text-center space-y-3">
              <Shield className="h-8 w-8 text-amber-500 mx-auto" />
              <h3 className="font-bold text-slate-800">Restricted Access</h3>
              <p className="text-xs text-slate-500">This operational analytics dashboard is restricted to authorized municipal officers.</p>
            </div>
          )
        )}

        {activeTab === 'login' && (
          <OfficerLoginPage
            onLoginSuccess={() => {
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          isAuthenticated ? (
            <OfficerDashboardPage />
          ) : (
            <OfficerLoginPage
              onLoginSuccess={() => {
                setActiveTab('dashboard');
              }}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">CIVIC DNA</span>
            <span>— Intelligent Municipal Grievance & SLA Orchestration</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>FastAPI + PostgreSQL + Leaflet GIS</span>
            <span>•</span>
            <span>Frozen Backend Contract V1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
