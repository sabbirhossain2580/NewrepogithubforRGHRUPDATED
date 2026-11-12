// src/components/recruitment/RecruitmentActivityLogView.tsx
import React, { useState } from 'react';
import { History, User, Clock, FileText, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { RecruitmentAuditLog } from '../../types/index.ts';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';

interface Props {
  logs: RecruitmentAuditLog[];
  loading: boolean;
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
}

export const RecruitmentActivityLogView: React.FC<Props> = ({
  logs,
  loading,
  syncStatus,
  lastUpdated,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = logs.filter((l) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      !s ||
      l.requisitionCode.toLowerCase().includes(s) ||
      (l.positionTitle && l.positionTitle.toLowerCase().includes(s)) ||
      l.performedByName.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s);

    if (!matchSearch) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200';
      case 'STATUS_CHANGE':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200';
      case 'UPDATE':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200';
      case 'IMPORT':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200';
      case 'DELETE':
      default:
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
              Audit Trail
            </span>
            <span className="text-xs text-slate-400">Record-Level History &amp; Concurrency Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Activity Log &amp; Concurrency Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent tracking of who changed which requisition, previous vs new values &amp; timestamps
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <RecruitmentRealtimeIndicator
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, position, code, or change detail..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="all">All Actions</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="STATUS_CHANGE">Status Changes</option>
          <option value="IMPORT">Excel Imports</option>
          <option value="DELETE">Deleted</option>
        </select>
      </div>

      {/* Activity Timeline / Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-40">Timestamp</th>
                <th className="p-3 w-28">Action</th>
                <th className="p-3 w-32">MRF Code</th>
                <th className="p-3">Position / Title</th>
                <th className="p-3">Change Summary &amp; Details</th>
                <th className="p-3 w-48">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No activity log records found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {log.requisitionCode}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.positionTitle || '-'}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {log.details}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">{log.performedByName}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{log.performedByRole || 'User'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
