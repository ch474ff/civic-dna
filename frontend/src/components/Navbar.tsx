import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FilePlus, Search, Map, BarChart3, LogIn, LogOut, Shield, ChevronDown, Menu, X, Activity, ClipboardList, Building, FileText } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  disabled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { isAuthenticated, logout } = useAuth();
  const [lang, setLang] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const citizenItems: NavItem[] = [
    { id: 'submit', label: 'File Grievance', icon: FilePlus },
    { id: 'track', label: 'Track Grievance', icon: Search },
    { id: 'my-grievances', label: 'My Grievances', icon: ClipboardList },
    { id: 'map', label: 'Civic Map', icon: Map },
  ];

  const officerItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'officer-grievances', label: 'Grievances', icon: ClipboardList, disabled: true },
    { id: 'map', label: 'Civic Map', icon: Map },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'departments', label: 'Departments', icon: Building, disabled: true },
    { id: 'reports', label: 'Reports', icon: FileText, disabled: true },
  ];

  const navItems = isAuthenticated ? officerItems : citizenItems;

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <header className="bg-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab(isAuthenticated ? 'dashboard' : 'submit')}
          >
            <Activity className="h-5.5 w-5.5 text-blue-500 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-lg tracking-tight leading-none">
                CIVIC <span className="text-blue-400">DNA</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide leading-none mt-0.5">
                Grievance Intelligence System
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    setActiveTab(item.id);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-500'
                      : isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right side: language + auth */}
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span>{currentLang.label}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 min-w-[120px]">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors ${
                          lang === l.code ? 'text-blue-600 font-medium' : 'text-slate-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline-block text-xs text-emerald-400 font-medium">
                  ● Officer
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-400 hover:text-red-300 hover:bg-white/5 border border-slate-700 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  activeTab === 'login'
                    ? 'bg-white/10 text-white border-slate-600'
                    : 'text-slate-400 border-slate-700 hover:text-white hover:bg-white/5'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                Officer Login
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
