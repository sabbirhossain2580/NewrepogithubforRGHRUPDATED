// src/components/Navbar.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Bell,
  AlertTriangle,
  ChevronDown,
  Clock,
  LogOut,
  Building2,
  ShieldCheck,
  User,
  Sun,
  Moon,
  Briefcase,
  CheckSquare,
  Sparkles,
  Layers,
} from 'lucide-react';
import { NotificationItem } from '../types/index.ts';

interface NavbarProps {
  overdueCount: number;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onNavigateToOverdue: () => void;
  currentModule?: 'recruitment' | 'tasks';
  onChangeModule?: (mod: 'recruitment' | 'tasks') => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  overdueCount,
  notifications,
  onOpenNotifications,
  onNavigateToOverdue,
  currentModule = 'recruitment',
  onChangeModule,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const { activePersona, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const roleLabelMap: Record<string, { label: string; badge: string }> = {
    head_of_hr: { label: 'Head of HR', badge: 'bg-purple-900/40 text-purple-200 border-purple-700/60' },
    hr_manager: { label: 'HR Manager', badge: 'bg-blue-900/40 text-blue-200 border-blue-700/60' },
    employee: { label: 'HR Executive', badge: 'bg-emerald-900/40 text-emerald-200 border-emerald-700/60' },
    admin: { label: 'System Admin', badge: 'bg-rose-900/40 text-rose-200 border-rose-700/60' },
  };

  const currentRoleStyle = roleLabelMap[activePersona.role] || roleLabelMap.employee;

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm select-none">
      {/* Brand & Corporate Crest */}
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 border border-slate-700/70 flex items-center justify-center font-bold text-white shadow-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-blue-500/20" />
          <Building2 className="w-5 h-5 text-amber-400 relative z-10" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-tight text-base md:text-lg text-white font-sans">
              RENAISSANCE GROUP
            </span>
            <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono font-bold tracking-wider border border-amber-500/30">
              CORPORATE HR
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:flex items-center space-x-1.5">
            <span>Human Resources &amp; Organizational Development</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-medium">
              {currentModule === 'recruitment' ? 'Recruitment Status & Turnaround Portal' : 'Task & KPI Management System'}
            </span>
          </p>
        </div>
      </div>

      {/* Middle Module Switcher (Lucrative Corporate Segmented Control) */}
      {onChangeModule && (
        <div className="hidden lg:flex items-center p-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs shadow-inner">
          <button
            onClick={() => onChangeModule('recruitment')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              currentModule === 'recruitment'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Recruitment &amp; MRF</span>
          </button>
          <button
            onClick={() => onChangeModule('tasks')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              currentModule === 'tasks'
                ? 'bg-gradient-to-r from-indigo-600 to-slate-800 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks &amp; KPI System</span>
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Dark/Light mode toggle */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to Light Corporate Theme' : 'Switch to Dark Corporate Theme'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 transition"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Task Overdue Alert Trigger */}
        {overdueCount > 0 && (
          <button
            onClick={onNavigateToOverdue}
            className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-md transition border border-red-500/80 animate-pulse"
            title="View Critical Overdue Tasks"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">{overdueCount} Overdue</span>
          </button>
        )}


        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px] flex items-center justify-center font-mono">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Session Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 transition shadow-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-700 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
              {activePersona.avatarInitials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold leading-tight truncate max-w-[125px] text-white">
                {activePersona.name}
              </div>
              <div className="text-[10px] text-amber-300 font-mono tracking-tight font-medium">
                ID: {activePersona.employeeCode}
              </div>
            </div>
            <span className={`hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase font-mono ${currentRoleStyle.badge}`}>
              {currentRoleStyle.label}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 text-slate-800 dark:text-slate-200">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Corporate Session Active
                </div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                  {activePersona.name}
                </div>
                <div className="text-xs text-slate-500 truncate">{activePersona.designation}</div>
                <div className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold mt-1">
                  Employee Code: {activePersona.employeeCode}
                </div>
              </div>

              {/* Mobile Module Switcher Option */}
              {onChangeModule && (
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 lg:hidden">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Module Selection</div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      onClick={() => {
                        onChangeModule('recruitment');
                        setDropdownOpen(false);
                      }}
                      className={`p-2 rounded-xl text-center font-bold transition-colors ${
                        currentModule === 'recruitment' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Recruitment
                    </button>
                    <button
                      onClick={() => {
                        onChangeModule('tasks');
                        setDropdownOpen(false);
                      }}
                      className={`p-2 rounded-xl text-center font-bold transition-colors ${
                        currentModule === 'tasks' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Tasks &amp; KPI
                    </button>
                  </div>
                </div>
              )}


              <div className="px-2 pt-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
