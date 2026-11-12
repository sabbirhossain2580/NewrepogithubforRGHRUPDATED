// src/components/recruitment/RecruitmentPendingAlertsView.tsx
import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  AlertOctagon,
  FileQuestion,
  PauseCircle,
  CheckCircle2,
  Calendar,
  Building,
  User,
  Sliders,
  ArrowRight,
  Edit2,
} from 'lucide-react';
import { RecruitmentRequisition } from '../../types/index.ts';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';
import { RecruitmentModal } from './RecruitmentModal.tsx';

interface Props {
  requisitions: RecruitmentRequisition[];
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
  onSaveRequisition: (data: Partial<RecruitmentRequisition>) => Promise<void>;
  canEdit: boolean;
  currentUserName: string;
  currentUserCode?: string;
}

export const RecruitmentPendingAlertsView: React.FC<Props> = ({
  requisitions,
  syncStatus,
  lastUpdated,
  onRefresh,
  onSaveRequisition,
  canEdit,
  currentUserName,
  currentUserCode,
}) => {
  // Configurable thresholds
  const [threshold30, setThreshold30] = useState(30);
  const [threshold60, setThreshold60] = useState(60);
  const [threshold90, setThreshold90] = useState(90);

  const [activeTab, setActiveTab] = useState<'all' | 'older90' | 'older60' | 'older30' | 'missingDOJ' | 'missingOffer' | 'heldUp'>('all');
  const [editingRecord, setEditingRecord] = useState<RecruitmentRequisition | null>(null);

  // Categorize alerts
  const categorized = useMemo(() => {
    const older90: RecruitmentRequisition[] = [];
    const older60: RecruitmentRequisition[] = [];
    const older30: RecruitmentRequisition[] = [];
    const missingDOJ: RecruitmentRequisition[] = [];
    const missingOffer: RecruitmentRequisition[] = [];
    const heldUp: RecruitmentRequisition[] = [];

    requisitions.forEach((r) => {
      const pendingAge = r.pendingDays ?? 0;

      if (r.recruitmentStatus === 'Ongoing') {
        if (pendingAge >= threshold90) older90.push(r);
        else if (pendingAge >= threshold60) older60.push(r);
        else if (pendingAge >= threshold30) older30.push(r);

        if (!r.offerLetterDate) missingOffer.push(r);
      }

      if (r.recruitmentStatus === 'Held Up') {
        heldUp.push(r);
      }

      if (r.recruitmentStatus === 'Joined' && !r.dateOfJoining) {
        missingDOJ.push(r);
      }
    });

    return { older90, older60, older30, missingDOJ, missingOffer, heldUp };
  }, [requisitions, threshold30, threshold60, threshold90]);

  const displayedList = useMemo(() => {
    switch (activeTab) {
      case 'older90':
        return categorized.older90;
      case 'older60':
        return categorized.older60;
      case 'older30':
        return categorized.older30;
      case 'missingDOJ':
        return categorized.missingDOJ;
      case 'missingOffer':
        return categorized.missingOffer;
      case 'heldUp':
        return categorized.heldUp;
      case 'all':
      default:
        // Combine unique
        const map = new Map<number, RecruitmentRequisition>();
        [
          ...categorized.older90,
          ...categorized.older60,
          ...categorized.older30,
          ...categorized.missingDOJ,
          ...categorized.missingOffer,
          ...categorized.heldUp,
        ].forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
    }
  }, [categorized, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
              Early Warning System
            </span>
            <span className="text-xs text-slate-400">Aging Pipelines &amp; Missing Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Recruitment Alert Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Identify bottlenecks, ongoing requisitions older than 30/60/90 days &amp; incomplete records
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

      {/* Alert KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Critical > 90 Days */}
        <div
          onClick={() => setActiveTab('older90')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'older90'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 text-xs font-bold">
            <span>&gt; 90 Days</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            {categorized.older90.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Critical Delays</div>
        </div>

        {/* Severe > 60 Days */}
        <div
          onClick={() => setActiveTab('older60')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'older60'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
            <span>&gt; 60 Days</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {categorized.older60.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">High Turnaround</div>
        </div>

        {/* Warning > 30 Days */}
        <div
          onClick={() => setActiveTab('older30')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'older30'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 text-xs font-bold">
            <span>&gt; 30 Days</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">
            {categorized.older30.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Standard Watch</div>
        </div>

        {/* Held Up */}
        <div
          onClick={() => setActiveTab('heldUp')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'heldUp'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
            <span>Held Up</span>
            <PauseCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {categorized.heldUp.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">On Hold</div>
        </div>

        {/* Missing DOJ */}
        <div
          onClick={() => setActiveTab('missingDOJ')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'missingDOJ'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold">
            <span>Missing DOJ</span>
            <FileQuestion className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono mt-1">
            {categorized.missingDOJ.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Joined with no date</div>
        </div>

        {/* Missing Offer Letter */}
        <div
          onClick={() => setActiveTab('missingOffer')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'missingOffer'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-bold">
            <span>No Offer Date</span>
            <FileQuestion className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-200 font-mono mt-1">
            {categorized.missingOffer.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Offer date blank</div>
        </div>
      </div>

      {/* Threshold Configuration Drawer */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Configurable Alert Turnaround Thresholds (Days)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Real-time recalculation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-blue-600">Standard Watch: {threshold30} Days</span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              value={threshold30}
              onChange={(e) => setThreshold30(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-amber-600">High Turnaround: {threshold60} Days</span>
            </div>
            <input
              type="range"
              min="46"
              max="75"
              value={threshold60}
              onChange={(e) => setThreshold60(parseInt(e.target.value, 10))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-rose-600">Critical Delay: {threshold90} Days</span>
            </div>
            <input
              type="range"
              min="76"
              max="120"
              value={threshold90}
              onChange={(e) => setThreshold90(parseInt(e.target.value, 10))}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Alert List Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Action Items List: <span className="font-mono text-indigo-600">{displayedList.length}</span> Records
          </div>
          <button
            onClick={() => setActiveTab('all')}
            className={`text-xs font-semibold ${
              activeTab === 'all' ? 'text-indigo-600 underline' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Show All Alert Records
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px]">
              <tr>
                <th className="p-3">SL &amp; Code</th>
                <th className="p-3">Position</th>
                <th className="p-3">Department</th>
                <th className="p-3">Company</th>
                <th className="p-3">Status</th>
                <th className="p-3">Pending Age</th>
                <th className="p-3">Remarks / Hold Reason</th>
                <th className="p-3">Assisted By</th>
                {canEdit && <th className="p-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    🎉 Excellent! No pending alerts matching the selected category.
                  </td>
                </tr>
              ) : (
                displayedList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-slate-600">
                      <div>#{r.sl}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{r.requisitionCode}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {r.positionTitle}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{r.department}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600">{r.company}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {r.recruitmentStatus}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-extrabold">
                      {r.pendingDays && r.pendingDays >= threshold90 ? (
                        <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                          {r.pendingDays} Days!
                        </span>
                      ) : r.pendingDays && r.pendingDays >= threshold60 ? (
                        <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                          {r.pendingDays} Days
                        </span>
                      ) : (
                        <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                          {r.pendingDays ?? 0} Days
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 max-w-[220px] truncate" title={r.remarks || ''}>
                      {r.remarks || 'No remarks logged'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {r.recruitmentAssistedByName.split(' ')[0]}
                    </td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setEditingRecord(r)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold text-[11px]"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Update</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <RecruitmentModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={onSaveRequisition}
          requisition={editingRecord}
          canEdit={canEdit}
          currentUserName={currentUserName}
          currentUserCode={currentUserCode}
        />
      )}
    </div>
  );
};
