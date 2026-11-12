// src/components/OverdueAlertCenter.tsx
import React, { useState } from 'react';
import {
  AlertOctagon,
  Calendar,
  User,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText,
  CornerDownRight,
  ShieldAlert,
  Send,
  PlusCircle,
  CheckCircle,
} from 'lucide-react';
import { Task, DelayCategory } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface OverdueAlertCenterProps {
  tasks: Task[];
  onRefresh: () => void;
  onSubmitDelayReason: (taskId: number, reason: string, category: DelayCategory) => Promise<void>;
  onRequestExtension: (taskId: number, newDeadline: string, category: string, reason: string) => Promise<void>;
  onAddManagerComment: (taskId: number, comment: string) => Promise<void>;
}

export const OverdueAlertCenter: React.FC<OverdueAlertCenterProps> = ({
  tasks,
  onRefresh,
  onSubmitDelayReason,
  onRequestExtension,
  onAddManagerComment,
}) => {
  const { activePersona } = useAuth();
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'daysDesc' | 'deadlineAsc'>('daysDesc');

  // Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayReasonText, setDelayReasonText] = useState('');
  const [delayCategory, setDelayCategory] = useState<DelayCategory>('Dependency on another department');

  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [managerCommentText, setManagerCommentText] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const overdueTasks = tasks.filter((t) => t.isOverdue);

  const filteredTasks = overdueTasks
    .filter((t) => (filterEmployee === 'all' ? true : t.assignedEmployeeId === parseInt(filterEmployee, 10)))
    .sort((a, b) => {
      if (sortBy === 'daysDesc') return b.daysOverdue - a.daysOverdue;
      return a.effectiveDeadline.localeCompare(b.effectiveDeadline);
    });

  const uniqueEmployees = Array.from(new Set(overdueTasks.map((t) => JSON.stringify({ id: t.assignedEmployeeId, name: t.employeeName })))).map(
    (s) => JSON.parse(s)
  );

  const handleDelaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !delayReasonText.trim()) return;
    try {
      setActionLoading(true);
      await onSubmitDelayReason(selectedTask.id, delayReasonText.trim(), delayCategory);
      setDelayModalOpen(false);
      setDelayReasonText('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !requestedDeadline || !extensionReason.trim()) return;
    try {
      setActionLoading(true);
      await onRequestExtension(selectedTask.id, requestedDeadline, delayCategory, extensionReason.trim());
      setExtensionModalOpen(false);
      setRequestedDeadline('');
      setExtensionReason('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !managerCommentText.trim()) return;
    try {
      setActionLoading(true);
      await onAddManagerComment(selectedTask.id, managerCommentText.trim());
      setCommentModalOpen(false);
      setManagerCommentText('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-950 tracking-tight">Critical Overdue Alert System</h1>
              <p className="text-xs text-slate-500">
                Departmental task escalation, accountability tracking &amp; delay resolution • Asia/Dhaka Standard Time
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 text-xs">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium"
          >
            <option value="all">All Overdue Employees</option>
            {uniqueEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium"
          >
            <option value="daysDesc">Sort by Days Overdue (High &rarr; Low)</option>
            <option value="deadlineAsc">Sort by Earliest Deadline</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Zero Overdue Tasks</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All assigned tasks across Renaissance HR &amp; OD are on track according to Asia/Dhaka end-of-day cutoff.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border-2 border-red-500/80 rounded-xl overflow-hidden shadow-sm transition hover:shadow-md"
            >
              {/* Overdue Card Header */}
              <div className="bg-red-50/90 border-b border-red-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="bg-red-600 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded shadow-xs uppercase">
                    OVERDUE • {task.daysOverdue} DAY{task.daysOverdue > 1 ? 'S' : ''}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-600">{task.taskCode}</span>
                  <span className="text-xs font-bold text-slate-900">{task.title}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Original Deadline:</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {task.originalDeadline}
                  </span>
                  {task.revisedDeadline && (
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Revised: {task.revisedDeadline}
                    </span>
                  )}
                </div>
              </div>

              {/* Overdue Card Body */}
              <div className="p-5 space-y-4">
                {/* Formal Overdue Callout Quote (Prompt Section 7 Requirement) */}
                <div className="bg-red-50/50 border-l-4 border-red-600 p-3 rounded-r-lg text-xs leading-relaxed text-red-950 font-medium">
                  "OVERDUE — <span className="font-bold">{task.employeeName}</span> was assigned <span className="font-bold font-serif italic">'{task.title}'</span> with a deadline of {task.originalDeadline}. The task has not been completed by the deadline. Current status: <span className="font-bold uppercase text-red-600">Overdue</span> ({task.daysOverdue} days overdue). Delay reason: <span className="italic">{task.delayReason || 'Pending written explanation'}</span>."
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Assignee & Responsibility */}
                  <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400">Assigned Employee</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {task.employeeName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{task.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{task.employeeDesignation}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                      <strong>Assigning Manager:</strong> {task.assigningManagerName}
                    </div>
                  </div>

                  {/* Column 2: Delay Reason & Category */}
                  <div className="space-y-2 bg-amber-50/40 p-3 rounded-lg border border-amber-200/60">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-[10px] tracking-wider text-amber-800">
                        Employee Stated Delay Reason
                      </span>
                      {task.delayCategory && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.5 rounded border border-amber-300">
                          {task.delayCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 italic leading-relaxed text-[11px]">
                      {task.delayReason || 'No delay justification entered yet. Employee submission required.'}
                    </p>
                  </div>

                  {/* Column 3: Manager Review Comment */}
                  <div className="space-y-2 bg-blue-50/40 p-3 rounded-lg border border-blue-200/60">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-blue-800">
                      Manager Review &amp; Comments
                    </span>
                    <p className="text-slate-800 leading-relaxed text-[11px]">
                      {task.managerComments || 'Pending review by supervising manager.'}
                    </p>
                    <div className="pt-1 text-[10px] text-blue-700 font-medium">
                      Status: {task.approvalStatus}
                    </div>
                  </div>
                </div>

                {/* Full Description & Progress */}
                <div className="text-xs text-slate-600 bg-slate-50/60 p-3 rounded-lg border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-semibold text-slate-700">Task Scope: </span>
                    <span>{task.description}</span>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="font-medium text-slate-500">Progress:</span>
                    <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${task.progressPercent}%` }} className="bg-red-500 h-full rounded-full" />
                    </div>
                    <span className="font-bold text-slate-800">{task.progressPercent}%</span>
                  </div>
                </div>

                {/* Accountability Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    Timezone: Asia/Dhaka • Original deadline is permanently recorded in audit trail
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Employee can update delay reason or request extension */}
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setDelayReasonText(task.delayReason || '');
                        setDelayCategory(task.delayCategory || 'Dependency on another department');
                        setDelayModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Update Delay Reason</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setExtensionModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Request Extension</span>
                    </button>

                    {/* Manager / Head of HR can add comments */}
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setManagerCommentText(task.managerComments || '');
                        setCommentModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Manager Review Comment</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Update Delay Reason */}
      {delayModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Record Formal Delay Justification</h3>
            <p className="text-xs text-slate-500 mt-1">
              Task: <span className="font-semibold">{selectedTask.title}</span> ({selectedTask.taskCode})
            </p>

            <form onSubmit={handleDelaySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason Category</label>
                <select
                  value={delayCategory}
                  onChange={(e) => setDelayCategory(e.target.value as DelayCategory)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800"
                >
                  <option value="Dependency on another department">Dependency on another department</option>
                  <option value="Waiting for approval">Waiting for approval</option>
                  <option value="Incomplete information or data">Incomplete information or data</option>
                  <option value="Resource constraints">Resource constraints</option>
                  <option value="Unexpected urgent assignment">Unexpected urgent assignment</option>
                  <option value="Technical issue">Technical issue</option>
                  <option value="Workload conflict">Workload conflict</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Explanation (Preserved in immutable audit trail)
                </label>
                <textarea
                  rows={4}
                  required
                  value={delayReasonText}
                  onChange={(e) => setDelayReasonText(e.target.value)}
                  placeholder="Provide precise operational reasons for the deadline delay..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDelayModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Record Reason'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Request Deadline Extension */}
      {extensionModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Request Deadline Extension</h3>
            <p className="text-xs text-slate-500 mt-1">
              Current Deadline: <strong className="text-slate-700">{selectedTask.effectiveDeadline}</strong> (Original: {selectedTask.originalDeadline})
            </p>

            <form onSubmit={handleExtensionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requested Revised Deadline</label>
                <input
                  type="date"
                  required
                  value={requestedDeadline}
                  onChange={(e) => setRequestedDeadline(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Extension Justification</label>
                <textarea
                  rows={4}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Explain why an extension is necessary and what milestone will be completed..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Extension Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manager Review Comment */}
      {commentModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Manager Review Comments</h3>
            <p className="text-xs text-slate-500 mt-1">
              Reviewing: <span className="font-semibold">{selectedTask.title}</span> • Assigned to: {selectedTask.employeeName}
            </p>

            <form onSubmit={handleCommentSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Management Directive / Notes</label>
                <textarea
                  rows={4}
                  required
                  value={managerCommentText}
                  onChange={(e) => setManagerCommentText(e.target.value)}
                  placeholder="Enter feedback, guidance, escalation instructions, or condition for completion..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCommentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
