// src/components/recruitment/RecruitmentRealtimeIndicator.tsx
import React from 'react';
import { Wifi, RefreshCw, AlertCircle, Clock } from 'lucide-react';

export type SyncStatus = 'connected' | 'syncing' | 'error';

interface Props {
  status: SyncStatus;
  lastUpdated: string | null;
  lastUpdatedByName?: string | null;
  onRefresh?: () => void;
  className?: string;
}

export const RecruitmentRealtimeIndicator: React.FC<Props> = ({
  status,
  lastUpdated,
  lastUpdatedByName,
  onRefresh,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500 shadow-emerald-500/50',
          label: 'Live Connected',
          icon: Wifi,
        };
      case 'syncing':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500 shadow-amber-500/50 animate-pulse',
          label: 'Synchronizing...',
          icon: RefreshCw,
        };
      case 'error':
      default:
        return {
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500 shadow-rose-500/50',
          label: 'Connection Lost',
          icon: AlertCircle,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Live Status Pill */}
      <div
        className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs font-semibold backdrop-blur-md transition-all shadow-sm ${config.bg}`}
      >
        <span className={`w-2 h-2 rounded-full shadow ${config.dot}`} />
        <Icon className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
        <span>{config.label}</span>
      </div>

      {/* Last Update Detail */}
      <div className="hidden sm:flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Updated: <span className="font-medium text-slate-700 dark:text-slate-200">{formattedTime}</span></span>
        {lastUpdatedByName && (
          <span className="truncate max-w-[140px] text-slate-500 dark:text-slate-400">
            • by <span className="text-slate-700 dark:text-slate-200 font-medium">{lastUpdatedByName}</span>
          </span>
        )}
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Force refresh recruitment data from database"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
