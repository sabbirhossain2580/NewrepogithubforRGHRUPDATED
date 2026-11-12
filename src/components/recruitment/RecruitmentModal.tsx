// src/components/recruitment/RecruitmentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Building,
  Calendar,
  User,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  DollarSign,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { RecruitmentRequisition, RecruitmentStatus, RecruitmentType, Employee } from '../../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RecruitmentRequisition>) => Promise<void>;
  requisition: RecruitmentRequisition | null;
  canEdit: boolean;
  currentUserName: string;
  currentUserCode?: string;
  employees?: Employee[];
  onManageEmployees?: () => void;
}

const DEFAULT_ASSISTANTS = [
  { code: '01-02-0440', name: 'Syeda Shaila Ashraf', designation: 'Head of HR' },
  { code: '22-02-1826', name: 'Shahriyar Naiem', designation: 'Manager, HR & OD' },
  { code: '22-02-1330', name: 'Quazi Nuzhat Rahman', designation: 'Senior Executive, HR' },
  { code: '22-02-1642', name: 'Sabbir Hossain', designation: 'Executive, HR' },
  { code: '02-02-2059', name: 'Fariha Nasmi', designation: 'Assistant Executive, HR' },
  { code: '22-02-1551', name: 'Maisha Islam', designation: 'Assistant Executive, HR' },
];

const COMPANIES = ['RAL', 'SGL', 'PSL', 'MTSL', 'RDL', 'RBL'];

export const RecruitmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  requisition,
  canEdit,
  currentUserName,
  currentUserCode,
  employees,
  onManageEmployees,
}) => {
  const isEditing = !!requisition;

  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [requisitionDate, setRequisitionDate] = useState('');
  const [requisitionSubmittedBy, setRequisitionSubmittedBy] = useState('');
  const [hod, setHod] = useState('');
  const [company, setCompany] = useState('RAL');
  const [vacancy, setVacancy] = useState(1);
  const [recruitmentType, setRecruitmentType] = useState<RecruitmentType>('New Recruitment');
  const [replacementOfWhom, setReplacementOfWhom] = useState('');
  const [replacementEmployeeSalary, setReplacementEmployeeSalary] = useState('');
  const [offerLetterDate, setOfferLetterDate] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>('Ongoing');
  const [remarks, setRemarks] = useState('');
  const [assistedByCode, setAssistedByCode] = useState('22-02-1330');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic recruiter list based on active employees (excluding resigned)
  const activeAssistants = React.useMemo(() => {
    if (employees && employees.length > 0) {
      const active = employees.filter((e) => e.status !== 'resigned' && e.status !== 'inactive');
      const mapped = active.map((e) => ({
        code: e.employeeCode,
        name: e.name,
        designation: e.designation,
      }));
      if (!mapped.some((m) => m.code === '01-02-0440')) {
        mapped.unshift({ code: '01-02-0440', name: 'Syeda Shaila Ashraf', designation: 'Head of HR' });
      }
      return mapped;
    }
    return DEFAULT_ASSISTANTS;
  }, [employees]);

  // Initialize or reset form
  useEffect(() => {
    if (requisition) {
      setPositionTitle(requisition.positionTitle || '');
      setDepartment(requisition.department || '');
      setRequisitionDate(requisition.requisitionDate || '');
      setRequisitionSubmittedBy(requisition.requisitionSubmittedBy || '');
      setHod(requisition.hod || '');
      setCompany(requisition.company || 'RAL');
      setVacancy(requisition.vacancy || 1);
      setRecruitmentType(requisition.recruitmentType || 'New Recruitment');
      setReplacementOfWhom(requisition.replacementOfWhom || '');
      setReplacementEmployeeSalary(requisition.replacementEmployeeSalary || '');
      setOfferLetterDate(requisition.offerLetterDate || '');
      setDateOfJoining(requisition.dateOfJoining || '');
      setRecruitmentStatus(requisition.recruitmentStatus || 'Ongoing');
      setRemarks(requisition.remarks || '');
      setAssistedByCode(requisition.recruitmentAssistedByCode || '22-02-1330');
    } else {
      // New form defaults
      setPositionTitle('');
      setDepartment('');
      setRequisitionDate(new Date().toISOString().split('T')[0]);
      setRequisitionSubmittedBy('');
      setHod('');
      setCompany('RAL');
      setVacancy(1);
      setRecruitmentType('New Recruitment');
      setReplacementOfWhom('');
      setReplacementEmployeeSalary('');
      setOfferLetterDate('');
      setDateOfJoining('');
      setRecruitmentStatus('Ongoing');
      setRemarks('');

      // Default assisted by to the logged in user if they are an active recruiter
      const isOneOfActive = activeAssistants.find((a) => a.code === currentUserCode);
      setAssistedByCode(isOneOfActive ? isOneOfActive.code : activeAssistants[0]?.code || '22-02-1330');
    }
    setError(null);
  }, [requisition, isOpen, currentUserCode, activeAssistants]);

  if (!isOpen) return null;

  // Live auto-calculated time to fill calculation
  let calculatedTTF: number | null = null;
  if (recruitmentStatus === 'Joined' && requisitionDate && dateOfJoining) {
    const s = new Date(requisitionDate);
    const e = new Date(dateOfJoining);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      calculatedTTF = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  // Current pending age for Ongoing
  let currentPendingAge: number | null = null;
  if ((recruitmentStatus === 'Ongoing' || recruitmentStatus === 'Held Up') && requisitionDate) {
    const s = new Date(requisitionDate);
    const today = new Date();
    if (!isNaN(s.getTime())) {
      currentPendingAge = Math.max(0, Math.round((today.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('Dashboard Viewing Access Only: You do not have permission to modify recruitment records.');
      return;
    }

    if (!positionTitle.trim() || !department.trim() || !requisitionDate) {
      setError('Position Title, Department, and Requisition Date are required fields.');
      return;
    }

    if (recruitmentStatus === 'Joined' && !dateOfJoining) {
      setError("Please specify the Date of Joining (DOJ) when marking a recruitment as 'Joined'.");
      return;
    }

    const selectedAssistant =
      activeAssistants.find((a) => a.code === assistedByCode) || DEFAULT_ASSISTANTS[0];

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: requisition?.id,
        sl: requisition?.sl,
        requisitionCode: requisition?.requisitionCode,
        positionTitle: positionTitle.trim(),
        department: department.trim(),
        requisitionDate,
        requisitionSubmittedBy: requisitionSubmittedBy.trim() || 'HR Requisitioner',
        hod: hod.trim() || 'Department Head',
        company,
        vacancy: Number(vacancy) || 1,
        recruitmentType,
        replacementOfWhom: recruitmentType === 'Replacement' ? replacementOfWhom.trim() || null : null,
        replacementEmployeeSalary:
          recruitmentType === 'Replacement' ? replacementEmployeeSalary.trim() || null : null,
        offerLetterDate: offerLetterDate || null,
        dateOfJoining: dateOfJoining || null,
        recruitmentStatus,
        remarks: remarks.trim() || null,
        recruitmentAssistedByCode: assistedByCode,
        recruitmentAssistedByName: selectedAssistant ? selectedAssistant.name : 'Syeda Shaila Ashraf',
        version: requisition?.version,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save recruitment record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? `Edit Requisition ${requisition?.requisitionCode}` : 'Add New Recruitment Requisition'}
              </h2>
              <p className="text-xs text-slate-400">
                Manpower Requisition Form (MRF) Checklist &amp; Turnaround Record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewing Access Notice if user is view-only */}
        {!canEdit && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center space-x-2 px-6 font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              Dashboard Viewing Access Only: Head of HR and HR Manager have executive oversight access. Modifications are managed by the 4 HR Executives.
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 text-xs flex items-center space-x-2 px-6 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Row 1: Position Title & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Position Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g. Senior Merchandiser (Woven)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Enter department name (e.g. Merchandising, Production, QA)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Company, Vacancy & Recruitment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={!canEdit}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Vacancy Count
              </label>
              <input
                type="number"
                min={1}
                max={50}
                disabled={!canEdit}
                value={vacancy}
                onChange={(e) => setVacancy(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Recruitment Type
              </label>
              <select
                disabled={!canEdit}
                value={recruitmentType}
                onChange={(e) => setRecruitmentType(e.target.value as RecruitmentType)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="New Recruitment">New Recruitment</option>
                <option value="Replacement">Replacement</option>
              </select>
            </div>
          </div>

          {/* Replacement Fields (Conditional) */}
          {recruitmentType === 'Replacement' && (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Replacement of Whom
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={replacementOfWhom}
                  onChange={(e) => setReplacementOfWhom(e.target.value)}
                  placeholder="e.g. Kawsar Mahmud (Resigned)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Replacement Employee Salary
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={replacementEmployeeSalary}
                  onChange={(e) => setReplacementEmployeeSalary(e.target.value)}
                  placeholder="e.g. 65,000 BDT"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Row 3: Requisition Submitted By & HOD (Required) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Requisition Submitted By <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={requisitionSubmittedBy}
                onChange={(e) => setRequisitionSubmittedBy(e.target.value)}
                placeholder="e.g. Tariqul Islam (GM, Merchandising)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Head of Department (HOD) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={hod}
                onChange={(e) => setHod(e.target.value)}
                placeholder="e.g. Tariqul Islam (GM)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Dates & Recruitment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Requisition Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                disabled={!canEdit}
                value={requisitionDate}
                onChange={(e) => setRequisitionDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Offer Letter Date
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={offerLetterDate}
                onChange={(e) => setOfferLetterDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Date of Joining (DOJ)
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Status & Assisted By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Recruitment Status <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={!canEdit}
                value={recruitmentStatus}
                onChange={(e) => setRecruitmentStatus(e.target.value as RecruitmentStatus)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Joined">Joined</option>
                <option value="Held Up">Held Up</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Did not Join">Did not Join</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Recruitment Assisted By <span className="text-rose-500">*</span>
                </label>
                {onManageEmployees && (
                  <button
                    type="button"
                    onClick={onManageEmployees}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-semibold"
                    title="Manage Recruiters or Add New HR Employee"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Manage Team</span>
                  </button>
                )}
              </div>
              <select
                disabled={!canEdit}
                value={assistedByCode}
                onChange={(e) => setAssistedByCode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {activeAssistants.map((emp) => (
                  <option key={emp.code} value={emp.code}>
                    {emp.name} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time to Fill & Pending Calculation Live Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Turnaround Time (Auto-calculated):
              </span>
            </div>

            {recruitmentStatus === 'Joined' ? (
              calculatedTTF !== null ? (
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold font-mono text-xs">
                    Time to Fill: {calculatedTTF} Days
                  </span>
                  <span className="text-[11px] text-slate-400">({dateOfJoining} - {requisitionDate})</span>
                </div>
              ) : (
                <span className="text-amber-600 font-medium">Select DOJ to calculate days</span>
              )
            ) : (
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold font-mono text-xs">
                  Pending Age: {currentPendingAge ?? 0} Days
                </span>
                <span className="text-[11px] text-slate-400">(Ongoing pipeline)</span>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Remarks &amp; Recruitment Progress Notes
            </label>
            <textarea
              rows={3}
              disabled={!canEdit}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Candidate pipeline, interview status, technical test scores or hold reasons..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {isEditing ? (
              <span>Last modified by: {requisition?.lastUpdatedByName || 'System'}</span>
            ) : (
              <span>Created by: {currentUserName}</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Save Changes' : 'Create Requisition'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
