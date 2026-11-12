// src/components/recruitment/RecruitmentCharts.tsx
import React, { useState } from 'react';
import { RecruitmentStatus, RecruitmentType, EmployeeRecruitmentProfile } from '../../types/index.ts';

// ----------------------------------------------------------------------------
// 1. 3D-Style Doughnut Chart: Recruitment Status Overview
// ----------------------------------------------------------------------------
interface DoughnutSlice {
  name: RecruitmentStatus;
  count: number;
  percentage: number;
  color: string;
}

export const StatusDoughnutChart: React.FC<{
  data: DoughnutSlice[];
  total: number;
}> = ({ data, total }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const size = 260;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      {/* SVG Doughnut */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Subtle 3D Ambient Blur */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-600/10 via-cyan-500/10 to-indigo-600/10 blur-xl pointer-events-none" />

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <defs>
            <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
            </filter>
            <linearGradient id="grad-joined" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="grad-ongoing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="grad-held" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="grad-dnj" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
            <linearGradient id="grad-cancel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
          </defs>

          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />

          {data.map((item, idx) => {
            const fraction = total > 0 ? item.count / total : 0;
            const strokeDasharray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += fraction * circumference;
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={item.name}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                filter="url(#shadow3d)"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center 3D Plaque */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
            {hoveredIdx !== null ? data[hoveredIdx].count : total}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
            {hoveredIdx !== null ? data[hoveredIdx].name : 'Total Requisitions'}
          </span>
          {hoveredIdx !== null && (
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {data[hoveredIdx].percentage}% of pool
            </span>
          )}
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="flex-1 space-y-2.5 w-full">
        {data.map((item, idx) => (
          <div
            key={item.name}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
              hoveredIdx === idx
                ? 'bg-slate-50 dark:bg-slate-800/80 border-indigo-300 dark:border-indigo-600 shadow-sm translate-x-1'
                : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="w-3.5 h-3.5 rounded-full shadow" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{item.count}</span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 min-w-[38px] text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 2. Animated Line/Area Chart: Monthly Recruitment Trends
// ----------------------------------------------------------------------------
interface MonthlyTrendPoint {
  month: string;
  requisitions: number;
  joined: number;
  ongoing: number;
}

export const MonthlyTrendsChart: React.FC<{ data: MonthlyTrendPoint[] }> = ({ data }) => {
  const [activeSeries, setActiveSeries] = useState<{ req: boolean; joined: boolean; ongoing: boolean }>({
    req: true,
    joined: true,
    ongoing: true,
  });

  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-400 p-4 text-center">No monthly trend data recorded yet.</div>;
  }

  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const width = 560;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.requisitions, d.joined, d.ongoing)),
    12
  );

  const getX = (idx: number) => paddingX + (idx / Math.max(data.length - 1, 1)) * (width - 2 * paddingX);
  const getY = (val: number) => height - paddingY - (val / maxVal) * (height - 2 * paddingY);

  const buildPath = (key: 'requisitions' | 'joined' | 'ongoing') => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[key]).toFixed(1)}`)
      .join(' ');
  };

  const buildArea = (key: 'requisitions' | 'joined' | 'ongoing') => {
    const line = buildPath(key);
    const lastX = getX(data.length - 1);
    const firstX = getX(0);
    const bottomY = height - paddingY;
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  return (
    <div className="space-y-4">
      {/* Series Toggles */}
      <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-semibold">
        <button
          onClick={() => setActiveSeries((s) => ({ ...s, req: !s.req }))}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-all ${
            activeSeries.req
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              : 'text-slate-400 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span>Requisitions</span>
        </button>

        <button
          onClick={() => setActiveSeries((s) => ({ ...s, joined: !s.joined }))}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-all ${
            activeSeries.joined
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'text-slate-400 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Joined</span>
        </button>

        <button
          onClick={() => setActiveSeries((s) => ({ ...s, ongoing: !s.ongoing }))}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-all ${
            activeSeries.ongoing
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'text-slate-400 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Ongoing</span>
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="req-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="joined-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ongoing-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = Math.round(maxVal * ratio);
            const y = getY(val);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-100 dark:text-slate-800"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Areas & Lines */}
          {activeSeries.req && (
            <>
              <path d={buildArea('requisitions')} fill="url(#req-grad)" />
              <path d={buildPath('requisitions')} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          {activeSeries.joined && (
            <>
              <path d={buildArea('joined')} fill="url(#joined-grad)" />
              <path d={buildPath('joined')} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          {activeSeries.ongoing && (
            <>
              <path d={buildArea('ongoing')} fill="url(#ongoing-grad)" />
              <path d={buildPath('ongoing')} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" />
            </>
          )}

          {/* Points & Labels */}
          {data.map((d, i) => {
            const x = getX(i);
            return (
              <g key={d.month} className="group">
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                >
                  {d.month}
                </text>

                {activeSeries.req && (
                  <circle
                    cx={x}
                    cy={getY(d.requisitions)}
                    r="4"
                    fill="#2563EB"
                    className="hover:r-6 transition-all cursor-pointer shadow"
                  />
                )}
                {activeSeries.joined && (
                  <circle
                    cx={x}
                    cy={getY(d.joined)}
                    r="4"
                    fill="#10B981"
                    className="hover:r-6 transition-all cursor-pointer shadow"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 3. Employee-Wise Recruitment Contribution Bars
// ----------------------------------------------------------------------------
export const EmployeeContributionChart: React.FC<{
  employees: EmployeeRecruitmentProfile[];
}> = ({ employees }) => {
  const maxAssigned = Math.max(...employees.map((e) => e.totalAssigned), 1);

  return (
    <div className="space-y-4">
      {employees.map((emp) => {
        if (emp.employeeCode === '01-02-0440') {
          return (
            <div
              key={emp.employeeCode}
              className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30 hover:shadow-md transition-all space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{emp.employeeName}</span>
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-700 uppercase">
                      Head of HR · Oversight
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Head of Human Resources &amp; OD</div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-700 font-bold">
                    Supervisory Reviewer
                  </span>
                  <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 font-mono font-bold">
                    ★ 5.0 Leadership
                  </span>
                </div>
              </div>

              {/* Department Oversight Bar */}
              <div className="w-full h-3 bg-purple-100 dark:bg-purple-900/50 rounded-full overflow-hidden flex">
                <div
                  style={{ width: '100%' }}
                  title="100% Departmental Strategy & Requisition Oversight"
                  className="bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 h-full"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Strategic Governance: Requisition Sanctioning &amp; Performance Calibration</span>
                </div>
                <span className="font-semibold text-purple-800 dark:text-purple-200">
                  Full Pipeline Oversight
                </span>
              </div>
            </div>
          );
        }

        const joinedRatio = (emp.joined / maxAssigned) * 100;
        const ongoingRatio = (emp.ongoing / maxAssigned) * 100;
        const heldUpRatio = (emp.heldUp / maxAssigned) * 100;

        return (
          <div
            key={emp.employeeCode}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{emp.employeeName}</span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                    {emp.employeeCode}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{emp.designation}</div>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold">
                  {emp.joined} Joined ({emp.completionRate}%)
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-mono">
                  Avg TTF: {emp.avgTimeToFill}d
                </span>
              </div>
            </div>

            {/* Stacked Progress Bar with 3D Depth */}
            <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${joinedRatio}%` }}
                title={`Joined: ${emp.joined}`}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-500 relative"
              />
              <div
                style={{ width: `${ongoingRatio}%` }}
                title={`Ongoing: ${emp.ongoing}`}
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500"
              />
              <div
                style={{ width: `${heldUpRatio}%` }}
                title={`Held Up: ${emp.heldUp}`}
                className="bg-amber-400 h-full transition-all duration-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Joined: {emp.joined}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Ongoing: {emp.ongoing}</span>
                </span>
                {emp.heldUp > 0 && (
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Held Up: {emp.heldUp}</span>
                  </span>
                )}
              </div>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Total Handled: {emp.totalAssigned}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------------
// 4. Recruitment Type Analysis (Pie / 3D Split)
// ----------------------------------------------------------------------------
export const RecruitmentTypeChart: React.FC<{
  data: Array<{ type: RecruitmentType; count: number; percentage: number; color: string }>;
}> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {data.map((item) => (
          <div
            key={item.type}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/60 dark:to-slate-800/40 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10" style={{ backgroundColor: item.color }} />
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {item.type}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{item.count}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
              {item.percentage}% of total requisitions
            </div>
          </div>
        ))}
      </div>

      {/* Visual Proportion Bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex shadow-inner bg-slate-100 dark:bg-slate-800">
        {data.map((item) => (
          <div
            key={item.type}
            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
            className="h-full transition-all duration-500"
          />
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 5. Department-Wise Recruitment Distribution
// ----------------------------------------------------------------------------
export const DepartmentDistributionChart: React.FC<{
  departments: Array<{ department: string; total: number; joined: number; ongoing: number; avgTimeToFill: number }>;
}> = ({ departments }) => {
  const maxTotal = Math.max(...departments.map((d) => d.total), 1);

  return (
    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
      {departments.map((dept) => {
        const percentage = (dept.total / maxTotal) * 100;
        return (
          <div
            key={dept.department}
            className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.department}</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 dark:text-white font-mono">{dept.total} reqs</span>
                {dept.avgTimeToFill > 0 && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                    Avg {dept.avgTimeToFill}d
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${percentage}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------------
// 6. Company-Wise Recruitment Distribution
// ----------------------------------------------------------------------------
export const CompanyDistributionChart: React.FC<{
  companies: Array<{ company: string; total: number; joined: number; ongoing: number; heldUp: number }>;
}> = ({ companies }) => {
  const companyFullNames: Record<string, string> = {
    RAL: 'Renaissance Apparel Ltd',
    SGL: 'Southern Garments Ltd',
    PSL: 'Pandora Sweaters Ltd',
    MTSL: 'Millennium Textiles Southern Ltd',
    RDL: 'Renaissance Denim Ltd',
    RBL: 'Renaissance Barind Ltd',
  };

  const maxTotal = Math.max(...companies.map((c) => c.total), 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {companies.map((c) => {
        const completionRate = c.total > 0 ? Math.round((c.joined / c.total) * 100) : 0;
        return (
          <div
            key={c.company}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                {c.company}
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{c.total}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={companyFullNames[c.company]}>
              {companyFullNames[c.company] || c.company}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{c.joined} Joined</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{c.ongoing} Ongoing</span>
            </div>

            <div className="mt-1.5 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${(c.total / maxTotal) * 100}%` }}
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------------
// 7. Monthly Time to Fill (Turnaround Efficiency Trend)
// ----------------------------------------------------------------------------
export const MonthlyTimeToFillChart: React.FC<{
  data: Array<{ month: string; avgDays: number; joinedCount: number }>;
}> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-400 p-4 text-center">No time-to-fill history available.</div>;
  }

  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const width = 500;

  const maxDays = Math.max(...data.map((d) => d.avgDays), 45);

  const getX = (idx: number) => paddingX + (idx / Math.max(data.length - 1, 1)) * (width - 2 * paddingX);
  const getY = (val: number) => height - paddingY - (val / maxDays) * (height - 2 * paddingY);

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.avgDays).toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Target Turnaround: ≤ 60 Days</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">Days to Fill = DOJ – Requisition Date</span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[460px]">
          {/* Target 60-day line */}
          <line
            x1={paddingX}
            y1={getY(60)}
            x2={width - paddingX}
            y2={getY(60)}
            stroke="#10B981"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text x={width - paddingX} y={getY(60) - 4} textAnchor="end" className="text-[10px] fill-emerald-600 font-bold">
            Target: 60d
          </text>

          {/* Area & Path */}
          <path d={linePath} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />

          {data.map((d, i) => {
            const x = getX(i);
            const y = getY(d.avgDays);
            return (
              <g key={d.month}>
                <circle cx={x} cy={y} r="4" fill="#6366F1" className="shadow" />
                <text x={x} y={y - 8} textAnchor="middle" className="text-[10px] font-bold fill-indigo-600 dark:fill-indigo-400 font-mono">
                  {d.avgDays}d
                </text>
                <text x={x} y={height - 6} textAnchor="middle" className="text-[10px] fill-slate-400">
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
