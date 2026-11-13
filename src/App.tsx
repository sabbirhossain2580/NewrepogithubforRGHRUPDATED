// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, NavTab, PortalModule } from './components/Sidebar.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { OverdueAlertCenter } from './components/OverdueAlertCenter.tsx';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView.tsx';
import { ResponsibilitiesView } from './components/ResponsibilitiesView.tsx';
import { TaskRegisterView } from './components/TaskRegisterView.tsx';
import { ReportsExportView } from './components/ReportsExportView.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';

// Recruitment Components
import { RecruitmentDashboardView } from './components/recruitment/RecruitmentDashboardView.tsx';
import { RecruitmentChecklistView } from './components/recruitment/RecruitmentChecklistView.tsx';
import { RecruitmentPerformanceView } from './components/recruitment/RecruitmentPerformanceView.tsx';
import { RecruitmentAnalyticsView } from './components/recruitment/RecruitmentAnalyticsView.tsx';
import { RecruitmentCalendarView } from './components/recruitment/RecruitmentCalendarView.tsx';
import { RecruitmentReportsView } from './components/recruitment/RecruitmentReportsView.tsx';
import { SyncStatus } from './components/recruitment/RecruitmentRealtimeIndicator.tsx';

import { api } from './lib/api.ts';
import {
  Employee,
  Task,
  KPI,
  Responsibility,
  DashboardStats,
  NotificationItem,
  AppSetting,
  PerformanceRankItem,
  RecruitmentRequisition,
  RecruitmentStats,
  RecruitmentAuditLog,
} from './types/index.ts';

const MainAppContent: React.FC = () => {
  const { activePersona, isAuthenticated } = useAuth();

  // Active module & tab: default to Recruitment Overview!
  const [currentModule, setCurrentModule] = useState<PortalModule>('recruitment');
  const [activeTab, setActiveTab] = useState<NavTab>('recruitment-overview');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);

  // Recruitment Data States
  const [recruitmentRequisitions, setRecruitmentRequisitions] = useState<RecruitmentRequisition[]>([]);
  const [recruitmentStats, setRecruitmentStats] = useState<RecruitmentStats | null>(null);
  const [recruitmentLogs, setRecruitmentLogs] = useState<RecruitmentAuditLog[]>([]);
  const [recruitmentLoading, setRecruitmentLoading] = useState(true);
  const [recruitmentSyncStatus, setRecruitmentSyncStatus] = useState<SyncStatus>('connected');
  const [recruitmentLastUpdated, setRecruitmentLastUpdated] = useState<string | null>(null);

  // Dashboard Status Filter & Just Moved Record Tracking for Visual Confirmation
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<string>('ALL');
  const [justMovedRequisitionId, setJustMovedRequisitionId] = useState<number | null>(null);

  // Task & KPI Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [rankings, setRankings] = useState<PerformanceRankItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications modal
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // All authenticated HR personnel have full access to add, edit, import, and rate requisitions
  const canEditRecruitment = true;
  const canRateRecruitment = true;

  // Load Recruitment Data from Database
  const loadRecruitmentData = async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setRecruitmentLoading(true);
    setRecruitmentSyncStatus('syncing');

    try {
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('rg_recruitment_cache'); } catch {}
      }
      const [reqsRes, analyticsRes, logsRes] = await Promise.allSettled([
        api.getRecruitmentRequisitions(),
        api.getRecruitmentAnalytics(),
        api.getRecruitmentAuditLogs(),
      ]);

      const reqs = reqsRes.status === 'fulfilled' ? reqsRes.value : [];
      const analytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;
      const logs = logsRes.status === 'fulfilled' ? logsRes.value : [];

      setRecruitmentRequisitions(reqs);
      setRecruitmentStats(analytics);
      setRecruitmentLogs(logs);
      setRecruitmentSyncStatus('connected');
      setRecruitmentLastUpdated(new Date().toISOString());
    } catch (error) {
      console.warn('Recruitment data sync note:', error);
      setRecruitmentSyncStatus('error');
    } finally {
      if (!silent) setRecruitmentLoading(false);
    }
  };

  // Load Task & KPI Data
  const loadTaskData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [
        dashStatsRes,
        empListRes,
        taskListRes,
        kpiListRes,
        respListRes,
        rankDataRes,
        notifListRes,
        settingsListRes,
      ] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getEmployees(),
        api.getTasks(),
        api.getKpis(),
        api.getResponsibilities(),
        api.getRankings(),
        api.getNotifications(),
        api.getSettings(),
      ]);

      if (dashStatsRes.status === 'fulfilled') setStats(dashStatsRes.value);
      if (empListRes.status === 'fulfilled') setEmployees(empListRes.value);
      if (taskListRes.status === 'fulfilled') setTasks(taskListRes.value);
      if (kpiListRes.status === 'fulfilled') setKpis(kpiListRes.value);
      if (respListRes.status === 'fulfilled') setResponsibilities(respListRes.value);
      if (rankDataRes.status === 'fulfilled') setRankings(rankDataRes.value.rankings || []);
      if (notifListRes.status === 'fulfilled') setNotifications(notifListRes.value || []);
      if (settingsListRes.status === 'fulfilled') setSettings(settingsListRes.value || []);
    } catch (error) {
      console.error('Failed to load portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    if (isAuthenticated) {
      loadRecruitmentData();
      loadTaskData();
    }
  }, [activePersona, isAuthenticated]);

  // Real-Time Background Synchronization Polling (Every 6 Seconds for Multi-User Simultaneous Collaboration)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadRecruitmentData(true);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Recruitment Actions
  const handleSaveRequisition = async (data: Partial<RecruitmentRequisition>) => {
    let savedRecord: RecruitmentRequisition | null = null;
    if (data.id) {
      savedRecord = await api.updateRecruitmentRequisition(data.id, data);
    } else {
      savedRecord = await api.createRecruitmentRequisition(data);
    }
    await loadRecruitmentData(true);

    if (data.recruitmentStatus === 'Joined' && savedRecord) {
      setDashboardStatusFilter('Joined');
      setJustMovedRequisitionId(savedRecord.id);
    }
    return savedRecord;
  };

  const handleDeleteRequisition = async (id: number) => {
    await api.deleteRecruitmentRequisition(id);
    await loadRecruitmentData(true);
  };

  const handleImportExcel = async (records: Partial<RecruitmentRequisition>[]) => {
    await api.importRecruitmentExcel(records);
    await loadRecruitmentData(false);
  };

  const handleRateEmployee = async (data: {
    employeeCode: string;
    employeeName: string;
    ratingScore: number;
    feedback?: string;
  }) => {
    await api.submitRecruitmentRating(data);
    await loadRecruitmentData(true);
  };

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Active counts
  const overdueCount = tasks.filter((t) => t.isOverdue && t.status !== 'Completed').length;
  const pokedCount = tasks.filter((t) => t.isPoked && t.status !== 'Completed').length;
  const pendingApprovalCount = tasks.filter(
    (t) =>
      (t.status === 'Submitted for Review' || t.approvalStatus === 'Pending Review') &&
      t.status !== 'Completed'
  ).length;

  const currentEmpId = employees.find((e) => e.employeeCode === activePersona.employeeCode)?.id;
  const myTaskCount = tasks.filter((t) => {
    const s = (t.status || '').toLowerCase().trim();
    if (s === 'completed' || s === 'complete' || s === 'done' || s === 'cancelled') {
      return false;
    }
    return (
      t.employeeCode === activePersona.employeeCode ||
      (currentEmpId != null && t.assignedEmployeeId === currentEmpId) ||
      t.employeeName?.toLowerCase() === activePersona.name.toLowerCase()
    );
  }).length;

  const totalRequisitionsCount = recruitmentStats?.cards.totalRequisitions ?? recruitmentRequisitions.length;
  const recruitmentAlertsCount = recruitmentStats
    ? recruitmentStats.alerts.ongoingOlder60 +
      recruitmentStats.alerts.heldUp +
      recruitmentStats.alerts.missingDOJ
    : 0;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'} flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200`}>
      {/* Top Navbar */}
      <Navbar
        overdueCount={overdueCount}
        notifications={notifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onNavigateToOverdue={() => {
          setCurrentModule('tasks');
          setActiveTab('poked-overdue');
        }}
        currentModule={currentModule}
        onChangeModule={(mod) => {
          setCurrentModule(mod);
          if (mod === 'recruitment') {
            setActiveTab('recruitment-overview');
          } else {
            setActiveTab('dashboard');
          }
        }}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Workspace with Sidebar & Active View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentModule={currentModule}
            setCurrentModule={setCurrentModule}
            totalRequisitionsCount={totalRequisitionsCount}
            recruitmentAlertsCount={recruitmentAlertsCount}
            overdueCount={overdueCount}
            pendingApprovalCount={pendingApprovalCount}
            pokedCount={pokedCount}
            myTaskCount={myTaskCount}
          />
        </div>

        {/* Dynamic Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* ---------------------------------------------------------------- */}
            {/* RECRUITMENT PORTAL VIEWS */}
            {/* ---------------------------------------------------------------- */}

            {activeTab === 'recruitment-overview' && (
              <RecruitmentDashboardView
                stats={recruitmentStats}
                requisitions={recruitmentRequisitions}
                loading={recruitmentLoading}
                syncStatus={recruitmentSyncStatus}
                lastUpdated={recruitmentLastUpdated}
                onRefresh={() => loadRecruitmentData(false)}
                onNavigateToChecklist={() => setActiveTab('recruitment-checklist')}
                onNavigateToPerformance={() => setActiveTab('recruitment-performance')}
                onNavigateToReports={() => setActiveTab('recruitment-reports')}
                onSaveRequisition={handleSaveRequisition}
                onDeleteRequisition={handleDeleteRequisition}
                canEdit={canEditRecruitment}
                currentUserName={activePersona.name}
                currentUserCode={activePersona.employeeCode}
                initialStatusFilter={dashboardStatusFilter}
                justMovedRequisitionId={justMovedRequisitionId}
                onClearJustMoved={() => setJustMovedRequisitionId(null)}
                employees={employees}
                onNavigateToEmployees={() => setActiveTab('employees')}
              />
            )}

            {activeTab === 'recruitment-checklist' && (
              <RecruitmentChecklistView
                requisitions={recruitmentRequisitions}
                loading={recruitmentLoading}
                syncStatus={recruitmentSyncStatus}
                lastUpdated={recruitmentLastUpdated}
                onRefresh={() => loadRecruitmentData(false)}
                onSaveRequisition={handleSaveRequisition}
                onDeleteRequisition={handleDeleteRequisition}
                onImportExcel={handleImportExcel}
                canEdit={canEditRecruitment}
                currentUserName={activePersona.name}
                currentUserCode={activePersona.employeeCode}
                userRole={activePersona.role}
                onNavigateToDashboardJoined={(reqId) => {
                  if (reqId) setJustMovedRequisitionId(reqId);
                  setDashboardStatusFilter('Joined');
                  setActiveTab('recruitment-overview');
                }}
                employees={employees}
                onNavigateToEmployees={() => setActiveTab('employees')}
              />
            )}

            {activeTab === 'recruitment-performance' && (
              <RecruitmentPerformanceView
                employees={recruitmentStats?.charts.employeeContributions || []}
                loading={recruitmentLoading}
                syncStatus={recruitmentSyncStatus}
                lastUpdated={recruitmentLastUpdated}
                onRefresh={() => loadRecruitmentData(false)}
                currentUserName={activePersona.name}
                currentUserCode={activePersona.employeeCode}
                onNavigateToEmployees={() => setActiveTab('employees')}
              />
            )}

            {activeTab === 'recruitment-analytics' && (
              <RecruitmentAnalyticsView
                stats={recruitmentStats}
                requisitions={recruitmentRequisitions}
                loading={recruitmentLoading}
                syncStatus={recruitmentSyncStatus}
                lastUpdated={recruitmentLastUpdated}
                onRefresh={() => loadRecruitmentData(false)}
                onNavigateToChecklist={() => setActiveTab('recruitment-checklist')}
              />
            )}

            {activeTab === 'recruitment-calendar' && (
              <RecruitmentCalendarView
                requisitions={recruitmentRequisitions}
                syncStatus={recruitmentSyncStatus}
                lastUpdated={recruitmentLastUpdated}
                onRefresh={() => loadRecruitmentData(false)}
              />
            )}

            {activeTab === 'recruitment-reports' && (
              <RecruitmentReportsView
                requisitions={recruitmentRequisitions}
                stats={recruitmentStats}
                syncStatus={recruitmentSyncStatus}
                lastUpdated={recruitmentLastUpdated}
                onRefresh={() => loadRecruitmentData(false)}
              />
            )}

            {/* ---------------------------------------------------------------- */}
            {/* TASK & KPI MANAGEMENT VIEWS */}
            {/* ---------------------------------------------------------------- */}

            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                tasks={tasks}
                employees={employees}
                loading={loading}
                onNavigateToOverdue={() => setActiveTab('poked-overdue')}
                onNavigateToTasks={() => setActiveTab('tasks')}
                onNavigateToKpis={() => setActiveTab('tasks')}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="all"
                onRefresh={loadTaskData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadTaskData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadTaskData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadTaskData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadTaskData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadTaskData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadTaskData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadTaskData();
                }}
              />
            )}

            {activeTab === 'my-tasks' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="my-tasks"
                onRefresh={loadTaskData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadTaskData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadTaskData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadTaskData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadTaskData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadTaskData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadTaskData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadTaskData();
                }}
              />
            )}

            {activeTab === 'pending-approvals' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="pending-approvals"
                onRefresh={loadTaskData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadTaskData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadTaskData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadTaskData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadTaskData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadTaskData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadTaskData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadTaskData();
                }}
              />
            )}

            {activeTab === 'poked-overdue' && (
              <TaskRegisterView
                tasks={tasks}
                employees={employees}
                responsibilities={responsibilities}
                viewMode="poked-overdue"
                onRefresh={loadTaskData}
                onCreateTask={async (data) => {
                  await api.createTask(data);
                  await loadTaskData();
                }}
                onUpdateTask={async (id, data) => {
                  await api.updateTask(id, data);
                  await loadTaskData();
                }}
                onDeleteTask={async (id) => {
                  await api.deleteTask(id);
                  await loadTaskData();
                }}
                onSubmitTask={async (id, data) => {
                  await api.submitTask(id, data);
                  await loadTaskData();
                }}
                onReviewTask={async (id, data) => {
                  await api.reviewTask(id, data);
                  await loadTaskData();
                }}
                onRequestExtension={async (id, data) => {
                  await api.requestExtension(id, data);
                  await loadTaskData();
                }}
                onDecideExtension={async (id, data) => {
                  await api.decideExtension(id, data);
                  await loadTaskData();
                }}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeDirectoryView
                employees={employees}
                tasks={tasks}
                kpis={kpis}
                responsibilities={responsibilities}
                onRefresh={async () => {
                  await loadTaskData();
                  await loadRecruitmentData(true);
                }}
                onCreateEmployee={async (data) => {
                  await api.createEmployee(data);
                  await loadTaskData();
                  await loadRecruitmentData(true);
                }}
                onUpdateEmployee={async (id, data) => {
                  await api.updateEmployee(id, data);
                  await loadTaskData();
                  await loadRecruitmentData(true);
                }}
                onDeleteEmployee={async (id) => {
                  await api.deleteEmployee(id);
                  await loadTaskData();
                  await loadRecruitmentData(true);
                }}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsExportView
                tasks={tasks}
                employees={employees}
                kpis={kpis}
                responsibilities={responsibilities}
                rankings={rankings}
              />
            )}

          </div>
        </main>
      </div>
      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={async (id) => {
          await api.markNotificationRead(id);
          loadTaskData();
        }}
        onNavigateToTask={(taskId) => {
          setCurrentModule('tasks');
          setActiveTab('tasks');
          setNotificationsOpen(false);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
