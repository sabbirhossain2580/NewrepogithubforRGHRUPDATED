// src/components/Sidebar.tsx
import React from 'react';
import {
  LayoutDashboard,
  AlertOctagon,
  Users,
  CheckSquare,
  Clock,
  History,
  FileCheck,
  Settings,
  ShieldAlert,
  UserCheck,
  FileSpreadsheet,
  Briefcase,
  PlusCircle,
  Award,
  BarChart3,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type PortalModule = 'recruitment' | 'tasks';

export type NavTab =
  // Recruitment Portal (Flagship)
  | 'recruitment-overview'
  | 'recruitment-checklist'
  | 'recruitment-performance'
  | 'recruitment-analytics'
  | 'recruitment-calendar'
  | 'recruitment-reports'
  // Task & KPI Management
  | 'dashboard'
  | 'tasks'
  | 'my-tasks'
  | 'pending-approvals'
  | 'poked-overdue'
  | 'employees'
  | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentModule: PortalModule;
  setCurrentModule: (mod: PortalModule) => void;
  totalRequisitionsCount?: number;
  recruitmentAlertsCount?: number;
  overdueCount: number;
  pendingApprovalCount: number;
  pokedCount: number;
  myTaskCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentModule,
  setCurrentModule,
  totalRequisitionsCount = 7,
  recruitmentAlertsCount = 0,
  overdueCount,
  pendingApprovalCount,
  pokedCount,
  myTaskCount,
}) => {
  const { activePersona } = useAuth();

  // Recruitment Navigation Items
  const recruitmentNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    subtext?: string;
    adminOnly?: boolean;
    onClick?: () => void;
  }> = [
    {
      id: 'recruitment-overview',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      subtext: 'Overview, HOD pipeline & TTF',
    },
    {
      id: 'recruitment-checklist',
      label: 'Recruitment Checklist',
      icon: Briefcase,
      badge: totalRequisitionsCount > 0 ? totalRequisitionsCount : null,
      badgeColor: 'bg-blue-600 text-white font-mono',
      subtext: 'Master MRF register & edits',
    },
    {
      id: 'recruitment-performance',
      label: 'HR Recruitment Performance',
      icon: Award,
      subtext: 'Workload & turnaround ratings',
    },
    {
      id: 'recruitment-analytics',
      label: 'Recruitment Analytics',
      icon: BarChart3,
      subtext: 'SLA metrics & department velocity',
    },
    {
      id: 'recruitment-calendar',
      label: 'Recruitment Calendar',
      icon: Calendar,
      subtext: 'DOJ milestones & interview schedules',
    },
    {
      id: 'recruitment-reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
      subtext: 'Excel & PDF executive downloads',
    },
    {
      id: 'employees',
      label: 'HR Team & Recruiters',
      icon: Users,
      subtext: 'Add recruiters, manage & remove resigned',
    },
  ];

  // Task & KPI Management Items
  const taskNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    subtext?: string;
    adminOnly?: boolean;
    onClick?: () => void;
  }> = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      subtext: 'Departmental KPI & workload summary',
    },
    {
      id: 'tasks',
      label: 'All Tasks Register',
      icon: CheckSquare,
      subtext: 'Assignments, progress & reviews',
    },
    {
      id: 'my-tasks',
      label: 'My Assigned Tasks',
      icon: UserCheck,
      badge: myTaskCount > 0 ? myTaskCount : null,
      badgeColor: 'bg-indigo-600 text-white font-mono',
      subtext: `Tasks for ${activePersona.name.split(' ')[0]}`,
    },
    {
      id: 'pending-approvals',
      label: 'Pending Approvals',
      icon: FileCheck,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-mono font-bold',
      subtext: 'Submitted tasks for review',
    },
    {
      id: 'poked-overdue',
      label: 'Poked & Overdue',
      icon: ShieldAlert,
      badge: pokedCount + overdueCount > 0 ? pokedCount + overdueCount : null,
      badgeColor: 'bg-red-600 text-white animate-pulse font-mono font-bold',
      subtext: 'Urgent follow-ups & SLA breaches',
    },
    {
      id: 'employees',
      label: 'HR Team Directory',
      icon: Users,
      subtext: 'Add members, manage & remove resigned',
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
      subtext: 'Export Excel & CSV reports',
    },
  ];

  const currentItems = currentModule === 'recruitment' ? recruitmentNavItems : taskNavItems;

  const isEditor = [
    '01-02-0440', // Syeda Shaila Ashraf (Head of HR)
    '22-02-1826', // Shahriyar Naiem
    '22-02-1330', // Quazi Nuzhat Rahman
    '22-02-1642', // Sabbir Hossain
    '02-02-2059', // Fariha Nasmi
    '22-02-1551', // Maisha Islam
    '02-02-2222', // System Admin
  ].includes(activePersona.employeeCode) ||
    activePersona.role === 'admin' ||
    activePersona.role === 'head_of_hr' ||
    activePersona.role === 'hr_manager';

  const canAccessAdmin =
    activePersona.role === 'admin' ||
    activePersona.role === 'head_of_hr' ||
    activePersona.employeeCode === '01-02-0440' ||
    activePersona.employeeCode === '22-02-1826';

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800/90 flex flex-col justify-between py-4 text-slate-300 shrink-0 select-none">
      <div className="space-y-3 px-3">
        {/* Module Switcher Tabs with Crisp Corporate Icons */}
        <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex text-xs shadow-inner">
          <button
            onClick={() => {
              setCurrentModule('recruitment');
              setActiveTab('recruitment-overview');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all flex items-center justify-center space-x-1.5 ${
              currentModule === 'recruitment'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Recruitment</span>
          </button>
          <button
            onClick={() => {
              setCurrentModule('tasks');
              setActiveTab('dashboard');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center transition-all flex items-center justify-center space-x-1.5 ${
              currentModule === 'tasks'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks &amp; KPI</span>
          </button>
        </div>

        <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>{currentModule === 'recruitment' ? 'Recruitment System' : 'Task & KPI Portal'}</span>
          <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono font-medium border border-slate-700/60">
            {currentModule === 'recruitment' ? `${totalRequisitionsCount} MRFs` : 'Active'}
          </span>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          {currentItems.map((item) => {
            if (item.adminOnly && !canAccessAdmin) {
              return null;
            }

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all group ${
                  isActive
                    ? currentModule === 'recruitment'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-600/20'
                      : 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                    : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <div className="truncate">
                    <div className="leading-tight truncate font-semibold">{item.label}</div>
                    {item.subtext && (
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.subtext}
                      </div>
                    )}
                  </div>
                </div>

                {item.badge != null && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 font-mono ${
                      item.badgeColor || 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logged in Employee Quick Profile Card */}
      <div className="px-3 pt-3 border-t border-slate-800/80 space-y-2">
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Authorized Session
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">{activePersona.employeeCode}</span>
          </div>
          <div className="font-bold text-white text-xs mt-1 truncate">
            {activePersona.name}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{activePersona.designation}</div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Recruitment Privileges:</span>
            {isEditor ? (
              <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Full Access</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-purple-300 font-bold font-mono">
                <Lock className="w-3 h-3 text-purple-400" />
                <span>Executive View</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
