// src/components/MonthlyPerformanceView.tsx
import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Sliders,
  Info,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PerformanceRankItem } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface MonthlyPerformanceViewProps {
  rankings: PerformanceRankItem[];
  methodology: any;
  onRefresh: () => void;
  onUpdateWeights: (kpiWeight: number, taskWeight: number) => Promise<void>;
}

export const MonthlyPerformanceView: React.FC<MonthlyPerformanceViewProps> = ({
  rankings,
  methodology,
  onRefresh,
  onUpdateWeights,
}) => {
  const { activePersona } = useAuth();
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [kpiWeightVal, setKpiWeightVal] = useState(methodology?.kpiWeight || 70);
  const [actionLoading, setActionLoading] = useState(false);

  const canConfigure = activePersona.role === 'head_of_hr' || activePersona.role === 'admin';
  const taskWeightVal = 100 - kpiWeightVal;

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await onUpdateWeights(kpiWeightVal, taskWeightVal);
      setConfigModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getRankBadge = (rank: number | string) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-extrabold flex items-center justify-center text-xs shadow-xs">
          1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-extrabold flex items-center justify-center text-xs shadow-xs">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
          3
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">
        {rank}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Performance Ranking &amp; Calibration</h1>
              <p className="text-xs md:text-sm text-slate-500">
                Transparent departmental leaderboard • Weighted KPI Achievement + Task Execution Scores
              </p>
            </div>
          </div>
        </div>

        {canConfigure && (
          <button
            onClick={() => {
              setKpiWeightVal(methodology?.kpiWeight || 70);
              setConfigModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Configure Scoring Formula</span>
          </button>
        )}
      </div>

      {/* Methodology Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Scoring Formula ({methodology?.period || 'October 2026'})
              </span>
              <span className="text-xs text-slate-300">Head of HR Calibrated</span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              {methodology?.kpiWeight || 70}% Approved KPI Score + {methodology?.taskWeight || 30}% Task Execution Score
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Task Execution score reflects completion velocity and on-time delivery with proportional deductions for overdue tasks. Missing KPI submissions are flagged as pending evaluation rather than rewarded or zeroed out.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 shrink-0">
            <div className="text-center px-2">
              <div className="text-lg font-extrabold text-amber-400">{methodology?.kpiWeight || 70}%</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase">KPI Weight</div>
            </div>
            <div className="text-slate-400 font-bold">+</div>
            <div className="text-center px-2">
              <div className="text-lg font-extrabold text-indigo-300">{methodology?.taskWeight || 30}%</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase">Task Weight</div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Ranking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 text-center">Rank</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4 text-center">Tasks (Assigned/Done)</th>
                <th className="py-3 px-4 text-center">On-Time %</th>
                <th className="py-3 px-4 text-center">Overdue</th>
                <th className="py-3 px-4 text-center">Approved KPI Score</th>
                <th className="py-3 px-4 text-center">KPI Submission %</th>
                <th className="py-3 px-4 text-center">Task Exec Score</th>
                <th className="py-3 px-4 text-center">Overall Score</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankings.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex justify-center">{getRankBadge(item.rank)}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{item.name}</span>
                      {item.isHeadOfHr && (
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded uppercase">
                          Supervisor
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{item.designation}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-slate-800">
                    {item.completedTaskCount} / {item.assignedTaskCount}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="font-bold text-emerald-700">{item.onTimeCompletionRate}%</span>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {item.overdueTaskCount > 0 ? (
                      <span className="font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {item.overdueTaskCount} Overdue
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {item.approvedKpiScore !== null ? (
                      <span className="font-extrabold text-purple-700">{item.approvedKpiScore}%</span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Pending Approval</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-slate-700">
                    {item.kpiSubmissionRate}%
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-semibold text-slate-800">
                    {item.taskExecutionScore}/100
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {item.overallScore !== null ? (
                      <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {item.overallScore}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Insufficient Data</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.statusLabel === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoring Explanation Details */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>Governance &amp; Anti-Bias Rules</span>
        </h4>
        <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
          <li>
            <strong>Separation of Permanent Duties:</strong> Employees are not penalized or rewarded solely based on the total quantity of assigned tasks, preventing distortion between executives handling complex statutory audits vs routine administrative logging.
          </li>
          <li>
            <strong>Overdue Accountability:</strong> Each active overdue task applies a direct 5-point deduction to the task execution component until resolved with an approved extension or completion review.
          </li>
          <li>
            <strong>Incomplete KPI Protection:</strong> Missing KPI data is labeled <span className="font-semibold text-slate-800">"Pending KPI Evaluation"</span> rather than recorded as 0%, preventing artificial skewing of employee standings during active cycles.
          </li>
        </ul>
      </div>

      {/* CONFIGURATION MODAL */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Configure Performance Scoring Weights</h3>
            <p className="text-xs text-slate-500 mt-1">Authorized Head of HR configuration</p>

            <form onSubmit={handleWeightSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800">Approved KPI Weight: {kpiWeightVal}%</label>
                  <label className="font-bold text-slate-800">Task Execution: {taskWeightVal}%</label>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={kpiWeightVal}
                  onChange={(e) => setKpiWeightVal(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 leading-relaxed text-[11px]">
                <strong>Active Preview:</strong> {kpiWeightVal}% of overall monthly ranking will derive from Head of HR approved KPI targets, while {taskWeightVal}% will derive from on-time task execution.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Apply Scoring Weights'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
