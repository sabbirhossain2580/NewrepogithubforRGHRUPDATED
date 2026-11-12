// src/components/recruitment/RecruitmentDashboardView.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Briefcase,
  Layers,
  TrendingUp,
  UserCheck,
  Building,
  ArrowRight,
  Filter,
  Download,
  Calendar,
  Sparkles,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  FileText,
  BadgeCheck,
  Edit2,
  Eye,
  X,
  RotateCcw,
  Check,
} from 'lucide-react';
import { RecruitmentStats, RecruitmentRequisition, RecruitmentStatus } from '../../types/index.ts';
import {
  StatusDoughnutChart,
  MonthlyTrendsChart,
  EmployeeContributionChart,
  RecruitmentTypeChart,
  DepartmentDistributionChart,
  CompanyDistributionChart,
  MonthlyTimeToFillChart,
} from './RecruitmentCharts.tsx';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';
import { RecruitmentModal } from './RecruitmentModal.tsx';
import { Employee } from '../../types/index.ts';
import { generateLocalAnalytics } from '../../lib/api.ts';

interface Props {
  stats: RecruitmentStats | null;
  requisitions?: RecruitmentRequisition[];
  loading: boolean;
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
  onNavigateToChecklist: () => void;
  onNavigateToPerformance: () => void;
  onNavigateToReports: () => void;
  onSaveRequisition?: (data: Partial<RecruitmentRequisition>) => Promise<any>;
  onDeleteRequisition?: (id: number) => Promise<any>;
  canEdit?: boolean;
  currentUserName?: string;
  currentUserCode?: string;
  initialStatusFilter?: string;
  justMovedRequisitionId?: number | null;
  onClearJustMoved?: () => void;
  employees?: Employee[];
  onNavigateToEmployees?: () => void;
}

export const RecruitmentDashboardView: React.FC<Props> = ({
  stats,
  requisitions = [],
  loading,
  syncStatus,
  lastUpdated,
  onRefresh,
  onNavigateToChecklist,
  onNavigateToPerformance,
  onNavigateToReports,
  onSaveRequisition,
  onDeleteRequisition,
  canEdit = true,
  currentUserName = 'HR User',
  currentUserCode = '',
  initialStatusFilter = 'ALL',
  justMovedRequisitionId = null,
  onClearJustMoved,
  employees,
  onNavigateToEmployees,
}) => {
  // HOD-Wise Checklist State
  const [hodSearch, setHodSearch] = useState('');
  const [selectedHodFilter, setSelectedHodFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(initialStatusFilter || 'ALL');
  const [collapsedHods, setCollapsedHods] = useState<Record<string, boolean>>({});

  // Visual confirmation alert state
  const [visualConfirmation, setVisualConfirmation] = useState<{
    reqCode: string;
    positionTitle: string;
    department: string;
    hod?: string;
    ttf?: number;
  } | null>(null);

  // Active highlighted requisition ID (glows when moved to Joined)
  const [highlightedReqId, setHighlightedReqId] = useState<number | null>(justMovedRequisitionId);

  // In-Dashboard Editing and Detail Viewing Modal State
  const [selectedRequisitionForEdit, setSelectedRequisitionForEdit] = useState<RecruitmentRequisition | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<RecruitmentRequisition | null>(null);

  const moduleRef = useRef<HTMLDivElement>(null);

  // Sync external initialStatusFilter updates
  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== selectedStatusFilter) {
      setSelectedStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Handle auto-focus and visual feedback when justMovedRequisitionId is provided
  useEffect(() => {
    if (justMovedRequisitionId && requisitions.length > 0) {
      const targetReq = requisitions.find((r) => r.id === justMovedRequisitionId);
      if (targetReq) {
        setSelectedStatusFilter('Joined');
        setHighlightedReqId(targetReq.id);
        const hodKey = targetReq.hod && targetReq.hod.trim() ? targetReq.hod.trim() : 'Unassigned HOD';
        // Auto expand this HOD group
        setCollapsedHods((prev) => ({ ...prev, [hodKey]: false }));

        setVisualConfirmation({
          reqCode: targetReq.requisitionCode,
          positionTitle: targetReq.positionTitle,
          department: targetReq.department,
          hod: targetReq.hod,
          ttf: targetReq.timeToFillDays ?? undefined,
        });

        // Smooth scroll to the target requisition or module
        setTimeout(() => {
          const rowEl = document.getElementById(`req-row-${targetReq.id}`);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (moduleRef.current) {
            moduleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);

        // Auto clear highlight pulse after 10 seconds
        const timer = setTimeout(() => {
          setHighlightedReqId(null);
          if (onClearJustMoved) onClearJustMoved();
        }, 10000);

        return () => clearTimeout(timer);
      }
    }
  }, [justMovedRequisitionId, requisitions]);

  // Group requisitions by HOD
  const hodGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        total: number;
        vacancies: number;
        joined: number;
        ongoing: number;
        heldUp: number;
        departments: Set<string>;
        requisitions: RecruitmentRequisition[];
      }
    >();

    requisitions.forEach((r) => {
      const hodName = r.hod && r.hod.trim() ? r.hod.trim() : 'Unassigned HOD';
      if (!map.has(hodName)) {
        map.set(hodName, {
          name: hodName,
          total: 0,
          vacancies: 0,
          joined: 0,
          ongoing: 0,
          heldUp: 0,
          departments: new Set<string>(),
          requisitions: [],
        });
      }
      const item = map.get(hodName)!;
      item.total++;
      item.vacancies += r.vacancy || 1;
      if (r.recruitmentStatus === 'Joined') item.joined++;
      else if (r.recruitmentStatus === 'Ongoing') item.ongoing++;
      else if (r.recruitmentStatus === 'Held Up') item.heldUp++;
      if (r.department) item.departments.add(r.department);
      item.requisitions.push(r);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [requisitions]);

  // Unique HOD names for filter pill tabs
  const uniqueHodNames = useMemo(() => {
    return hodGroups.map((g) => g.name);
  }, [hodGroups]);

  // Status counts for category tabs
  const statusCounts = useMemo(() => {
    let joined = 0;
    let ongoing = 0;
    let heldUp = 0;
    let didNotJoin = 0;
    let cancelled = 0;

    requisitions.forEach((r) => {
      if (r.recruitmentStatus === 'Joined') joined++;
      else if (r.recruitmentStatus === 'Ongoing') ongoing++;
      else if (r.recruitmentStatus === 'Held Up') heldUp++;
      else if (r.recruitmentStatus === 'Did not Join') didNotJoin++;
      else if (r.recruitmentStatus === 'Cancelled') cancelled++;
    });

    return { joined, ongoing, heldUp, didNotJoin, cancelled, total: requisitions.length };
  }, [requisitions]);

  // Filtered HOD groups
  const filteredHodGroups = useMemo(() => {
    return hodGroups
      .filter((group) => {
        if (selectedHodFilter !== 'ALL' && group.name !== selectedHodFilter) {
          return false;
        }
        return true;
      })
      .map((group) => {
        const filteredReqs = group.requisitions.filter((r) => {
          if (selectedStatusFilter !== 'ALL' && r.recruitmentStatus !== selectedStatusFilter) {
            return false;
          }
          if (hodSearch.trim()) {
            const q = hodSearch.toLowerCase();
            const matchPos = r.positionTitle.toLowerCase().includes(q);
            const matchDept = r.department.toLowerCase().includes(q);
            const matchHod = (r.hod || '').toLowerCase().includes(q);
            const matchCode = (r.requisitionCode || '').toLowerCase().includes(q);
            const matchComp = (r.company || '').toLowerCase().includes(q);
            const matchAssisted = (r.recruitmentAssistedByName || '').toLowerCase().includes(q);
            if (!matchPos && !matchDept && !matchHod && !matchCode && !matchComp && !matchAssisted) {
              return false;
            }
          }
          return true;
        });

        return {
          ...group,
          requisitions: filteredReqs,
        };
      })
      .filter((group) => group.requisitions.length > 0 || (selectedHodFilter !== 'ALL' && !hodSearch.trim()));
  }, [hodGroups, selectedHodFilter, selectedStatusFilter, hodSearch]);

  const toggleHodCollapse = (name: string) => {
    setCollapsedHods((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getStatusBadge = (status: RecruitmentStatus) => {
    switch (status) {
      case 'Joined':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Held Up':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'Did not Join':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Switch to Joined category directly and scroll down
  const handleSelectStatusCategory = (status: string) => {
    setSelectedStatusFilter(status);
    if (moduleRef.current) {
      moduleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle requisition save directly from dashboard modal
  const handleSaveFromDashboard = async (data: Partial<RecruitmentRequisition>) => {
    if (onSaveRequisition) {
      const savedResult = await onSaveRequisition(data);
      setIsEditModalOpen(false);
      setSelectedRequisitionForEdit(null);

      // If status is updated to 'Joined', automatically switch dashboard view to Joined category!
      if (data.recruitmentStatus === 'Joined') {
        setSelectedStatusFilter('Joined');
        const targetId = data.id || savedResult?.id;
        if (targetId) {
          setHighlightedReqId(targetId);
        }
        if (data.hod) {
          setCollapsedHods((prev) => ({ ...prev, [data.hod!.trim()]: false }));
        }

        // Calculate TTF preview if dates are present
        let ttfDays: number | undefined = undefined;
        if (data.requisitionDate && data.dateOfJoining) {
          const s = new Date(data.requisitionDate).getTime();
          const e = new Date(data.dateOfJoining).getTime();
          if (!isNaN(s) && !isNaN(e)) {
            ttfDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
          }
        }

        setVisualConfirmation({
          reqCode: data.requisitionCode || 'Updated Record',
          positionTitle: data.positionTitle || 'Position',
          department: data.department || '',
          hod: data.hod,
          ttf: ttfDays,
        });

        // Scroll into view
        setTimeout(() => {
          if (targetId) {
            const rowEl = document.getElementById(`req-row-${targetId}`);
            if (rowEl) {
              rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
          }
          if (moduleRef.current) {
            moduleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
    }
  };

  // Dynamic metrics: Filter by selected HOD if selectedHodFilter !== 'ALL'
  const effectiveStats: RecruitmentStats = useMemo(() => {
    if (selectedHodFilter !== 'ALL') {
      const filteredReqs = requisitions.filter(
        (r) => (r.hod && r.hod.trim()) === selectedHodFilter
      );
      return generateLocalAnalytics(filteredReqs);
    }

    if (stats) return stats;
    return generateLocalAnalytics(requisitions);
  }, [selectedHodFilter, stats, requisitions]);

  if (loading && !stats && requisitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Connecting to database and verifying tables...</p>
        {onRefresh && (
          <button
            onClick={() => onRefresh()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
          >
            Refresh Database Connection
          </button>
        )}
      </div>
    );
  }

  const { cards, charts } = effectiveStats;

  return (
    <div className="space-y-6">
      {/* Top Header Banner with 3D Depth */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Executive Portal
            </span>
            <span className="text-xs text-slate-400 font-medium">Enterprise Edition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            RG HR – Recruitment Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time Manpower Requisition (MRF) tracking, turnaround time analysis &amp; employee workload • Renaissance Group
          </p>
        </div>

        {/* Real-time Indicator & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <RecruitmentRealtimeIndicator
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={onRefresh}
          />

          {onNavigateToEmployees && (
            <button
              onClick={onNavigateToEmployees}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-all shadow-xs"
              title="Manage HR recruiters and employees"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>HR Team &amp; Recruiters</span>
            </button>
          )}

          <button
            onClick={onNavigateToChecklist}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>Open Recruitment Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active HOD Filter Banner indicator */}
      {selectedHodFilter !== 'ALL' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white">
                Filtered Dashboard View for HOD:{' '}
                <span className="text-indigo-600 dark:text-indigo-400 underline font-mono font-bold">{selectedHodFilter}</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                All top summary metric cards, vacancy totals, completion percentages, and chart visualizations are recalculated exclusively for {selectedHodFilter}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedHodFilter('ALL')}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-indigo-800 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Reset to All HODs ({requisitions.length} Total)
          </button>
        </div>
      )}

      {/* 8 Primary KPI Cards with 3D Gradients & Interactive Category Filtering */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Requisitions */}
        <div
          onClick={() => handleSelectStatusCategory('ALL')}
          title="Click to view all requisitions in the checklist"
          className={`p-4 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white shadow-xl border cursor-pointer relative overflow-hidden group hover:scale-[1.02] transition-transform ${
            selectedStatusFilter === 'ALL' ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-blue-800/40'
          }`}
        >
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-blue-300 text-xs font-bold uppercase tracking-wider">
            <span>Total Requisitions</span>
            <Briefcase className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-white drop-shadow">
            {cards.totalRequisitions}
          </div>
          <div className="text-[11px] text-blue-200/80 mt-1 flex items-center justify-between">
            <span>MRF Raised</span>
            <span className="font-mono text-cyan-300 font-bold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* Total Vacancies */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Vacancies</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-slate-900 dark:text-white">
            {cards.totalVacancies}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Approved headcounts across units
          </div>
        </div>

        {/* Joined Employees (Interactive KPI Card: Automatically navigates to 'Joined' Category) */}
        <div
          onClick={() => handleSelectStatusCategory('Joined')}
          title="Click to automatically filter and view the 'Joined' category on the dashboard"
          className={`p-4 rounded-2xl shadow-md cursor-pointer relative overflow-hidden group hover:scale-[1.02] transition-all ${
            selectedStatusFilter === 'Joined'
              ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-emerald-100 dark:from-emerald-950/70 dark:to-slate-900 border-2 border-emerald-500 ring-4 ring-emerald-500/30'
              : 'bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-white dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center space-x-1.5">
              <span>Joined Employees</span>
              {selectedStatusFilter === 'Joined' && (
                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full uppercase font-mono">
                  Active
                </span>
              )}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-emerald-700 dark:text-emerald-300 drop-shadow-sm flex items-baseline justify-between">
            <span>{cards.joinedEmployees}</span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
              <span>Joined View</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-1 font-semibold flex items-center justify-between">
            <span>
              {cards.totalRequisitions > 0 ? Math.round((cards.joinedEmployees / cards.totalRequisitions) * 100) : 0}% completion
            </span>
            <span className="font-bold underline">Click to view category</span>
          </div>
        </div>

        {/* Ongoing Recruitment (Interactive KPI Card) */}
        <div
          onClick={() => handleSelectStatusCategory('Ongoing')}
          title="Click to view ongoing recruitment pipeline"
          className={`p-4 rounded-2xl shadow-md cursor-pointer relative overflow-hidden group hover:scale-[1.02] transition-all ${
            selectedStatusFilter === 'Ongoing'
              ? 'bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-blue-100 dark:from-blue-950/70 dark:to-slate-900 border-2 border-blue-500 ring-4 ring-blue-500/30'
              : 'bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-white dark:from-blue-950/40 dark:to-slate-900 border border-blue-300 dark:border-blue-800/60 hover:border-blue-500 hover:ring-2 hover:ring-blue-400/40'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <span>Ongoing Pipeline</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-blue-700 dark:text-blue-300 flex items-baseline justify-between">
            <span>{cards.ongoingRecruitment}</span>
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center space-x-1">
              <span>View Ongoing</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1 font-semibold">
            Actively being interviewed/offered
          </div>
        </div>

        {/* Held Up Recruitment */}
        <div
          onClick={() => handleSelectStatusCategory('Held Up')}
          title="Click to view held up recruitment requisitions"
          className={`p-4 rounded-2xl border shadow-md cursor-pointer relative overflow-hidden group hover:scale-[1.02] transition-all ${
            selectedStatusFilter === 'Held Up'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 ring-4 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>Held Up</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {cards.heldUpRecruitment}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Temporarily paused by management
          </div>
        </div>

        {/* Average Time to Fill (Days) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-800/50 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <span>Avg Time to Fill</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow">
              {cards.joinedEmployees > 0 && cards.averageTimeToFill > 0 ? cards.averageTimeToFill : '0'}
            </span>
            <span className="text-sm font-bold text-cyan-300 font-sans">
              {cards.joinedEmployees > 0 && cards.averageTimeToFill > 0 ? 'Days' : 'Days (0 Joined)'}
            </span>
          </div>
          <div className="text-[11px] text-indigo-200/80 mt-1">
            {cards.joinedEmployees > 0
              ? 'Calculated: DOJ – Requisition Date'
              : 'No candidates joined yet (Pending Joining)'}
          </div>
        </div>

        {/* New Recruitment */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>New Recruitment</span>
            <Sparkles className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-slate-900 dark:text-white">
            {cards.newRecruitment}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Capacity &amp; team expansion positions
          </div>
        </div>

        {/* Replacement Recruitment */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Replacement</span>
            <UserCheck className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-2 font-mono tracking-tight text-slate-900 dark:text-white">
            {cards.replacementRecruitment}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Filling vacant resigned designations
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* HOD-WISE RECRUITMENT CHECKLIST MODULE (With Auto 'Joined' Category) */}
      {/* ==================================================================== */}
      <div
        id="hod-recruitment-module"
        ref={moduleRef}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5"
      >
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  HOD-Wise Recruitment Checklist
                </h2>
                <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {uniqueHodNames.length} HODs
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Departmental manpower requisitions categorized and tracked by Head of Department (HOD)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onNavigateToChecklist}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
            >
              <span>Manage Full Checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Confirmation Toast Banner (When a record has just moved to Joined) */}
        {visualConfirmation && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl flex items-start sm:items-center justify-between gap-4 border border-emerald-400/80 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-white">
                    Visual Confirmation: Requisition Moved to 'Joined' Category!
                  </span>
                  <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    Location Updated
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-1">
                  Requisition <strong className="font-mono text-white underline">{visualConfirmation.reqCode}</strong> ({visualConfirmation.positionTitle} - {visualConfirmation.department}) has been automatically relocated into the{' '}
                  <strong className="text-white bg-emerald-800/60 px-1.5 py-0.5 rounded">Joined</strong> view.
                  {visualConfirmation.ttf ? (
                    <span className="ml-1 text-yellow-200 font-bold font-mono">
                      • Turnaround SLA locked at {visualConfirmation.ttf} days.
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <button
              onClick={() => setVisualConfirmation(null)}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dedicated "Joined" Category View Header Banner */}
        {selectedStatusFilter === 'Joined' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-300 dark:border-emerald-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    Joined Category View ({statusCounts.joined} Requisition{statusCounts.joined === 1 ? '' : 's'} Successfully Closed)
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                    Avg Time to Fill: {cards.joinedEmployees > 0 && cards.averageTimeToFill > 0 ? `${cards.averageTimeToFill} Days` : 'N/A (0 Joined)'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/80 mt-0.5">
                  Displaying inducted candidates with finalized Date of Joining (DOJ) and calculated SLA turnaround days.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedStatusFilter('ALL')}
              className="self-start md:self-center px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Show All Statuses</span>
            </button>
          </div>
        )}

        {/* Primary Category Segment Tabs: All, Joined, Ongoing, Held Up */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 text-xs scrollbar-thin">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold text-[10px] uppercase tracking-wider shrink-0 border border-slate-200/60 dark:border-slate-700/60">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>Category View:</span>
          </div>

          {/* Tab: All Records */}
          <button
            onClick={() => setSelectedStatusFilter('ALL')}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md shadow-slate-900/15 ring-2 ring-slate-900/20 dark:ring-slate-100/30 scale-[1.02]'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Requisitions</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatusFilter === 'ALL'
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {statusCounts.total}
            </span>
          </button>

          {/* Tab: Joined Category (Highlight) */}
          <button
            onClick={() => setSelectedStatusFilter('Joined')}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatusFilter === 'Joined'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/40 scale-[1.02]'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:border-emerald-300 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 dark:text-emerald-300" />
            <span>Joined Category</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatusFilter === 'Joined'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100'
              }`}
            >
              {statusCounts.joined}
            </span>
          </button>

          {/* Tab: Ongoing Pipeline */}
          <button
            onClick={() => setSelectedStatusFilter('Ongoing')}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatusFilter === 'Ongoing'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40 scale-[1.02]'
                : 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:border-blue-300 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-200 dark:text-blue-300" />
            <span>Ongoing Pipeline</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatusFilter === 'Ongoing'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'bg-blue-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-blue-100'
              }`}
            >
              {statusCounts.ongoing}
            </span>
          </button>

          {/* Tab: Held Up */}
          <button
            onClick={() => setSelectedStatusFilter('Held Up')}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatusFilter === 'Held Up'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/40 scale-[1.02]'
                : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:border-amber-300 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200 dark:text-amber-300" />
            <span>Held Up</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatusFilter === 'Held Up'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100'
              }`}
            >
              {statusCounts.heldUp}
            </span>
          </button>
        </div>

        {/* Controls: Search, HOD Pills & Detailed Status Filter */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={hodSearch}
                onChange={(e) => setHodSearch(e.target.value)}
                placeholder="Search position title, department, company, or HOD name..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Filter Status:
              </span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses ({requisitions.length})</option>
                <option value="Joined">Joined ({statusCounts.joined})</option>
                <option value="Ongoing">Ongoing ({statusCounts.ongoing})</option>
                <option value="Held Up">Held Up ({statusCounts.heldUp})</option>
                <option value="Did not Join">Did not Join ({statusCounts.didNotJoin})</option>
                <option value="Cancelled">Cancelled ({statusCounts.cancelled})</option>
              </select>
            </div>
          </div>

          {/* HOD Quick Filter Pills */}
          {uniqueHodNames.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs scrollbar-thin">
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                <Users className="w-3 h-3 text-indigo-500" />
                <span>Filter HOD:</span>
              </div>

              <button
                onClick={() => setSelectedHodFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                  selectedHodFilter === 'ALL'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/40 scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:-translate-y-0.5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All HODs</span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors ${
                    selectedHodFilter === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {requisitions.length}
                </span>
              </button>

              {hodGroups.map((g) => (
                <button
                  key={g.name}
                  onClick={() => setSelectedHodFilter(g.name)}
                  className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-95 ${
                    selectedHodFilter === g.name
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/40 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-xs hover:-translate-y-0.5'
                  }`}
                >
                  <Building className="w-3 h-3 text-indigo-400 opacity-80" />
                  <span>{g.name}</span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors ${
                      selectedHodFilter === g.name
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {selectedStatusFilter === 'Joined' ? g.joined : g.total}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty State when no requisitions match */}
        {filteredHodGroups.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {requisitions.length === 0
                ? 'No Recruitment Requisitions Yet'
                : selectedStatusFilter === 'Joined'
                ? 'No Joined Records Found'
                : 'No HOD Requisitions Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {requisitions.length === 0
                ? 'Create recruitment records in the Recruitment Checklist or import an Excel file to organize and track requirements by HOD.'
                : selectedStatusFilter === 'Joined'
                ? 'When any ongoing requisition is updated with Status = "Joined", it will automatically appear here with calculated Time-to-Fill.'
                : 'No requisitions matched your current search and filter criteria. Try resetting the filters.'}
            </p>
            {requisitions.length === 0 ? (
              <button
                onClick={onNavigateToChecklist}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
              >
                Open Recruitment Checklist
              </button>
            ) : (
              <button
                onClick={() => {
                  setHodSearch('');
                  setSelectedHodFilter('ALL');
                  setSelectedStatusFilter('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* HOD Grouped Accordion Cards */}
        {filteredHodGroups.length > 0 && (
          <div className="space-y-4">
            {filteredHodGroups.map((group) => {
              const isCollapsed = collapsedHods[group.name] ?? false;

              return (
                <div
                  key={group.name}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Group Header Bar */}
                  <div
                    onClick={() => toggleHodCollapse(group.name)}
                    className="p-4 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/20">
                        {group.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {group.name}
                          </h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            ({Array.from(group.departments).join(', ') || 'Department'})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {group.requisitions.length} requisition(s) shown • {group.vacancies} total vacancies
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Metric Badges */}
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            selectedStatusFilter === 'Joined'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {group.joined} Joined
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            selectedStatusFilter === 'Ongoing'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {group.ongoing} Ongoing
                        </span>
                        {group.heldUp > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                            {group.heldUp} Held Up
                          </span>
                        )}
                      </div>

                      <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Group Requisitions Checklist Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/60 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3 font-mono">MRF Code</th>
                            <th className="py-2.5 px-3">Position Title</th>
                            <th className="py-2.5 px-3">Department &amp; Unit</th>
                            <th className="py-2.5 px-3 text-center">Vac</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Requisition Date</th>
                            <th className="py-2.5 px-3">Joining Date (DOJ)</th>
                            <th className="py-2.5 px-3 text-center">Turnaround</th>
                            <th className="py-2.5 px-3">Assisted By</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.requisitions.map((req) => {
                            const isJustMoved = highlightedReqId === req.id;

                            return (
                              <tr
                                key={req.id}
                                id={`req-row-${req.id}`}
                                className={`transition-all duration-300 group ${
                                  isJustMoved
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500 shadow-md font-medium'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                  {req.requisitionCode}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white max-w-[200px]">
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className="cursor-pointer hover:text-indigo-600 hover:underline truncate"
                                      onClick={() => setViewingRecord(req)}
                                    >
                                      {req.positionTitle}
                                    </span>
                                    {isJustMoved && (
                                      <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white animate-pulse">
                                        ✨ Moved to Joined
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                  <span>{req.department}</span>
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {req.company}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {req.vacancy || 1}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                                  <span
                                    className={`px-2 py-0.5 rounded font-medium ${
                                      req.recruitmentType === 'New Recruitment'
                                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                                    }`}
                                  >
                                    {req.recruitmentType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                                  {req.requisitionDate || '-'}
                                </td>
                                <td className="py-2.5 px-3 font-mono whitespace-nowrap text-[11px]">
                                  {req.dateOfJoining ? (
                                    <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>{req.dateOfJoining}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Pending</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                                  {req.recruitmentStatus === 'Joined' ? (
                                    req.timeToFillDays && req.timeToFillDays > 0 ? (
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                        {req.timeToFillDays}d TTF
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Completed</span>
                                    )
                                  ) : (
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                                      {req.pendingDays ?? 0}d pend
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px]">
                                  {req.recruitmentAssistedByName.split(' ')[0]}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                                      req.recruitmentStatus
                                    )}`}
                                  >
                                    {req.recruitmentStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end space-x-1">
                                    <button
                                      onClick={() => setViewingRecord(req)}
                                      title="View Details"
                                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    {canEdit && (
                                      <button
                                        onClick={() => {
                                          setSelectedRequisitionForEdit(req);
                                          setIsEditModalOpen(true);
                                        }}
                                        title="Edit Requisition (Update Status & Move to Joined)"
                                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 1 Charts: Status Overview Doughnut + Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Recruitment Status Overview (Doughnut 3D) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chart 1: Recruitment Status Overview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proportion of joined vs active pipelines
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
              3D Donut
            </span>
          </div>

          <StatusDoughnutChart data={charts.statusOverview} total={cards.totalRequisitions} />
        </div>

        {/* Chart 2: Monthly Recruitment Trends */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chart 2: Monthly Recruitment Trends
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Requisitions received vs joined vs ongoing per month
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
              Monthly Trend
            </span>
          </div>

          <MonthlyTrendsChart data={charts.monthlyTrends} />
        </div>
      </div>

      {/* Row 2 Charts: Employee Contribution + Recruitment Type */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 3: Employee-wise Recruitment Contribution */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chart 3: Employee-Wise Recruitment Contribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Workload and turnaround performance of the HR team members
              </p>
            </div>
            <button
              onClick={onNavigateToPerformance}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>Full Profiles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <EmployeeContributionChart employees={charts.employeeContributions} />
        </div>

        {/* Chart 4: Recruitment Type Analysis + Turnaround Trend */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Chart 4: Recruitment Type Analysis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  New headcount creation vs replacement hires
                </p>
              </div>
            </div>

            <RecruitmentTypeChart data={charts.recruitmentTypeAnalysis} />
          </div>

          {/* Chart 7: Monthly Time to Fill */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Chart 7: Monthly Turnaround Efficiency
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Average completion days month-by-month
                </p>
              </div>
            </div>

            <MonthlyTimeToFillChart data={charts.monthlyTimeToFill} />
          </div>
        </div>
      </div>

      {/* Row 3 Charts: Department-Wise + Company-Wise Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 5: Department-wise Recruitment Requirements */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chart 5: Department-Wise Recruitment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Departments with the highest recruitment demands
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Ranked by volume</span>
          </div>

          <DepartmentDistributionChart departments={charts.departmentBreakdown} />
        </div>

        {/* Chart 6: Company-wise Recruitment Distribution */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chart 6: Company-Wise Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Requisitions across RAL, SGL, PSL, MTSL, RDL, RBL
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">6 Corporate Entities</span>
          </div>

          <CompanyDistributionChart companies={charts.companyBreakdown} />
        </div>
      </div>

      {/* In-Dashboard Edit Modal */}
      {isEditModalOpen && (
        <RecruitmentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRequisitionForEdit(null);
          }}
          onSave={handleSaveFromDashboard}
          requisition={selectedRequisitionForEdit}
          canEdit={canEdit}
          currentUserName={currentUserName}
          currentUserCode={currentUserCode}
          employees={employees}
          onManageEmployees={onNavigateToEmployees}
        />
      )}

      {/* In-Dashboard Requisition Detail Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] bg-blue-600 text-white font-mono px-2 py-0.5 rounded font-bold uppercase">
                  {viewingRecord.requisitionCode}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{viewingRecord.positionTitle}</h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Department:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{viewingRecord.department}</div>
                </div>
                <div>
                  <span className="text-slate-400">Company:</span>
                  <div className="font-mono font-bold text-indigo-600">{viewingRecord.company}</div>
                </div>
                <div>
                  <span className="text-slate-400">Requisition Date:</span>
                  <div className="font-mono">{viewingRecord.requisitionDate}</div>
                </div>
                <div>
                  <span className="text-slate-400">Date of Joining:</span>
                  <div className="font-mono font-bold text-emerald-600">{viewingRecord.dateOfJoining || 'Pending'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Recruitment Status:</span>
                  <div className="font-bold">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadge(viewingRecord.recruitmentStatus)}`}>
                      {viewingRecord.recruitmentStatus}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Turnaround / TTF:</span>
                  <div className="font-mono font-bold text-indigo-600">
                    {viewingRecord.timeToFillDays ? `${viewingRecord.timeToFillDays} Days TTF` : `Pending (${viewingRecord.pendingDays ?? 0}d)`}
                  </div>
                </div>
              </div>

              {/* Requisition Origin & Ownership */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-semibold">Requisition Submitted By:</span>
                  <div className="text-slate-900 dark:text-white font-bold mt-0.5">{viewingRecord.requisitionSubmittedBy || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Head of Department (HOD):</span>
                  <div className="text-slate-900 dark:text-white font-bold mt-0.5">{viewingRecord.hod || 'N/A'}</div>
                </div>
              </div>

              {/* Replacement Details & Financial Cost Allocation */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-indigo-950/40 border border-amber-200/80 dark:border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <span>Replacement &amp; Financial Cost Summary</span>
                  </h4>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded font-bold uppercase border border-amber-300 dark:border-amber-700">
                    {viewingRecord.recruitmentType}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Replaced Employee:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {viewingRecord.replacementOfWhom || (viewingRecord.recruitmentType === 'Replacement' ? 'Vacant Position' : 'N/A (New Role)')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Salary Rate:</span>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {viewingRecord.replacementEmployeeSalary || 'Budgeted Grade Rate'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Approved Vacancies:</span>
                    <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">
                      {viewingRecord.vacancy || 1} Position{(viewingRecord.vacancy || 1) > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Overall Financial Impact Calculation */}
                {(() => {
                  const salaryStr = viewingRecord.replacementEmployeeSalary || '';
                  const numericSalary = parseFloat(salaryStr.replace(/[^0-9.]/g, '')) || 0;
                  const totalVacancies = viewingRecord.vacancy || 1;
                  const monthlyTotal = numericSalary * totalVacancies;
                  const annualTotal = monthlyTotal * 12;

                  if (numericSalary > 0) {
                    return (
                      <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-indigo-800/40 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Calculated Annual Financial Budget Impact:
                        </span>
                        <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          {annualTotal.toLocaleString()} BDT / yr ({monthlyTotal.toLocaleString()} BDT/mo)
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-indigo-800/40 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Financial Allocation:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        Standard Departmental Pay Scale Allocation
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <span className="text-slate-400 font-semibold">Recruitment Assisted By:</span>
                <div className="text-slate-900 dark:text-white font-bold mt-0.5">{viewingRecord.recruitmentAssistedByName}</div>
              </div>

              {viewingRecord.remarks && (
                <div>
                  <span className="text-slate-400 font-semibold">Remarks &amp; Notes:</span>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-1">
                    {viewingRecord.remarks}
                  </div>
                </div>
              )}

              {canEdit && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      const rec = viewingRecord;
                      setViewingRecord(null);
                      setSelectedRequisitionForEdit(rec);
                      setIsEditModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Requisition Status</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
