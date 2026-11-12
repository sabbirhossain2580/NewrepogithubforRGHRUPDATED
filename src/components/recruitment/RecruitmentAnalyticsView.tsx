// src/components/recruitment/RecruitmentAnalyticsView.tsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Clock,
  Layers,
  Building,
  Target,
  Sparkles,
  ArrowRight,
  Filter,
  UserCheck,
  RotateCcw,
  AlertCircle,
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

interface Props {
  stats: RecruitmentStats | null;
  requisitions?: RecruitmentRequisition[];
  loading: boolean;
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
  onNavigateToChecklist: () => void;
}

const COMPANIES = ['RAL', 'SGL', 'PSL', 'MTSL', 'RDL', 'RBL'];

export const RecruitmentAnalyticsView: React.FC<Props> = ({
  stats,
  requisitions = [],
  loading,
  syncStatus,
  lastUpdated,
  onRefresh,
  onNavigateToChecklist,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedHod, setSelectedHod] = useState<string>('ALL');

  // Extract unique Head of Departments (HOD)
  const uniqueHods = useMemo(() => {
    const hodSet = new Set<string>();
    requisitions.forEach((r) => {
      if (r.hod && r.hod.trim()) {
        hodSet.add(r.hod.trim());
      }
    });
    return Array.from(hodSet).sort();
  }, [requisitions]);

  // Filter requisitions dynamically
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      if (selectedCompany !== 'ALL' && r.company !== selectedCompany) return false;
      if (selectedHod !== 'ALL' && r.hod !== selectedHod) return false;
      return true;
    });
  }, [requisitions, selectedCompany, selectedHod]);

  const isFiltered = selectedCompany !== 'ALL' || selectedHod !== 'ALL';

  // Compute analytics dynamically from filtered requisitions
  const computedData = useMemo(() => {
    const records = filteredRequisitions;
    const totalRequisitions = records.length;
    let joinedCount = 0;
    let ongoingCount = 0;
    let heldUpCount = 0;
    let didNotJoinCount = 0;
    let cancelledCount = 0;
    let totalTimeToFillSum = 0;
    let joinedWithTimeToFillCount = 0;

    const monthlyMap = new Map<
      string,
      { requisitions: number; joined: number; ongoing: number; timeToFillSum: number; joinedCount: number }
    >();
    const deptMap = new Map<
      string,
      { total: number; joined: number; ongoing: number; timeToFillSum: number; joinedCount: number }
    >();
    const companyMap = new Map<string, { total: number; joined: number; ongoing: number; heldUp: number }>();
    COMPANIES.forEach((c) => companyMap.set(c, { total: 0, joined: 0, ongoing: 0, heldUp: 0 }));

    records.forEach((r) => {
      if (r.recruitmentStatus === 'Joined') joinedCount++;
      else if (r.recruitmentStatus === 'Ongoing') ongoingCount++;
      else if (r.recruitmentStatus === 'Held Up') heldUpCount++;
      else if (r.recruitmentStatus === 'Did not Join') didNotJoinCount++;
      else if (r.recruitmentStatus === 'Cancelled') cancelledCount++;

      if (r.recruitmentStatus === 'Joined' && r.timeToFillDays && r.timeToFillDays > 0) {
        totalTimeToFillSum += r.timeToFillDays;
        joinedWithTimeToFillCount++;
      }

      // Monthly
      const monthKey = r.requisitionDate ? r.requisitionDate.substring(0, 7) : '2026-10';
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          requisitions: 0,
          joined: 0,
          ongoing: 0,
          timeToFillSum: 0,
          joinedCount: 0,
        });
      }
      const m = monthlyMap.get(monthKey)!;
      m.requisitions++;
      if (r.recruitmentStatus === 'Joined') {
        m.joined++;
        if (r.timeToFillDays && r.timeToFillDays > 0) {
          m.timeToFillSum += r.timeToFillDays;
          m.joinedCount++;
        }
      } else if (r.recruitmentStatus === 'Ongoing') {
        m.ongoing++;
      }

      // Department
      const deptName = r.department || 'General';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { total: 0, joined: 0, ongoing: 0, timeToFillSum: 0, joinedCount: 0 });
      }
      const d = deptMap.get(deptName)!;
      d.total++;
      if (r.recruitmentStatus === 'Joined') {
        d.joined++;
        if (r.timeToFillDays && r.timeToFillDays > 0) {
          d.timeToFillSum += r.timeToFillDays;
          d.joinedCount++;
        }
      } else if (r.recruitmentStatus === 'Ongoing') {
        d.ongoing++;
      }

      // Company
      if (companyMap.has(r.company)) {
        const c = companyMap.get(r.company)!;
        c.total++;
        if (r.recruitmentStatus === 'Joined') c.joined++;
        else if (r.recruitmentStatus === 'Ongoing') c.ongoing++;
        else if (r.recruitmentStatus === 'Held Up') c.heldUp++;
      }
    });

    const averageTimeToFill =
      joinedWithTimeToFillCount > 0
        ? Math.round((totalTimeToFillSum / joinedWithTimeToFillCount) * 10) / 10
        : 0;

    const statusOverview = [
      {
        name: 'Joined' as RecruitmentStatus,
        count: joinedCount,
        percentage: totalRequisitions > 0 ? Math.round((joinedCount / totalRequisitions) * 100) : 0,
        color: '#10B981',
      },
      {
        name: 'Ongoing' as RecruitmentStatus,
        count: ongoingCount,
        percentage: totalRequisitions > 0 ? Math.round((ongoingCount / totalRequisitions) * 100) : 0,
        color: '#3B82F6',
      },
      {
        name: 'Held Up' as RecruitmentStatus,
        count: heldUpCount,
        percentage: totalRequisitions > 0 ? Math.round((heldUpCount / totalRequisitions) * 100) : 0,
        color: '#F59E0B',
      },
      {
        name: 'Did not Join' as RecruitmentStatus,
        count: didNotJoinCount,
        percentage: totalRequisitions > 0 ? Math.round((didNotJoinCount / totalRequisitions) * 100) : 0,
        color: '#8B5CF6',
      },
      {
        name: 'Cancelled' as RecruitmentStatus,
        count: cancelledCount,
        percentage: totalRequisitions > 0 ? Math.round((cancelledCount / totalRequisitions) * 100) : 0,
        color: '#EF4444',
      },
    ];

    const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
    const monthNames: Record<string, string> = {
      '2026-01': 'Jan 26',
      '2026-02': 'Feb 26',
      '2026-03': 'Mar 26',
      '2026-04': 'Apr 26',
      '2026-05': 'May 26',
      '2026-06': 'Jun 26',
      '2026-07': 'Jul 26',
      '2026-08': 'Aug 26',
      '2026-09': 'Sep 26',
      '2026-10': 'Oct 26',
      '2026-11': 'Nov 26',
      '2026-12': 'Dec 26',
    };

    const monthlyTrends = sortedMonthKeys.map((k) => {
      const data = monthlyMap.get(k)!;
      return {
        month: monthNames[k] || k,
        requisitions: data.requisitions,
        joined: data.joined,
        ongoing: data.ongoing,
      };
    });

    const monthlyTimeToFill = sortedMonthKeys.map((k) => {
      const data = monthlyMap.get(k)!;
      const avg = data.joinedCount > 0 ? Math.round((data.timeToFillSum / data.joinedCount) * 10) / 10 : 0;
      return {
        month: monthNames[k] || k,
        avgDays: avg,
        joinedCount: data.joinedCount,
      };
    });

    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([name, data]) => ({
        department: name,
        total: data.total,
        joined: data.joined,
        ongoing: data.ongoing,
        avgTimeToFill: data.joinedCount > 0 ? Math.round((data.timeToFillSum / data.joinedCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const companyBreakdown = Array.from(companyMap.entries()).map(([comp, data]) => ({
      company: comp,
      total: data.total,
      joined: data.joined,
      ongoing: data.ongoing,
      heldUp: data.heldUp,
    }));

    return {
      totalRequisitions,
      joinedCount,
      ongoingCount,
      averageTimeToFill,
      statusOverview,
      monthlyTrends,
      monthlyTimeToFill,
      departmentBreakdown,
      companyBreakdown,
    };
  }, [filteredRequisitions]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading deep recruitment analytics...</p>
      </div>
    );
  }

  // If no filter active and stats available from API, we can use stats, else computedData
  const activeCards = isFiltered || requisitions.length > 0
    ? {
        totalRequisitions: computedData.totalRequisitions,
        joinedEmployees: computedData.joinedCount,
        ongoingRecruitment: computedData.ongoingCount,
        averageTimeToFill: computedData.averageTimeToFill,
      }
    : {
        totalRequisitions: stats?.cards.totalRequisitions ?? 0,
        joinedEmployees: stats?.cards.joinedEmployees ?? 0,
        ongoingRecruitment: stats?.cards.ongoingRecruitment ?? 0,
        averageTimeToFill: stats?.cards.averageTimeToFill ?? 0,
      };

  const activeCharts = isFiltered || requisitions.length > 0
    ? {
        statusOverview: computedData.statusOverview,
        monthlyTrends: computedData.monthlyTrends,
        monthlyTimeToFill: computedData.monthlyTimeToFill,
        departmentBreakdown: computedData.departmentBreakdown,
        companyBreakdown: computedData.companyBreakdown,
      }
    : {
        statusOverview: stats?.charts.statusOverview ?? [],
        monthlyTrends: stats?.charts.monthlyTrends ?? [],
        monthlyTimeToFill: stats?.charts.monthlyTimeToFill ?? [],
        departmentBreakdown: stats?.charts.departmentBreakdown ?? [],
        companyBreakdown: stats?.charts.companyBreakdown ?? [],
      };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
              Predictive HR Analytics
            </span>
            <span className="text-xs text-slate-400">Time-to-Fill &amp; Throughput Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Recruitment Analytics &amp; Velocity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical breakdown of hiring velocity, departmental demands &amp; recruiter efficiency
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <RecruitmentRealtimeIndicator
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={onRefresh}
          />

          <button
            onClick={onNavigateToChecklist}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-sm hover:opacity-90 transition-opacity"
          >
            Checklist View
          </button>
        </div>
      </div>

      {/* Filter Control Toolbar: Company & HOD Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Filter Analytics Matrix:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Company Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Companies (RAL, SGL, PSL, MTSL, RDL, RBL)</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* HOD (Head of Department) Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">HOD:</span>
            <select
              value={selectedHod}
              onChange={(e) => setSelectedHod(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer max-w-[220px]"
            >
              <option value="ALL">All HODs ({uniqueHods.length})</option>
              {uniqueHods.map((hod) => (
                <option key={hod} value={hod}>
                  {hod}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={() => {
                setSelectedCompany('ALL');
                setSelectedHod('ALL');
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Filter Status Badge */}
          <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/60">
            {filteredRequisitions.length} of {requisitions.length} records
          </div>
        </div>
      </div>

      {/* Empty State when no records match filter */}
      {filteredRequisitions.length === 0 && requisitions.length > 0 && (
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Requisitions Match Selected Filters
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            No recruitment records found for Company: <b>{selectedCompany}</b> and HOD: <b>{selectedHod}</b>. Try selecting another company or resetting your filter.
          </p>
          <button
            onClick={() => {
              setSelectedCompany('ALL');
              setSelectedHod('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Velocity Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white shadow-lg space-y-2">
          <div className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center justify-between">
            <span>Overall Turnaround Velocity</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono tracking-tight text-white">
            {activeCards.joinedEmployees > 0 && activeCards.averageTimeToFill > 0
              ? activeCards.averageTimeToFill
              : '0'}{' '}
            <span className="text-lg font-sans font-medium text-cyan-300">Days</span>
          </div>
          <p className="text-xs text-blue-200/80">
            {activeCards.joinedEmployees > 0
              ? `Across ${activeCards.joinedEmployees} successfully joined appointments`
              : 'No candidates joined yet — will calculate automatically upon joining'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Pipeline Ratio</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
            {activeCards.ongoingRecruitment}{' '}
            <span className="text-xs font-sans text-slate-400 font-normal">
              of {activeCards.totalRequisitions}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {activeCards.totalRequisitions > 0
              ? Math.round((activeCards.ongoingRecruitment / activeCards.totalRequisitions) * 100)
              : 0}
            % active ongoing pipeline
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Corporate Fulfillment Rate</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {activeCards.totalRequisitions > 0
              ? Math.round((activeCards.joinedEmployees / activeCards.totalRequisitions) * 100)
              : 0}
            %
          </div>
          <p className="text-xs text-slate-500">
            Requisitions filled without cancellation
          </p>
        </div>
      </div>

      {/* Row 1: Status Doughnut + Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Chart 1: Recruitment Status Distribution
            </h2>
            {isFiltered && (
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                Filtered
              </span>
            )}
          </div>
          <StatusDoughnutChart data={activeCharts.statusOverview} total={activeCards.totalRequisitions} />
        </div>

        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Chart 2: Monthly Inflow vs Onboarding Velocity
            </h2>
            {isFiltered && (
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                Filtered
              </span>
            )}
          </div>
          <MonthlyTrendsChart data={activeCharts.monthlyTrends} />
        </div>
      </div>

      {/* Row 2: Monthly Turnaround + Departmental Load */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Chart 7: Monthly Turnaround Trend (Days)
            </h2>
            {isFiltered && (
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                Filtered
              </span>
            )}
          </div>
          <MonthlyTimeToFillChart data={activeCharts.monthlyTimeToFill} />
        </div>

        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Chart 5: Departmental Demand Matrix
            </h2>
            {isFiltered && (
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                Filtered
              </span>
            )}
          </div>
          <DepartmentDistributionChart departments={activeCharts.departmentBreakdown} />
        </div>
      </div>

      {/* Row 3: Entity Velocity */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Chart 6: Company-Wise Hiring Distribution (RAL, SGL, PSL, MTSL, RDL, RBL)
          </h2>
          {isFiltered && (
            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
              Filtered
            </span>
          )}
        </div>
        <CompanyDistributionChart companies={activeCharts.companyBreakdown} />
      </div>
    </div>
  );
};
