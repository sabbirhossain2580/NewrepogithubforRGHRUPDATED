// src/components/recruitment/RecruitmentPerformanceView.tsx
import React, { useState } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  User,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Layers,
  Info,
  ChevronRight,
  Filter,
  Activity,
  AlertTriangle,
  Zap,
  UserPlus,
  Users,
} from 'lucide-react';
import { EmployeeRecruitmentProfile } from '../../types/index.ts';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';

interface Props {
  employees: EmployeeRecruitmentProfile[];
  loading: boolean;
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
  currentUserName?: string;
  currentUserCode?: string;
  onNavigateToEmployees?: () => void;
}

export interface PerformanceBreakdown {
  score: number;
  speedScore: number;
  fulfillmentScore: number;
  pipelineScore: number;
  slaScore: number;
  performanceTier: 'Outstanding' | 'High Performer' | 'Proficient' | 'Needs Attention' | 'Unassigned';
  badgeColor: string;
}

// 100% Objective Algorithmic Rating Engine
// Neither Syeda Shaila Ashraf nor Shahriyar Naiem can manually adjust or enter ratings.
export const computeDetailedPerformance = (emp: EmployeeRecruitmentProfile): PerformanceBreakdown => {
  if (emp.totalAssigned === 0) {
    return {
      score: 0,
      speedScore: 0,
      fulfillmentScore: 0,
      pipelineScore: 0,
      slaScore: 0,
      performanceTier: 'Unassigned',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
    };
  }

  // 1. Fulfillment & Conversion Score (up to 2.0 points)
  // Conversion of assigned requisitions to joined candidates
  const fulfillmentScore = Math.min(2.0, Math.max(0.6, (emp.completionRate / 100) * 2.0));

  // 2. Speed / Time to Fill SLA (up to 1.5 points)
  // Corporate Benchmark: Target <= 60 calendar days
  let speedScore = 1.0;
  if (emp.avgTimeToFill > 0) {
    if (emp.avgTimeToFill <= 45) speedScore = 1.5;
    else if (emp.avgTimeToFill <= 60) speedScore = 1.3;
    else if (emp.avgTimeToFill <= 75) speedScore = 1.0;
    else if (emp.avgTimeToFill <= 90) speedScore = 0.6;
    else speedScore = 0.3;
  } else {
    // Requisitions actively ongoing within normal 60-day corporate SLA
    speedScore = 1.2;
  }

  // 3. Pipeline Health & Fluidity (up to 1.0 point, minus penalties for bottlenecks)
  let pipelineScore = 1.0;
  if (emp.heldUp > 0) {
    pipelineScore = Math.max(0.2, 1.0 - emp.heldUp * 0.35);
  }

  // 4. Process Compliance & Data SLA (0.5 point base)
  const slaScore = 0.5;

  const rawScore = fulfillmentScore + speedScore + pipelineScore + slaScore;
  const clamped = Math.min(5.0, Math.max(1.0, Math.round(rawScore * 10) / 10));

  let performanceTier: PerformanceBreakdown['performanceTier'] = 'Proficient';
  let badgeColor = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

  if (clamped >= 4.6) {
    performanceTier = 'Outstanding';
    badgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  } else if (clamped >= 4.0) {
    performanceTier = 'High Performer';
    badgeColor = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  } else if (clamped >= 3.0) {
    performanceTier = 'Proficient';
    badgeColor = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  } else {
    performanceTier = 'Needs Attention';
    badgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  }

  return {
    score: clamped,
    speedScore: Math.round(speedScore * 10) / 10,
    fulfillmentScore: Math.round(fulfillmentScore * 10) / 10,
    pipelineScore: Math.round(pipelineScore * 10) / 10,
    slaScore,
    performanceTier,
    badgeColor,
  };
};

export const RecruitmentPerformanceView: React.FC<Props> = ({
  employees,
  loading,
  syncStatus,
  lastUpdated,
  onRefresh,
  onNavigateToEmployees,
}) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'active'>('all');

  if (loading || employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading HR team recruitment performance metrics...</p>
      </div>
    );
  }

  // Computed department statistics
  const assignedEmployees = employees.filter((e) => e.totalAssigned > 0);
  const totalDepartmentAssigned = employees.reduce((acc, e) => acc + e.totalAssigned, 0);
  const totalDepartmentJoined = employees.reduce((acc, e) => acc + e.joined, 0);
  const totalDepartmentOngoing = employees.reduce((acc, e) => acc + e.ongoing, 0);
  const totalDepartmentHeldUp = employees.reduce((acc, e) => acc + e.heldUp, 0);

  const ratedEmployees = employees
    .map((e) => computeDetailedPerformance(e))
    .filter((b) => b.score > 0);
  const averageTeamRating =
    ratedEmployees.length > 0
      ? (ratedEmployees.reduce((sum, b) => sum + b.score, 0) / ratedEmployees.length).toFixed(1)
      : 'N/A';

  const displayedEmployees = filterMode === 'active' ? assignedEmployees : employees;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
              Talent Acquisition Team
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              4 Core HR Executives • Real-Time Performance Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            HR Recruitment Performance &amp; Automated Star Ratings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            100% objective, algorithm-driven performance evaluation. No manual ratings or supervisory bias.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onNavigateToEmployees && (
            <button
              onClick={onNavigateToEmployees}
              className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Manage Team &amp; Recruiters</span>
            </button>
          )}

          <button
            onClick={() => setShowFormulaModal(true)}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition flex items-center space-x-1.5 shadow-xs"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Rating Formula Matrix</span>
          </button>
          <RecruitmentRealtimeIndicator
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Realistic Enterprise Performance Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 shadow-xl border border-blue-900/50 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Algorithmic Performance Engine v2.4 (Active)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              System-Calculated Objective Ratings
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Ratings are computed in real time from live database requisitions. Neither the Head of HR nor HR Manager can assign or edit ratings manually. Scores reflect actual Turnaround Time (Time to Fill), Joining Fulfillment Rate, and Active Pipeline SLA.
            </p>
          </div>

          {/* Department High-Level KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Avg Team Rating</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1 flex items-center justify-center space-x-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span>{averageTeamRating}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Scale: 1.0 – 5.0</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Total Requisitions</div>
              <div className="text-2xl font-black text-white font-mono mt-1">{totalDepartmentAssigned}</div>
              <div className="text-[10px] text-emerald-300 mt-0.5">{totalDepartmentJoined} joined candidates</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Active Pipeline</div>
              <div className="text-2xl font-black text-cyan-300 font-mono mt-1">{totalDepartmentOngoing}</div>
              <div className="text-[10px] text-amber-300 mt-0.5">{totalDepartmentHeldUp} held up requisitions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            All 4 HR Executives ({employees.length})
          </button>
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterMode === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            Active Workloads ({assignedEmployees.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Automated evaluation refreshed on every requisition update
        </div>
      </div>

      {/* 4 Employee Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedEmployees.map((emp) => {
          const breakdown = computeDetailedPerformance(emp);
          const hasAssignments = emp.totalAssigned > 0;

          return (
            <div
              key={emp.employeeCode}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4.5 relative overflow-hidden group"
            >
              {/* Card Top Banner / Accent Bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  hasAssignments
                    ? breakdown.score >= 4.5
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />

              {/* Profile Card Header */}
              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-13 h-13 rounded-2xl font-black flex items-center justify-center text-base shadow-sm ${
                      hasAssignments
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {emp.employeeName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                      {emp.employeeName}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {emp.designation}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                        {emp.employeeCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${breakdown.badgeColor}`}
                      >
                        {breakdown.performanceTier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Star Rating Badge - 100% System Calculated */}
                <div className="text-right shrink-0">
                  {hasAssignments ? (
                    <div className="inline-flex flex-col items-end">
                      <div className="inline-flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 px-3 py-1 rounded-full shadow-2xs">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">
                          {breakdown.score.toFixed(1)}
                        </span>
                        <span className="text-[11px] text-amber-600/80 font-bold">/ 5.0</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>Auto Calculated</span>
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex flex-col items-end">
                      <div className="inline-flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-slate-500">
                        <span className="text-xs font-bold font-mono">N/A</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium">No tasks assigned</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Metric Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Handled</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {emp.totalAssigned}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Joined
                  </div>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                    {emp.joined}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Ongoing
                  </div>
                  <div className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                    {emp.ongoing}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Held Up
                  </div>
                  <div
                    className={`text-lg font-black font-mono mt-0.5 ${
                      emp.heldUp > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {emp.heldUp}
                  </div>
                </div>
              </div>

              {/* Automated Performance Dimension Breakdown (Realistic Corporate Dashboard) */}
              {hasAssignments ? (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-[11px] text-slate-700 dark:text-slate-300">
                    <span className="flex items-center space-x-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Objective Performance Dimensions</span>
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Weighted Breakdown</span>
                  </div>

                  {/* 1. Fulfillment Rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">Joining Fulfillment Rate:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {emp.completionRate}% ({breakdown.fulfillmentScore.toFixed(1)} / 2.0 pts)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${emp.completionRate}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* 2. Turnaround Velocity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">Time-to-Fill SLA Velocity:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {emp.avgTimeToFill > 0 ? `${emp.avgTimeToFill}d avg` : 'Target: ≤60d'} (
                        {breakdown.speedScore.toFixed(1)} / 1.5 pts)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${
                            emp.avgTimeToFill > 0
                              ? Math.max(10, Math.min(100, Math.round((60 / Math.max(1, emp.avgTimeToFill)) * 100)))
                              : 85
                          }%`,
                        }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* 3. Pipeline Health */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">Pipeline Fluidity &amp; Health:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {breakdown.pipelineScore.toFixed(1)} / 1.0 pt {emp.heldUp > 0 ? `(-${emp.heldUp * 0.35} penalty)` : '(No bottlenecks)'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
                  No recruitment requisitions have been assigned to {emp.employeeName} yet. The performance engine will automatically calculate star ratings upon first requisition allocation.
                </div>
              )}

              {/* Turnaround Time Footer Metric */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Average Turnaround Time:
                  </span>
                </div>
                <span className="font-mono font-extrabold text-blue-700 dark:text-blue-300 text-sm">
                  {emp.avgTimeToFill > 0 ? `${emp.avgTimeToFill} Calendar Days` : 'Awaiting DOJ'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Corporate Team Throughput & Comparison Matrix */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Talent Acquisition Benchmark Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side comparison across all 4 authorized HR team members
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              Department Target: ≥ 80% Fulfillment
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">HR Employee</th>
                <th className="p-3">Designation</th>
                <th className="p-3 text-center">Requisitions</th>
                <th className="p-3 text-center">Joined</th>
                <th className="p-3 text-center">Ongoing</th>
                <th className="p-3 text-center">Fulfillment %</th>
                <th className="p-3 text-center">Avg Time to Fill</th>
                <th className="p-3 text-center">Performance Tier</th>
                <th className="p-3 text-center">System Star Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map((emp) => {
                const breakdown = computeDetailedPerformance(emp);
                const hasAssignments = emp.totalAssigned > 0;

                return (
                  <tr key={emp.employeeCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>{emp.employeeName}</span>
                    </td>
                    <td className="p-3 text-slate-500">{emp.designation}</td>
                    <td className="p-3 text-center font-mono font-bold">{emp.totalAssigned}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600">{emp.joined}</td>
                    <td className="p-3 text-center font-mono font-bold text-blue-600">{emp.ongoing}</td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        {emp.completionRate}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-semibold">
                      {emp.avgTimeToFill > 0 ? `${emp.avgTimeToFill}d` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${breakdown.badgeColor}`}>
                        {breakdown.performanceTier}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {hasAssignments ? (
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 inline-flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{breakdown.score.toFixed(1)}</span>
                          <span className="text-[10px] text-amber-600/70 font-normal">/ 5.0</span>
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transparent Algorithmic Rating Formula Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Automated Performance Formula
                  </h3>
                  <p className="text-xs text-slate-500">Objective System Rating Architecture</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1">
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  Zero Manual Rating Principle:
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  To ensure complete fairness and eliminate subjective bias, neither the Head of HR (Syeda Shaila Ashraf) nor the HR Manager (Shahriyar Naiem) can manually alter employee star ratings. Ratings are derived automatically from live requisition execution.
                </p>
              </div>

              <div className="space-y-2 pt-1 font-mono text-[11px]">
                <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold text-slate-800 dark:text-slate-200">1. Fulfillment / Conversion (40%)</span>
                  <span className="text-emerald-600 font-bold">Up to 2.0 pts</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold text-slate-800 dark:text-slate-200">2. Time-to-Fill SLA Speed (Target: ≤60 Days, 30%)</span>
                  <span className="text-indigo-600 font-bold">Up to 1.5 pts</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold text-slate-800 dark:text-slate-200">3. Pipeline Fluidity &amp; Bottlenecks (20%)</span>
                  <span className="text-blue-600 font-bold">Up to 1.0 pt</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-bold text-slate-800 dark:text-slate-200">4. SLA Compliance &amp; Base (10%)</span>
                  <span className="text-slate-600 font-bold">0.5 pt</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Scale: 1.0 to 5.0 Stars. If no requisitions have been assigned to an employee, the system shows N/A to prevent incorrect ratings.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
