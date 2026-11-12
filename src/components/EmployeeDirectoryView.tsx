// src/components/EmployeeDirectoryView.tsx
import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Briefcase,
  GitBranch,
  CheckCircle,
  AlertOctagon,
  Clock,
  Target,
  Edit2,
  ChevronRight,
  Shield,
  ShieldCheck,
  Search,
  Trash2,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Employee, Task, KPI, Responsibility } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

// Automatic algorithmic star rating calculation for HR & OD team members
// Combines real-time Task completion rates and KPI achievements dynamically
export const calculateEmployeeStarRating = (
  emp: Employee,
  empTasks: Task[],
  empKpis: KPI[]
): number => {
  // Head of HR holds the executive supervisory oversight role
  if (emp.isHeadOfHr || emp.employeeCode === '01-02-0440') {
    return 5.0;
  }

  const totalTasks = empTasks.length;
  const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
  const overdueTasks = empTasks.filter((t) => t.isOverdue).length;

  let taskScore = 0;
  if (totalTasks > 0) {
    const completionRate = (completedTasks / totalTasks) * 100;
    taskScore = 2.0 + (completionRate / 100) * 2.2;
    taskScore -= overdueTasks * 0.4;
    if (completedTasks > 0 && overdueTasks === 0) {
      taskScore += 0.8;
    }
  }

  // Evaluate real-time KPI achievement from database
  const approvedKpis = empKpis.filter((k) => k.approvedAchievementPercentage !== null || k.actualValue !== null);
  let kpiScore = 0;
  if (approvedKpis.length > 0) {
    let kpiSum = 0;
    approvedKpis.forEach((k) => {
      const ach = k.approvedAchievementPercentage ?? (k.targetValue > 0 ? ((k.actualValue ?? 0) / k.targetValue) * 100 : 100);
      kpiSum += Math.min(120, ach);
    });
    const avgKpi = kpiSum / approvedKpis.length;
    kpiScore = (avgKpi / 100) * 5.0;
  }

  let finalRating = 0;
  if (totalTasks > 0 && approvedKpis.length > 0) {
    // Balanced weighted calculation: 40% task delivery + 60% KPI achievement
    finalRating = taskScore * 0.4 + kpiScore * 0.6;
  } else if (totalTasks > 0) {
    finalRating = taskScore;
  } else if (approvedKpis.length > 0) {
    finalRating = kpiScore;
  } else {
    return 0; // N/A (No active tasks/KPIs yet)
  }

  const clamped = Math.min(5.0, Math.max(1.0, finalRating));
  return Math.round(clamped * 10) / 10;
};

interface EmployeeDirectoryViewProps {
  employees: Employee[];
  tasks: Task[];
  kpis: KPI[];
  responsibilities: Responsibility[];
  onRefresh: () => void;
  onCreateEmployee: (data: Partial<Employee>) => Promise<void>;
  onUpdateEmployee: (id: number, data: Partial<Employee>) => Promise<void>;
  onDeleteEmployee?: (id: number) => Promise<void>;
}

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  employees,
  tasks,
  kpis,
  responsibilities,
  onRefresh,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const { activePersona } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resigned'>('all');

  // Authorized leadership: Admin, Syeda Shaila Ashraf (Head of HR), Shahriyar Naiem (HR Manager)
  const canManage =
    activePersona.role === 'admin' ||
    activePersona.employeeCode === '02-02-2222' ||
    activePersona.employeeCode === '01-02-0440' || // Syeda Shaila Ashraf
    activePersona.role === 'head_of_hr' ||
    activePersona.employeeCode === '22-02-1826' || // Shahriyar Naiem
    activePersona.role === 'hr_manager';

  const filteredEmployees = employees.filter((emp) => {
    if (statusFilter === 'active' && (emp.status === 'resigned' || emp.status === 'inactive')) return false;
    if (statusFilter === 'resigned' && emp.status !== 'resigned') return false;
    const q = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await onCreateEmployee(formData);
      setCreateModalOpen(false);
      setFormData({});
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      setActionLoading(true);
      await onUpdateEmployee(selectedEmployee.id, formData);
      setEditModalOpen(false);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR &amp; OD Employee Directory</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            5 core team members, designated Head of HR, reporting hierarchy &amp; performance profiles
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee, designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg w-56 md:w-64 bg-white"
            />
          </div>

          {canManage && (
            <button
              onClick={() => {
                setFormData({
                  employeeCode: `EMP-00${employees.length + 1}`,
                  status: 'active',
                  department: 'Human Resources & OD',
                });
                setCreateModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs: All, Active, Resigned */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-1.5 text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Members ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active HR Team ({employees.filter((e) => e.status !== 'resigned').length})
          </button>
          <button
            onClick={() => setStatusFilter('resigned')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'resigned'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resigned / Ex-Employees ({employees.filter((e) => e.status === 'resigned').length})
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium px-2">
          {canManage ? (
            <span className="text-emerald-700 font-semibold">
              Leadership Mode: Syeda Shaila Ashraf &amp; Managers can Add, Edit &amp; Resign/Delete
            </span>
          ) : (
            <span>Directory View</span>
          )}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          const empTasks = tasks.filter((t) => t.assignedEmployeeId === emp.id);
          const empKpis = kpis.filter((k) => k.employeeId === emp.id);
          const empResps = responsibilities.filter((r) => r.employeeId === emp.id);

          const realTotalTasks = empTasks.length;
          const realCompletedTasks = empTasks.filter((t) => t.status === 'Completed').length;
          const overdueCount = empTasks.filter((t) => t.isOverdue).length;
          const realCompletionRate = realTotalTasks > 0 ? Math.round((realCompletedTasks / realTotalTasks) * 100) : 0;

          const autoRating = calculateEmployeeStarRating(emp, empTasks, empKpis);

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-xl border transition shadow-xs hover:shadow-md flex flex-col justify-between ${
                emp.isHeadOfHr
                  ? 'border-purple-300 ring-2 ring-purple-100'
                  : overdueCount > 0
                  ? 'border-red-300'
                  : 'border-slate-200'
              }`}
            >
              <div className="p-5">
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                        emp.isHeadOfHr
                          ? 'bg-purple-600 text-white'
                          : 'bg-gradient-to-br from-slate-700 to-indigo-800 text-white'
                      }`}
                    >
                      {emp.avatarInitials || emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                        {emp.isHeadOfHr && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded uppercase border border-purple-200">
                            Head of HR
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600">{emp.designation}</p>
                      <span className="font-mono text-[11px] text-slate-400">{emp.employeeCode}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Automatic Performance Star Rating */}
                    {autoRating > 0 ? (
                      <div
                        title="Algorithmic rating based on task completion, on-time delivery & accountability"
                        className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black font-mono">{autoRating.toFixed(1)}</span>
                        <span className="text-[10px] text-amber-600/70">/ 5.0</span>
                      </div>
                    ) : (
                      <div
                        title="No tasks have been assigned yet to compute an automatic rating"
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 shadow-2xs"
                      >
                        <span className="text-xs font-bold font-mono">N/A</span>
                        <span className="text-[10px] text-slate-400 font-medium">(No Tasks)</span>
                      </div>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        emp.status === 'resigned'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : emp.status === 'inactive'
                          ? 'bg-slate-100 text-slate-600 border border-slate-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {emp.status === 'resigned' ? 'Resigned' : emp.status}
                    </span>
                  </div>
                </div>

                {/* Reporting Line */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center space-x-2 text-xs text-slate-600">
                  <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px]">
                    Reports to: <strong className="text-slate-800">{emp.isHeadOfHr ? 'Managing Director / Board' : 'Syeda Shaila Ashraf (Head of HR)'}</strong>
                  </span>
                </div>

                {/* Role Specific Performance / Supervisory Display */}
                {emp.isHeadOfHr || emp.employeeCode === '01-02-0440' ? (
                  <div className="mt-4 bg-purple-50/70 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-950 dark:text-purple-200">
                      <span className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Executive Oversight</span>
                      </span>
                      <span className="font-mono text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded font-bold uppercase">
                        Supervisory Head
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-purple-200/60 dark:border-purple-800/40">
                      <div>
                        <span className="text-[10px] text-purple-600/80 dark:text-purple-300/80 font-medium">Department Role</span>
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-100">HR &amp; OD Strategy</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-600/80 dark:text-purple-300/80 font-medium">Approval SLA</span>
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">100% On-Time</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-purple-700/90 dark:text-purple-300/80 text-center font-medium">
                      Executive director over all departmental tasks, appraisals &amp; requisitions
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2.5 mt-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] font-medium text-slate-500">Tasks</span>
                        <div className="text-sm font-bold text-slate-800">{realTotalTasks}</div>
                        <span className="text-[10px] text-emerald-600 font-medium">{realCompletedTasks} done</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-500">Overdue</span>
                        <div className={`text-sm font-extrabold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                          {overdueCount}
                        </div>
                        <span className="text-[10px] text-slate-400">tasks</span>
                      </div>
                    </div>

                    {/* Task Completion Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Task Completion Rate</span>
                        <span className="font-semibold text-slate-700">{realCompletionRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${realCompletionRate}%` }}
                          className="h-full bg-emerald-500 rounded-full transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Automatic Star Rating Detail Row */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center space-x-1 font-medium">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Automatic Star Rating:</span>
                  </span>
                  {autoRating > 0 ? (
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                      ★ {autoRating.toFixed(1)} / 5.0
                    </span>
                  ) : (
                    <span className="font-mono font-medium text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      N/A (No Tasks Assigned)
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-700 font-semibold">
                    {emp.department || 'HR'}
                  </span>
                  {emp.joinDate && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      DOJ: <span className="font-semibold text-slate-700">{emp.joinDate}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setFormData({
                            name: emp.name,
                            designation: emp.designation,
                            department: emp.department,
                            joinDate: emp.joinDate,
                            reportingManagerId: emp.reportingManagerId,
                            reportingManagerName: emp.reportingManagerName,
                            status: emp.status,
                            isHeadOfHr: emp.isHeadOfHr,
                          });
                          setEditModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                        title="Edit Profile & Status"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!emp.isHeadOfHr && emp.employeeCode !== '01-02-0440' && (
                        <button
                          onClick={() => {
                            setEmployeeToDelete(emp);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove / Resign Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setSelectedEmployee(emp)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
                  >
                    <span>Profile Dossier</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EMPLOYEE DOSSIER DRAWER / MODAL */}
      {selectedEmployee && !editModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
                  {selectedEmployee.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold">{selectedEmployee.name}</h2>
                    {selectedEmployee.isHeadOfHr && (
                      <span className="text-[10px] bg-purple-500/30 text-purple-200 font-bold px-2 py-0.5 rounded uppercase border border-purple-400">
                        Head of HR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{selectedEmployee.designation}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                    <span>ID: {selectedEmployee.employeeCode}</span>
                    <span>•</span>
                    <span>Dept: {selectedEmployee.department || 'HR'}</span>
                    {selectedEmployee.joinDate && (
                      <>
                        <span>•</span>
                        <span>DOJ: {selectedEmployee.joinDate}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Clean Profile Details */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Employee Profile &amp; Organization Hierarchy
                </h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Employee ID:</span>
                    <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{selectedEmployee.employeeCode}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Department:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.department || 'HR'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Date of Joining (DOJ):</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedEmployee.joinDate || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Reporting Manager:</span>
                    <p className="font-bold text-indigo-700 mt-0.5">
                      {selectedEmployee.isHeadOfHr ? 'Managing Director / Board' : 'Syeda Shaila Ashraf (Head of HR)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Account Status:</span>
                    <p className="mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        selectedEmployee.status === 'resigned'
                          ? 'bg-rose-100 text-rose-800'
                          : selectedEmployee.status === 'inactive'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedEmployee.status === 'resigned' ? 'Resigned' : selectedEmployee.status || 'Active'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Task Performance Metrics / Supervisory Overview */}
              {selectedEmployee.isHeadOfHr || selectedEmployee.employeeCode === '01-02-0440' ? (
                <div className="bg-purple-50/80 rounded-xl p-4 border border-purple-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-purple-950 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Executive Governance &amp; Supervisory Portfolio</span>
                    </h4>
                    <span className="text-[10px] text-purple-800 bg-purple-100 px-2 py-0.5 rounded font-bold border border-purple-300">
                      Supervisory Head
                    </span>
                  </div>
                  <p className="text-xs text-purple-900 leading-relaxed">
                    Syeda Shaila Ashraf directs the overall Department of Human Resources &amp; Organizational Development. Her portfolio encompasses group-level talent strategy, unit capacity allocation, final review and sign-off on all employee KPIs, and leadership sanctioning of recruitment requisitions.
                  </p>
                  <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                    <div className="p-2.5 bg-white rounded-lg border border-purple-200">
                      <span className="text-[10px] text-purple-600 font-medium">Departmental Scope</span>
                      <div className="text-xs font-bold text-purple-950 mt-0.5">HR &amp; OD Group-Wide</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-purple-200">
                      <span className="text-[10px] text-purple-600 font-medium">Approval Authority</span>
                      <div className="text-xs font-bold text-emerald-700 mt-0.5">Final Sign-Off</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-purple-200">
                      <span className="text-[10px] text-purple-600 font-medium">Leadership Rating</span>
                      <div className="text-xs font-black text-amber-600 flex items-center justify-center space-x-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>5.0 / 5.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Task Execution &amp; Rating Overview
                    </h4>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                      Auto-Calculated
                    </span>
                  </div>
                  {(() => {
                    const selTasks = tasks.filter((t) => t.assignedEmployeeId === selectedEmployee.id);
                    const selKpis = kpis.filter((k) => k.employeeId === selectedEmployee.id);
                    const dossierRating = calculateEmployeeStarRating(selectedEmployee, selTasks, selKpis);
                    const selTotalTasks = selTasks.length;
                    const selCompletedTasks = selTasks.filter((t) => t.status === 'Completed').length;
                    const selOverdueTasks = selTasks.filter((t) => t.isOverdue).length;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-medium">Assigned Tasks</span>
                          <div className="text-base font-bold text-slate-900">{selTotalTasks}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-medium">Completed</span>
                          <div className="text-base font-bold text-emerald-700">{selCompletedTasks}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-medium">Overdue Tasks</span>
                          <div
                            className={`text-base font-bold ${
                              selOverdueTasks > 0 ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {selOverdueTasks}
                          </div>
                        </div>
                        <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
                          <span className="text-[10px] text-amber-700 font-bold uppercase">Star Rating</span>
                          {dossierRating > 0 ? (
                            <div className="text-base font-black text-amber-700 flex items-center justify-center space-x-1 font-mono">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span>{dossierRating.toFixed(1)}</span>
                              <span className="text-[10px] text-amber-600/70 font-normal">/ 5.0</span>
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-500 flex items-center justify-center font-mono py-1">
                              N/A (No Tasks)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Add New Team Member</h3>
            <p className="text-xs text-slate-500 mt-1">Authorized creation for Renaissance HR &amp; OD</p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode || ''}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@renaissance.com.bd"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Executive, HR"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department || 'Human Resources & OD'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={formData.reportingManagerId || ''}
                  onChange={(e) => {
                    const manager = employees.find((emp) => emp.id === parseInt(e.target.value, 10));
                    setFormData({
                      ...formData,
                      reportingManagerId: e.target.value,
                      reportingManagerName: manager ? manager.name : '',
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">Select Reporting Manager</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="headOfHrCheck"
                  checked={formData.isHeadOfHr || false}
                  onChange={(e) => setFormData({ ...formData, isHeadOfHr: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="headOfHrCheck" className="text-slate-700 font-medium">
                  Assign as Head of HR supervisory role
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Edit Employee Profile</h3>
            <p className="text-xs text-slate-500 mt-1">{selectedEmployee.name} ({selectedEmployee.employeeCode})</p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="active">Active (Currently Employed)</option>
                    <option value="resigned">Resigned (Left Organization)</option>
                    <option value="inactive">Inactive / On Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="HR or HR & OD"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Joining (DOJ)</label>
                  <input
                    type="text"
                    value={formData.joinDate || ''}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    placeholder="DD-Mmm-YY (e.g. 07-Aug-16)"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={formData.reportingManagerId || ''}
                  onChange={(e) => {
                    const manager = employees.find((emp) => emp.id === parseInt(e.target.value, 10));
                    setFormData({
                      ...formData,
                      reportingManagerId: e.target.value,
                      reportingManagerName: manager ? manager.name : '',
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">No Reporting Manager (Top Supervisory)</option>
                  {employees
                    .filter((emp) => emp.id !== selectedEmployee.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editHeadCheck"
                  checked={formData.isHeadOfHr || false}
                  onChange={(e) => setFormData({ ...formData, isHeadOfHr: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="editHeadCheck" className="text-slate-700 font-medium">
                  Configured Head of HR supervisory role
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {!selectedEmployee.isHeadOfHr && selectedEmployee.employeeCode !== '01-02-0440' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeToDelete(selectedEmployee);
                      setEditModalOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                    className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 font-semibold flex items-center space-x-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Employee</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    {actionLoading ? 'Updating...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE / RESIGN CONFIRMATION MODAL */}
      {deleteConfirmOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove or Resign Employee</h3>
                <p className="text-xs text-slate-500">Departure &amp; Account Management</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <strong className="text-slate-900">{employeeToDelete.name}</strong> ({employeeToDelete.employeeCode} - {employeeToDelete.designation})?
            </p>

            <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1.5">
              <p className="font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Recommended Management Options:</span>
              </p>
              <p>
                • <strong>Mark as Resigned (Recommended):</strong> Moves them to the Resigned archive. Historical task accomplishments and past recruitment Turnaround Time (TTF) records remain preserved.<br />
                • <strong>Delete Permanently:</strong> Completely wipes the employee record from the system.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setEmployeeToDelete(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition text-center"
              >
                Cancel
              </button>

              {employeeToDelete.status === 'resigned' ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    try {
                      setActionLoading(true);
                      await onUpdateEmployee(employeeToDelete.id, { status: 'active' });
                      setDeleteConfirmOpen(false);
                      setEmployeeToDelete(null);
                      onRefresh();
                    } catch (err: any) {
                      alert(err.message || 'Failed to reactivate employee');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition text-center"
                >
                  {actionLoading ? 'Processing...' : 'Reactivate to Active Team'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    try {
                      setActionLoading(true);
                      await onUpdateEmployee(employeeToDelete.id, { status: 'resigned' });
                      setDeleteConfirmOpen(false);
                      setEmployeeToDelete(null);
                      onRefresh();
                    } catch (err: any) {
                      alert(err.message || 'Failed to mark employee as resigned');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition text-center"
                >
                  {actionLoading ? 'Processing...' : 'Mark as Resigned (Archive)'}
                </button>
              )}

              {onDeleteEmployee && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Are you sure you want to permanently delete ${employeeToDelete.name}? This cannot be undone.`
                      )
                    ) {
                      return;
                    }
                    try {
                      setActionLoading(true);
                      await onDeleteEmployee(employeeToDelete.id);
                      setDeleteConfirmOpen(false);
                      setEmployeeToDelete(null);
                      onRefresh();
                    } catch (err: any) {
                      alert(err.message || 'Failed to delete employee');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition text-center"
                >
                  {actionLoading ? 'Processing...' : 'Delete Permanently'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
