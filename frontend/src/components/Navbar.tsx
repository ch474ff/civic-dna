import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, FilePlus, Search, Map, BarChart3, LogIn, LogOut, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setActiveTab('submit')}
          >
            <div className="bg-sky-500 p-2 rounded-lg text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
                CIVIC <span className="text-sky-400">DNA</span>
              </span>
              <span className="text-[10px] block text-slate-400 font-medium tracking-wider uppercase">
                Grievance Intelligence System
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'submit'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FilePlus className="h-4 w-4" />
              File Grievance
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'track'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Search className="h-4 w-4" />
              Track Status
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Map className="h-4 w-4" />
              Live GIS Map
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>

            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Shield className="h-4 w-4" />
                Officer Portal
              </button>
            )}
          </nav>

          {/* Officer auth button */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-slate-800 text-xs font-medium text-emerald-400 border border-emerald-500/30">
                  ● Officer Session
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-red-900/50 hover:text-red-300 text-slate-300 border border-slate-700 transition flex items-center gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 border ${
                  activeTab === 'login'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                Officer Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex overflow-x-auto px-2 py-2 bg-slate-950 border-t border-slate-800 space-x-2 scrollbar-none text-xs">
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'submit' ? 'bg-sky-600 text-white' : 'text-slate-400'
          }`}
        >
          File Grievance
        </button>
        <button
          onClick={() => setActiveTab('track')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'track' ? 'bg-sky-600 text-white' : 'text-slate-400'
          }`}
        >
          Track Status
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'map' ? 'bg-sky-600 text-white' : 'text-slate-400'
          }`}
        >
          GIS Map
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'analytics' ? 'bg-sky-600 text-white' : 'text-slate-400'
          }`}
        >
          Analytics
        </button>
        {isAuthenticated && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1.5 rounded whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-indigo-300'
            }`}
          >
            Officer Portal
          </button>
        )}
      </div>
    </header>
  );
};
