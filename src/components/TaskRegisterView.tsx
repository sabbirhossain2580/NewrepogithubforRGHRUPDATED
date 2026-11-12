// src/components/TaskRegisterView.tsx
import React, { useState } from 'react';
import {
  CheckSquare,
  PlusCircle,
  Search,
  Filter,
  Clock,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  User,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  MessageSquare,
  Trash2,
  HelpCircle,
  Info,
  X,
  BellRing,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  Task,
  Employee,
  Responsibility,
  TaskPriority,
  TaskStatus,
  DelayCategory,
} from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

interface TaskRegisterViewProps {
  tasks: Task[];
  employees: Employee[];
  responsibilities?: Responsibility[];
  viewMode?: 'all' | 'my-tasks' | 'pending-approvals' | 'poked-overdue';
  onRefresh: () => void;
  onCreateTask: (data: any) => Promise<void>;
  onUpdateTask: (id: number, data: any) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onSubmitTask: (id: number, data: { completionNotes: string; attachments?: string }) => Promise<void>;
  onReviewTask: (id: number, data: { decision: 'approve' | 'reject' | 'revision'; managerComments: string }) => Promise<void>;
  onRequestExtension: (id: number, data: { requestedDeadline: string; reasonCategory: string; detailedReason: string }) => Promise<void>;
  onDecideExtension: (id: number, data: { requestId?: number; decision: 'approve' | 'reject'; reviewerComments?: string; approvedDeadline?: string }) => Promise<void>;
}

export const TaskRegisterView: React.FC<TaskRegisterViewProps> = ({
  tasks,
  employees,
  viewMode = 'all',
  onRefresh,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onSubmitTask,
  onReviewTask,
  onRequestExtension,
  onDecideExtension,
}) => {
  const { activePersona, canDelete, canPoke, canApprove } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showGuideBanner, setShowGuideBanner] = useState(true);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskAuditHistory, setTaskAuditHistory] = useState<{ logs: any[]; extensions: any[] }>({ logs: [], extensions: [] });

  // Form states
  const [createForm, setCreateForm] = useState<any>({
    priority: 'Medium',
    originalDeadline: '2026-11-15',
  });
  const [completionNotes, setCompletionNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject' | 'revision'>('approve');
  const [reviewComments, setReviewComments] = useState('');
  const [extensionDeadline, setExtensionDeadline] = useState('');
  const [extensionReasonCategory, setExtensionReasonCategory] = useState('Dependency on another department');
  const [extensionReasonText, setExtensionReasonText] = useState('');
  const [newProgress, setNewProgress] = useState(0);
  const [newDelayReason, setNewDelayReason] = useState('');
  const [newDelayCategory, setNewDelayCategory] = useState<DelayCategory>('Workload conflict');

  const [loadingAction, setLoadingAction] = useState(false);

  // All employees can create tasks (canCreate = true)
  const canCreate = true;

  // Filter tasks based on viewMode and user filters
  const filteredTasks = tasks.filter((t) => {
    // 1. View Mode filters
    if (viewMode === 'my-tasks') {
      const isMyTask =
        t.employeeCode === activePersona.employeeCode ||
        t.assignedEmployeeId === employees.find((e) => e.employeeCode === activePersona.employeeCode)?.id;
      if (!isMyTask) return false;
    } else if (viewMode === 'pending-approvals') {
      const isPending = t.status === 'Submitted for Review' || t.approvalStatus === 'Pending Review';
      if (!isPending) return false;
    } else if (viewMode === 'poked-overdue') {
      const isPokedOrOverdue = t.isPoked || t.isOverdue;
      if (!isPokedOrOverdue) return false;
    }

    // 2. Comprehensive search query filter (by keyword, employee name, or task ID)
    let matchSearch = true;
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      const qClean = q.replace(/[^a-z0-9]/g, '');
      const taskCodeClean = (t.taskCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const empCodeClean = (t.employeeCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      matchSearch = Boolean(
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.taskCode && t.taskCode.toLowerCase().includes(q)) ||
        (taskCodeClean && qClean && taskCodeClean.includes(qClean)) ||
        (t.employeeName && t.employeeName.toLowerCase().includes(q)) ||
        (t.employeeCode && t.employeeCode.toLowerCase().includes(q)) ||
        (empCodeClean && qClean && empCodeClean.includes(qClean)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.priority && t.priority.toLowerCase().includes(q)) ||
        (t.status && t.status.toLowerCase().includes(q)) ||
        (t.delayReason && t.delayReason.toLowerCase().includes(q)) ||
        (t.managerComments && t.managerComments.toLowerCase().includes(q))
      );
    }

    // 3. Status filter
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'Overdue'
        ? t.isOverdue
        : statusFilter === 'Poked'
        ? t.isPoked
        : t.status === statusFilter;

    // 4. Priority filter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    // 5. Employee filter
    const matchEmployee = employeeFilter === 'all' || t.assignedEmployeeId === parseInt(employeeFilter, 10);

    return matchSearch && matchStatus && matchPriority && matchEmployee;
  });

  const handlePoke = async (taskId: number) => {
    try {
      setLoadingAction(true);
      await api.pokeTask(taskId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to poke task');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUnpoke = async (taskId: number) => {
    try {
      setLoadingAction(true);
      await api.unpokeTask(taskId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss poke');
    } finally {
      setLoadingAction(false);
    }
  };

  const openHistory = async (task: Task) => {
    setSelectedTask(task);
    try {
      const res = await api.getTaskHistory(task.id);
      setTaskAuditHistory(res);
      setHistoryModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      await onCreateTask(createForm);
      setCreateModalOpen(false);
      setCreateForm({
        priority: 'Medium',
        originalDeadline: '2026-11-15',
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setLoadingAction(true);
    try {
      await onDeleteTask(taskToDelete.id);
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoadingAction(true);
    try {
      await onSubmitTask(selectedTask.id, {
        completionNotes,
      });
      setSubmitModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit task');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoadingAction(true);
    try {
      await onReviewTask(selectedTask.id, {
        decision: reviewDecision,
        managerComments: reviewComments,
      });
      setReviewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoadingAction(true);
    try {
      await onUpdateTask(selectedTask.id, {
        progressPercent: newProgress,
        delayReason: newDelayReason || null,
        delayCategory: newDelayReason ? newDelayCategory : null,
      });
      setProgressModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoadingAction(true);
    try {
      await onRequestExtension(selectedTask.id, {
        requestedDeadline: extensionDeadline,
        reasonCategory: extensionReasonCategory,
        detailedReason: extensionReasonText,
      });
      setExtensionModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to request extension');
    } finally {
      setLoadingAction(false);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (t: Task) => {
    if (t.isPoked) {
      return (
        <span className="bg-red-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-xs uppercase inline-flex items-center space-x-1 animate-pulse">
          <Flame className="w-3 h-3 text-amber-300" />
          <span>POKED (#{t.pokeCount})</span>
        </span>
      );
    }

    if (t.isOverdue) {
      return (
        <span className="bg-red-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-xs uppercase inline-flex items-center space-x-1">
          <AlertOctagon className="w-3 h-3" />
          <span>OVERDUE ({t.daysOverdue}d)</span>
        </span>
      );
    }

    switch (t.status) {
      case 'Completed':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'Submitted for Review':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Under Review</span>
          </span>
        );
      case 'Revision Required':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
            Revision Needed
          </span>
        );
      case 'In Progress':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 font-medium text-[10px] px-2 py-0.5 rounded uppercase">
            In Progress
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[10px] px-2 py-0.5 rounded uppercase">
            {t.status}
          </span>
        );
    }
  };

  const viewModeTitles: Record<string, { title: string; subtitle: string }> = {
    all: {
      title: 'Task Assignment & Tracking Register',
      subtitle: 'Official Renaissance Group HR & OD task execution, follow-ups, and review workflow',
    },
    'my-tasks': {
      title: `My Assigned Tasks (${activePersona.name})`,
      subtitle: `Official tasks assigned to Employee ID ${activePersona.employeeCode}. Update progress or submit for final review.`,
    },
    'pending-approvals': {
      title: 'Pending Approvals',
      subtitle: 'Tasks submitted by team members awaiting final decision from Syeda Shaila Ashraf or Shahriyar Naiem.',
    },
    'poked-overdue': {
      title: '🚨 Poked & Overdue Alert Register',
      subtitle: 'Critical urgent tasks: Poked by leadership or past deadline requiring immediate employee response.',
    },
  };

  const currentTitle = viewModeTitles[viewMode] || viewModeTitles.all;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg shadow-sm text-white ${
              viewMode === 'poked-overdue' ? 'bg-red-600' : 'bg-indigo-600'
            }`}>
              {viewMode === 'poked-overdue' ? <ShieldAlert className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {currentTitle.title}
              </h1>
              <p className="text-xs md:text-sm text-slate-500">
                {currentTitle.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canCreate && (
            <button
              onClick={() => {
                const defaultAssignee =
                  viewMode === 'my-tasks'
                    ? employees.find((e) => e.employeeCode === activePersona.employeeCode)?.id || employees[0]?.id
                    : employees[1]?.id || employees[0]?.id;

                setCreateForm({
                  assignedEmployeeId: defaultAssignee,
                  priority: 'Medium',
                  startDate: '2026-10-29',
                  originalDeadline: '2026-11-10',
                });
                setCreateModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Create &amp; Assign Task</span>
            </button>
          )}
        </div>
      </div>



      {/* Search Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Prominent Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by keyword, task ID (e.g. TSK-1001), task title, or employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'all' && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Assignees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Poked" className="text-red-700 font-bold">
                🚨 Poked Tasks Only
              </option>
              <option value="Overdue" className="text-red-600 font-bold">
                🚨 Overdue Tasks Only
              </option>
              <option value="In Progress">In Progress</option>
              <option value="Submitted for Review">Submitted for Review</option>
              <option value="Revision Required">Revision Required</option>
              <option value="Completed">Completed</option>
              <option value="Not Started">Not Started</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || employeeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setEmployeeFilter('all');
                }}
                className="px-3 py-2.5 text-xs text-slate-500 hover:text-red-600 font-semibold transition flex items-center space-x-1"
                title="Reset all search & filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Results summary bar with active search query pill */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span>
              Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredTasks.length}</strong> of{' '}
              <span className="font-mono">{tasks.length}</span> tasks
            </span>
            {searchTerm && (
              <span className="inline-flex items-center space-x-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium">
                <span>Keyword: &quot;{searchTerm}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-indigo-900 ml-0.5"
                  title="Remove keyword filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Filter by Task ID, title, keyword or employee name
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Task Title &amp; Scope</th>
                <th className="py-3 px-4">Assignee &amp; ID</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                        {searchTerm ? `No tasks found matching "${searchTerm}"` : 'No tasks found matching current filters'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {searchTerm
                          ? 'Try searching by task ID (e.g. TSK-1001), keyword, or assignee employee name.'
                          : 'Try adjusting or resetting your status and priority filters.'}
                      </p>
                      {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || employeeFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setPriorityFilter('all');
                            setEmployeeFilter('all');
                          }}
                          className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Clear Search &amp; Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isRowPoked = !!task.isPoked;
                  const isRowOverdue = !isRowPoked && !!task.isOverdue;

                  return (
                    <tr
                      key={task.id}
                      className={`transition ${
                        isRowPoked
                          ? 'bg-red-100 hover:bg-red-150 border-l-4 border-l-red-600 text-red-950 font-medium'
                          : isRowOverdue
                          ? 'bg-red-50/40 hover:bg-red-50/70 border-l-2 border-l-red-400'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isRowPoked ? 'text-red-900 font-extrabold' : 'text-slate-800'}>
                          {task.taskCode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span className={isRowPoked ? 'text-red-950 font-bold' : ''}>{task.title}</span>
                        </div>
                        <p className={`line-clamp-1 mt-0.5 ${isRowPoked ? 'text-red-800' : 'text-slate-500'}`}>
                          {task.description}
                        </p>

                        {/* POKED RED BANNER */}
                        {isRowPoked && (
                          <div className="bg-red-600 text-white text-[11px] font-bold p-1 px-2.5 rounded-md mt-1.5 flex items-center justify-between shadow-xs">
                            <span className="flex items-center space-x-1.5">
                              <Flame className="w-3.5 h-3.5 text-amber-300" />
                              <span>🚨 POKED BY {task.pokedBy || 'MANAGEMENT'}: Urgent follow-up requested! Please update progress immediately.</span>
                            </span>
                            {canPoke && (
                              <button
                                onClick={() => handleUnpoke(task.id)}
                                className="text-[10px] bg-red-800 hover:bg-red-900 text-white px-2 py-0.5 rounded ml-2 shrink-0 font-medium transition"
                                title="Dismiss this poke"
                              >
                                Dismiss Poke
                              </button>
                            )}
                          </div>
                        )}

                        {task.delayReason && !isRowPoked && (
                          <div className="text-[10px] text-red-700 font-medium mt-1 bg-red-50 p-1 rounded border border-red-200">
                            Delay: {task.delayReason}
                          </div>
                        )}
                        {task.managerComments && (
                          <div className="text-[10px] text-blue-700 font-medium mt-1 bg-blue-50 p-1 rounded border border-blue-200">
                            Manager: {task.managerComments}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{task.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{task.employeeDesignation}</div>
                        <div className="text-[10px] text-indigo-700 font-mono font-bold">
                          ID: {task.employeeCode}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">Due: {task.originalDeadline}</div>
                        {task.revisedDeadline && (
                          <div className="text-[10px] font-bold text-indigo-700">Revised: {task.revisedDeadline}</div>
                        )}
                        {task.completionDate && (
                          <div className="text-[10px] text-emerald-600 font-semibold">Done: {task.completionDate}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="w-24">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-700 mb-0.5">
                            <span>{task.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${task.progressPercent}%` }}
                              className={`h-full rounded-full ${
                                isRowPoked || task.isOverdue
                                  ? 'bg-red-600'
                                  : task.progressPercent === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-blue-600'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(task)}</td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* POKE BUTTON: Only for Shaila Mam, Naiem, and Admin */}
                          {canPoke && task.status !== 'Completed' && (
                            <button
                              onClick={() => handlePoke(task.id)}
                              className={`px-2 py-1 text-[11px] font-bold rounded transition flex items-center space-x-1 ${
                                task.isPoked
                                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-300'
                              }`}
                              title={`Poke (${task.pokedBy ? `Last poked by ${task.pokedBy}` : 'Click to urge employee'})`}
                            >
                              <span>👉 Poke</span>
                              {task.pokeCount > 0 && (
                                <span className="text-[9px] bg-red-900 text-white px-1 rounded-full font-mono">
                                  {task.pokeCount}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Update progress */}
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setNewProgress(task.progressPercent);
                              setNewDelayReason(task.delayReason || '');
                              setProgressModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="Update Progress & Delay Reason"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Submit for review (For all employees) */}
                          {task.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setCompletionNotes(task.employeeCompletionNotes || '');
                                setSubmitModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Submit Task for Leadership Approval"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Leadership Review: Only Shaila Mam & Naiem */}
                          {canApprove && (task.status === 'Submitted for Review' || task.approvalStatus === 'Pending Review' || task.isOverdue) && (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setReviewDecision('approve');
                                setReviewComments('');
                                setReviewModalOpen(true);
                              }}
                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded font-semibold text-[11px] px-2 transition flex items-center space-x-1"
                              title="Final Leadership Approval / Review"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Request Extension */}
                          {task.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setExtensionDeadline(task.effectiveDeadline);
                                setExtensionModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                              title="Request Deadline Extension"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* History & Audit */}
                          <button
                            onClick={() => openHistory(task)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="View Audit Trail"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Task: ONLY for Shaila Mam, Naiem, and Admin */}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setTaskToDelete(task);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete Task (টাস্ক মুছুন)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE TASK */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Create &amp; Assign Task</h3>
            <p className="text-xs text-slate-500 mt-1">Renaissance Group • Human Resources &amp; OD</p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title (টাস্কের শিরোনাম)</label>
                <input
                  type="text"
                  required
                  value={createForm.title || ''}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Prepare Q4 Employee Engagement Survey Results"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Scope &amp; Instructions (কাজের বিবরণ)</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Detailed deliverables, expectations, and milestones..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign to Employee</label>
                  <select
                    required
                    value={createForm.assignedEmployeeId || ''}
                    onChange={(e) => setCreateForm({ ...createForm, assignedEmployeeId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="">Select Assignee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority || 'Medium'}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate || '2026-10-29'}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deadline (Asia/Dhaka)</label>
                  <input
                    type="date"
                    required
                    value={createForm.originalDeadline || ''}
                    onChange={(e) => setCreateForm({ ...createForm, originalDeadline: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Saving...' : 'Confirm & Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE (Only for Shaila Mam, Naiem, and Admin) */}
      {deleteModalOpen && taskToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Task (টাস্ক মুছে ফেলুন)</h3>
                <p className="text-xs text-rose-600 font-semibold">Permanent deletion from Cloud Database</p>
              </div>
            </div>

            <div className="bg-rose-50/60 p-3.5 rounded-lg border border-rose-100 text-xs space-y-1.5 my-3">
              <div>
                <span className="text-slate-500">Task Code:</span>{' '}
                <strong className="font-mono text-slate-900">{taskToDelete.taskCode}</strong>
              </div>
              <div>
                <span className="text-slate-500">Title:</span>{' '}
                <strong className="text-slate-900">{taskToDelete.title}</strong>
              </div>
              <div>
                <span className="text-slate-500">Assignee:</span>{' '}
                <span className="text-slate-800">{taskToDelete.employeeName} ({taskToDelete.employeeCode})</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              আপনি কি নিশ্চিত যে এই টাস্কটি ক্লাউড ডাটাবেজ থেকে মুছে ফেলতে চান? টাস্কের সমস্ত অগ্রগতি ও হিস্টোরি স্থায়ীভাবে মুছে যাবে।
            </p>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTaskToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm"
              >
                {loadingAction ? 'Deleting...' : 'Confirm Delete (মুছে ফেলুন)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PROGRESS UPDATE */}
      {progressModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Update Progress &amp; Delay Reasons</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedTask.taskCode} - {selectedTask.title}</p>

            <form onSubmit={handleProgressUpdate} className="mt-4 space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Current Progress:</span>
                  <span className="text-indigo-600 font-mono text-sm">{newProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newProgress}
                  onChange={(e) => setNewProgress(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Delay (বিলম্বের কারণ, যদি থাকে)</label>
                <textarea
                  rows={2}
                  value={newDelayReason}
                  onChange={(e) => setNewDelayReason(e.target.value)}
                  placeholder="Specify blockers, waiting on other departments, etc."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              {newDelayReason && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delay Category</label>
                  <select
                    value={newDelayCategory}
                    onChange={(e) => setNewDelayCategory(e.target.value as DelayCategory)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
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
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Updating...' : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SUBMIT FOR REVIEW */}
      {submitModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Submit Task for Approval (অনুমোদনের আবেদন)</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedTask.taskCode} - {selectedTask.title}</p>

            <form onSubmit={handleSubmitReview} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Completion Notes &amp; Summary (কাজের বিবরণ ও প্রমাণক)</label>
                <textarea
                  rows={4}
                  required
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Provide completion summary, document links, or deliverables achieved..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                সাবমিট করার পর টাস্কটি <strong>Under Review</strong> স্ট্যাটাসে যাবে এবং Syeda Shaila Ashraf বা Shahriyar Naiem চূড়ান্ত অনুমোদন প্রদান করবেন।
              </p>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: LEADERSHIP REVIEW / APPROVAL */}
      {reviewModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Leadership Task Decision (চূড়ান্ত অনুমোদন)</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedTask.taskCode} - {selectedTask.title}</p>

            <form onSubmit={handleReviewDecision} className="mt-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500">Employee Notes:</div>
                <div className="text-slate-800 mt-0.5 font-medium">
                  {selectedTask.employeeCompletionNotes || 'No completion notes provided.'}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approve')}
                    className={`py-2 text-center rounded-lg font-bold border transition ${
                      reviewDecision === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('revision')}
                    className={`py-2 text-center rounded-lg font-bold border transition ${
                      reviewDecision === 'revision'
                        ? 'bg-amber-500 text-slate-900 border-amber-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ↺ Revision
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('reject')}
                    className={`py-2 text-center rounded-lg font-bold border transition ${
                      reviewDecision === 'reject'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Feedback &amp; Manager Comments</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Feedback, appreciation, or revision instructions..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EXTENSION REQUEST */}
      {extensionModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Request Deadline Extension</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selectedTask.taskCode} - Current: {selectedTask.effectiveDeadline}</p>

            <form onSubmit={handleExtensionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Proposed New Deadline</label>
                <input
                  type="date"
                  required
                  value={extensionDeadline}
                  onChange={(e) => setExtensionDeadline(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason Category</label>
                <select
                  value={extensionReasonCategory}
                  onChange={(e) => setExtensionReasonCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
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
                <label className="block font-bold text-slate-700 mb-1">Detailed Justification</label>
                <textarea
                  rows={3}
                  required
                  value={extensionReasonText}
                  onChange={(e) => setExtensionReasonText(e.target.value)}
                  placeholder="Explain why the current deadline cannot be met..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExtensionModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {loadingAction ? 'Submitting...' : 'Send Extension Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: AUDIT HISTORY */}
      {historyModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Task Audit Trail (অডিট হিস্টোরি)</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTask.taskCode} - {selectedTask.title}</p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 space-y-3 pr-1 text-xs">
              {taskAuditHistory.logs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No audit log records available.</div>
              ) : (
                taskAuditHistory.logs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="capitalize text-indigo-700 font-bold">{log.actionType.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 text-[11px]">{log.actionSummary}</p>
                    <div className="mt-1 text-[10px] text-slate-400 font-medium">By: {log.performedBy}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-lg"
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
