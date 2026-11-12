// src/components/DashboardView.tsx
import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Award,
  AlertOctagon,
  Calendar,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { DashboardStats, Task, Employee } from '../types/index.ts';

interface DashboardViewProps {
  stats: DashboardStats | null;
  tasks: Task[];
  employees: Employee[];
  loading: boolean;
  onNavigateToOverdue: () => void;
  onNavigateToTasks: () => void;
  onNavigateToKpis: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  tasks,
  employees,
  loading,
  onNavigateToOverdue,
  onNavigateToTasks,
  onNavigateToKpis,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Loading live dashboard metrics from database...</p>
      </div>
    );
  }

  const { cards, charts } = stats;
  const overdueTasksList = tasks.filter((t) => t.isOverdue);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive HR &amp; OD Performance Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time organizational performance, task accountability &amp; KPI analytics • Renaissance Group
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Cycle: October 2026</span>
          </span>
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium">
            Timezone: Asia/Dhaka
          </span>
        </div>
      </div>

      {/* CRITICAL OVERDUE ALERT BANNER (If tasks are overdue) */}
      {cards.overdueTasks > 0 && (
        <div className="bg-red-50 border-2 border-red-500/80 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 bg-red-600 text-white rounded-lg shrink-0 mt-0.5 shadow-sm">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                    CRITICAL OVERDUE ALERT
                  </span>
                  <span className="text-xs text-red-700 font-medium">
                    {cards.overdueTasks} task{cards.overdueTasks > 1 ? 's' : ''} past deadline
                  </span>
                </div>
                <h3 className="text-base font-bold text-red-950 mt-1">
                  Immediate Management Review Required
                </h3>
                {overdueTasksList[0] && (
                  <p className="text-xs md:text-sm text-red-800 mt-1 leading-relaxed bg-white/70 p-3 rounded-lg border border-red-200">
                    <strong className="text-red-900">OVERDUE</strong> — {overdueTasksList[0].employeeName} ({overdueTasksList[0].employeeDesignation}) was assigned <span className="font-semibold">"{overdueTasksList[0].title}"</span> with a deadline of {overdueTasksList[0].originalDeadline}. Current status: <span className="font-bold uppercase text-red-600">Overdue</span> ({overdueTasksList[0].daysOverdue} days overdue). Delay reason: <span className="italic">{overdueTasksList[0].delayReason || 'Awaiting employee written explanation'}</span>.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onNavigateToOverdue}
              className="hidden sm:flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition shrink-0 ml-4"
            >
              <span>Open Overdue Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 10 MAIN DASHBOARD SUMMARY CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Key Performance &amp; Execution Metrics (Database Live)
          </h2>
          <span className="text-xs text-slate-400">8 Standard Performance Indicators</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* 1. Total Employees */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium text-slate-600">Total Employees</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{cards.totalEmployees}</div>
            <div className="text-[11px] text-slate-500 mt-1">HR &amp; OD core staff</div>
          </div>

          {/* 2. Total Assigned Tasks */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium text-slate-600">Total Tasks</span>
              <FileCheck className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{cards.totalAssignedTasks}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active cycle assignments</div>
          </div>

          {/* 3. Completed Tasks */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs hover:border-emerald-300 transition">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-medium text-emerald-800">Completed Tasks</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{cards.completedTasks}</div>
            <div className="text-[11px] text-emerald-600 mt-1">Reviewed &amp; approved</div>
          </div>

          {/* 4. In Progress Tasks */}
          <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-medium text-blue-800">In Progress</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">{cards.inProgressTasks}</div>
            <div className="text-[11px] text-blue-600 mt-1">Active execution</div>
          </div>

          {/* 5. Pending Tasks */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-medium text-slate-700">Pending Tasks</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{cards.pendingTasks}</div>
            <div className="text-[11px] text-slate-500 mt-1">Incomplete or pending review</div>
          </div>

          {/* 6. Overdue Tasks */}
          <div className={`p-4 rounded-xl border shadow-xs transition ${
            cards.overdueTasks > 0
              ? 'bg-red-50/70 border-red-300 text-red-900'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-700">Overdue Tasks</span>
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-extrabold text-red-600">{cards.overdueTasks}</div>
            <div className="text-[11px] text-red-700 font-medium mt-1">Past deadline date</div>
          </div>

          {/* 7. Tasks Awaiting Approval */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-300 transition">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-bold text-amber-800">Awaiting Approval</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700">{cards.awaitingApproval}</div>
            <div className="text-[11px] text-amber-700 mt-1">Submitted for manager sign-off</div>
          </div>

          {/* 8. On-Time Completion Rate */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs hover:border-emerald-300 transition">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-medium text-emerald-900">On-Time Delivery</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{cards.onTimeCompletionRate}%</div>
            <div className="text-[11px] text-emerald-600 mt-1">Delivered on/before deadline</div>
          </div>
        </div>
      </div>

      {/* DASHBOARD CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Employee-wise Task Completion */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Employee-wise Task Completion</h3>
              <p className="text-xs text-slate-500">Breakdown of completed, in-progress, and overdue tasks</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">Team Distribution</span>
          </div>

          <div className="space-y-4 pt-2">
            {charts.employeeTaskChart
              .filter(
                (emp) =>
                  !emp.fullName.toLowerCase().includes('shaila') &&
                  !emp.fullName.toLowerCase().includes('syeda')
              )
              .map((emp) => {
              const completedPct = emp.total > 0 ? (emp.completed / emp.total) * 100 : 0;
              const inProgressPct = emp.total > 0 ? (emp.inProgress / emp.total) * 100 : 0;
              const overduePct = emp.total > 0 ? (emp.overdue / emp.total) * 100 : 0;

              return (
                <div key={emp.fullName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{emp.fullName}</span>
                    <span className="text-slate-500 text-[11px]">
                      {emp.completed} / {emp.total} Completed ({Math.round(completedPct)}%)
                    </span>
                  </div>
                  {/* Stacked Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${completedPct}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Completed: ${emp.completed}`}
                    />
                    <div
                      style={{ width: `${inProgressPct}%` }}
                      className="bg-blue-500 h-full transition-all"
                      title={`In Progress: ${emp.inProgress}`}
                    />
                    <div
                      style={{ width: `${overduePct}%` }}
                      className="bg-red-500 h-full transition-all"
                      title={`Overdue: ${emp.overdue}`}
                    />
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] text-slate-500 pt-0.5">
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Done: {emp.completed}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      <span>Active: {emp.inProgress}</span>
                    </span>
                    {emp.overdue > 0 && (
                      <span className="flex items-center space-x-1 font-semibold text-red-600">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                        <span>Overdue: {emp.overdue}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Completed vs Pending vs Overdue Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Task Status Distribution</h3>
              <p className="text-xs text-slate-500">Proportional execution status across department</p>
            </div>
            <span className="text-xs font-medium text-slate-500">Total: {cards.totalAssignedTasks} Tasks</span>
          </div>

          <div className="space-y-3">
            {charts.taskDistribution.map((item) => {
              const pct = cards.totalAssignedTasks > 0 ? Math.round((item.value / cards.totalAssignedTasks) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 w-36">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-semibold text-slate-900">
                    {item.value} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

