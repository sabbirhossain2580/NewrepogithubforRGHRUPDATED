// src/components/recruitment/RecruitmentChecklistView.tsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  FileText,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  User,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';
import {
  RecruitmentRequisition,
  RecruitmentStatus,
  RecruitmentType,
  Employee,
} from '../../types/index.ts';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';
import { RecruitmentModal } from './RecruitmentModal.tsx';
import { RecruitmentExcelImportModal } from './RecruitmentExcelImportModal.tsx';

interface Props {
  requisitions: RecruitmentRequisition[];
  loading: boolean;
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
  onSaveRequisition: (data: Partial<RecruitmentRequisition>) => Promise<any>;
  onDeleteRequisition: (id: number) => Promise<void>;
  onImportExcel: (records: Partial<RecruitmentRequisition>[]) => Promise<void>;
  canEdit: boolean;
  currentUserName: string;
  currentUserCode?: string;
  userRole?: string;
  onNavigateToDashboardJoined?: (reqId?: number) => void;
  employees?: Employee[];
  onNavigateToEmployees?: () => void;
}

type SortField =
  | 'sl'
  | 'positionTitle'
  | 'department'
  | 'requisitionDate'
  | 'company'
  | 'dateOfJoining'
  | 'recruitmentStatus'
  | 'timeToFillDays';

export const RecruitmentChecklistView: React.FC<Props> = ({
  requisitions,
  loading,
  syncStatus,
  lastUpdated,
  onRefresh,
  onSaveRequisition,
  onDeleteRequisition,
  onImportExcel,
  canEdit,
  currentUserName,
  currentUserCode,
  userRole,
  onNavigateToDashboardJoined,
  employees,
  onNavigateToEmployees,
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAssistedBy, setSelectedAssistedBy] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('sl');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<RecruitmentRequisition | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<RecruitmentRequisition | null>(null);

  // Visual confirmation banner when record is updated to Joined
  const [joinedBanner, setJoinedBanner] = useState<{
    reqCode: string;
    positionTitle: string;
    id?: number;
  } | null>(null);

  const handleSaveRequisitionWithCheck = async (data: Partial<RecruitmentRequisition>) => {
    const result = await onSaveRequisition(data);
    if (data.recruitmentStatus === 'Joined') {
      setJoinedBanner({
        reqCode: data.requisitionCode || 'Record',
        positionTitle: data.positionTitle || 'Position',
        id: data.id || result?.id,
      });
    }
  };

  const statusCounts = useMemo(() => {
    return {
      total: requisitions.length,
      joined: requisitions.filter((r) => r.recruitmentStatus === 'Joined').length,
      ongoing: requisitions.filter((r) => r.recruitmentStatus === 'Ongoing').length,
      heldUp: requisitions.filter((r) => r.recruitmentStatus === 'Held Up').length,
      didNotJoin: requisitions.filter((r) => r.recruitmentStatus === 'Did not Join').length,
    };
  }, [requisitions]);

  // Status Styling Helper
  const getStatusBadge = (status: RecruitmentStatus) => {
    switch (status) {
      case 'Joined':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Ongoing':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Held Up':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Did not Join':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Cancelled':
      default:
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
  };

  // Filter & Search Logic
  const filteredRecords = useMemo(() => {
    return requisitions.filter((r) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        r.positionTitle.toLowerCase().includes(search) ||
        r.department.toLowerCase().includes(search) ||
        r.requisitionCode.toLowerCase().includes(search) ||
        r.company.toLowerCase().includes(search) ||
        r.recruitmentAssistedByName.toLowerCase().includes(search) ||
        r.requisitionSubmittedBy.toLowerCase().includes(search) ||
        (r.remarks && r.remarks.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      // Company
      if (selectedCompany !== 'all' && r.company !== selectedCompany) return false;

      // Status
      if (selectedStatus !== 'all' && r.recruitmentStatus !== selectedStatus) return false;

      // Assisted By
      if (selectedAssistedBy !== 'all' && !r.recruitmentAssistedByName.includes(selectedAssistedBy))
        return false;

      // Type
      if (selectedType !== 'all' && r.recruitmentType !== selectedType) return false;

      return true;
    });
  }, [requisitions, searchTerm, selectedCompany, selectedStatus, selectedAssistedBy, selectedType]);

  // Sort Logic
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortAsc]);

  // Pagination Logic
  const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedRecords.length / pageSize);
  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return sortedRecords;
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = sortedRecords.map((r) => ({
      SL: r.sl,
      'Requisition Code': r.requisitionCode,
      'Position Title': r.positionTitle,
      Department: r.department,
      'Requisition Date': r.requisitionDate,
      'Submitted By': r.requisitionSubmittedBy,
      HOD: r.hod,
      Company: r.company,
      Vacancy: r.vacancy,
      'Recruitment Type': r.recruitmentType,
      'Replacement Of': r.replacementOfWhom || '',
      'Replacement Salary': r.replacementEmployeeSalary || '',
      'Offer Letter Date': r.offerLetterDate || '',
      'Date of Joining (DOJ)': r.dateOfJoining || '',
      'Recruitment Status': r.recruitmentStatus,
      'Time to Fill (Days)': r.timeToFillDays ?? '',
      'Pending Age (Days)': r.pendingDays ?? '',
      Remarks: r.remarks || '',
      'Recruitment Assisted By': r.recruitmentAssistedByName,
      'Last Modified By': r.lastUpdatedByName || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MRF Recruitment');
    XLSX.writeFile(wb, `RG_HR_Recruitment_Checklist_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('RENAISSANCE GROUP — HR & OD DEPARTMENT', 14, 15);
    doc.setFontSize(10);
    doc.text('RG HR — Recruitment Status & Turnaround Time Checklist', 14, 22);
    doc.setFontSize(8);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()} • Filtered Count: ${sortedRecords.length} Requisitions`,
      14,
      27
    );

    const tableData = sortedRecords.map((r) => [
      r.sl,
      r.positionTitle,
      r.department,
      r.company,
      r.requisitionDate,
      r.dateOfJoining || '-',
      r.recruitmentStatus,
      r.timeToFillDays ? `${r.timeToFillDays}d` : (r.pendingDays ? `${r.pendingDays}d pend` : '-'),
      r.recruitmentAssistedByName.split(' ')[0],
    ]);

    autoTable(doc, {
      head: [['SL', 'Position Title', 'Dept', 'Co.', 'Req Date', 'DOJ', 'Status', 'TTF/Age', 'Assisted By']],
      body: tableData,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`RG_HR_Recruitment_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Real-time Indicator Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              MRF Register
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Live Database Pool: {requisitions.length} Requisitions
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            RG HR – Recruitment Status &amp; Checklist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Centralized recruitment master table for the four HR Executives • Simultaneous update access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <RecruitmentRealtimeIndicator
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={onRefresh}
          />

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedRequisition(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Requisition</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Import Recruitment Excel</span>
            </button>

            {onNavigateToEmployees && (
              <button
                onClick={onNavigateToEmployees}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Manage HR recruiters and active/resigned team members"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden md:inline">HR Team &amp; Recruiters</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-emerald-600 text-xs font-semibold shadow-sm transition-all"
              title="Export to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportPDF}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-rose-600 text-xs font-semibold shadow-sm transition-all"
              title="Export to PDF (.pdf)"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Confirmation Banner: Automatically Moved to Joined View */}
      {joinedBanner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-400 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-white">
                  Visual Confirmation: Status Moved to 'Joined' Category!
                </span>
                <span className="bg-yellow-400 text-slate-900 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase">
                  Updated
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                <strong className="font-mono text-white underline">{joinedBanner.reqCode}</strong> ({joinedBanner.positionTitle}) has been updated to <strong>Joined</strong> and automatically transferred to the Joined category &amp; KPI metrics on the Dashboard.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center">
            {onNavigateToDashboardJoined && (
              <button
                onClick={() => {
                  onNavigateToDashboardJoined(joinedBanner.id);
                  setJoinedBanner(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-all shadow-md flex items-center space-x-1"
              >
                <span>View on Joined Dashboard</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </button>
            )}
            <button
              onClick={() => setJoinedBanner(null)}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Category View Interactive Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 text-xs scrollbar-thin">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold text-[10px] uppercase tracking-wider shrink-0 border border-slate-200/60 dark:border-slate-700/60">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>Category View:</span>
          </div>

          {/* All Requisitions */}
          <button
            onClick={() => {
              setSelectedStatus('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md shadow-slate-900/15 ring-2 ring-slate-900/20 dark:ring-slate-100/30 scale-[1.02]'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Requisitions</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {statusCounts.total}
            </span>
          </button>

          {/* Joined Category */}
          <button
            onClick={() => {
              setSelectedStatus('Joined');
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatus === 'Joined'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/40 scale-[1.02]'
                : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:border-emerald-300 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 dark:text-emerald-300" />
            <span>Joined Category</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatus === 'Joined'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100'
              }`}
            >
              {statusCounts.joined}
            </span>
          </button>

          {/* Ongoing Pipeline */}
          <button
            onClick={() => {
              setSelectedStatus('Ongoing');
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatus === 'Ongoing'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40 scale-[1.02]'
                : 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:border-blue-300 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-200 dark:text-blue-300" />
            <span>Ongoing Pipeline</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatus === 'Ongoing'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'bg-emerald-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-blue-100'
              }`}
            >
              {statusCounts.ongoing}
            </span>
          </button>

          {/* Held Up */}
          <button
            onClick={() => {
              setSelectedStatus('Held Up');
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 flex items-center space-x-2 cursor-pointer active:scale-95 ${
              selectedStatus === 'Held Up'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/40 scale-[1.02]'
                : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:border-amber-300 shadow-xs hover:-translate-y-0.5'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200 dark:text-amber-300" />
            <span>Held Up</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                selectedStatus === 'Held Up'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100'
              }`}
            >
              {statusCounts.heldUp}
            </span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by position, department, MRF code, requisitioner or comments..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Company Filter */}
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All Companies</option>
              <option value="RAL">RAL (Apparel)</option>
              <option value="SGL">SGL (Southern)</option>
              <option value="PSL">PSL (Pandora)</option>
              <option value="MTSL">MTSL (Millennium)</option>
              <option value="RDL">RDL (Denim)</option>
              <option value="RBL">RBL (Barind)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Joined">Joined (Completed)</option>
              <option value="Ongoing">Ongoing (Active)</option>
              <option value="Held Up">Held Up</option>
              <option value="Did not Join">Did not Join</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Assisted By Filter */}
            <select
              value={selectedAssistedBy}
              onChange={(e) => {
                setSelectedAssistedBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All HR Assistants</option>
              <option value="Shaila">Syeda Shaila Ashraf (Head of HR)</option>
              <option value="Shahriyar">Shahriyar Naiem</option>
              <option value="Nuzhat">Quazi Nuzhat</option>
              <option value="Sabbir">Sabbir Hossain</option>
              <option value="Fariha">Fariha Nasmi</option>
              <option value="Maisha">Maisha Islam</option>
              {employees &&
                employees
                  .filter(
                    (e) =>
                      !['01-02-0440', '22-02-1826', '22-02-1330', '22-02-1642', '02-02-2059', '22-02-1551'].includes(
                        e.employeeCode
                      ) && e.status !== 'resigned'
                  )
                  .map((e) => (
                    <option key={e.id} value={e.name.split(' ')[0]}>
                      {e.name}
                    </option>
                  ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="New Recruitment">New Recruitment</option>
              <option value="Replacement">Replacement</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Record Counts */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRecords.length}</span> of {requisitions.length} requisitions
          </div>
          {(selectedCompany !== 'all' || selectedStatus !== 'all' || selectedAssistedBy !== 'all' || selectedType !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCompany('all');
                setSelectedStatus('all');
                setSelectedAssistedBy('all');
                setSelectedType('all');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-rose-500 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main MRF Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-900 text-white font-bold tracking-wider text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort('sl')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors w-14"
                >
                  <div className="flex items-center space-x-1">
                    <span>SL</span>
                    {sortField === 'sl' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('positionTitle')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors min-w-[190px]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Position Title</span>
                    {sortField === 'positionTitle' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors min-w-[140px]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Department</span>
                    {sortField === 'department' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('company')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors w-20"
                >
                  <div className="flex items-center space-x-1">
                    <span>Company</span>
                    {sortField === 'company' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('requisitionDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors w-28"
                >
                  <div className="flex items-center space-x-1">
                    <span>Req Date</span>
                    {sortField === 'requisitionDate' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dateOfJoining')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors w-28"
                >
                  <div className="flex items-center space-x-1">
                    <span>DOJ</span>
                    {sortField === 'dateOfJoining' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recruitmentStatus')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors w-28"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortField === 'recruitmentStatus' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('timeToFillDays')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors w-28"
                >
                  <div className="flex items-center space-x-1">
                    <span>Time to Fill</span>
                    {sortField === 'timeToFillDays' && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[140px]">Assisted By</th>
                <th className="py-3 px-3 text-right w-24">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No recruitment records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* SL */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-500">
                        {r.sl}
                      </td>

                      {/* Position Title */}
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <span
                            className="cursor-pointer hover:text-indigo-600 hover:underline"
                            onClick={() => setViewingRecord(r)}
                          >
                            {r.positionTitle}
                          </span>
                          {r.vacancy > 1 && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                              ×{r.vacancy}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5 font-mono">
                          {r.requisitionCode} • {r.recruitmentType}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {r.department}
                      </td>

                      {/* Company */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {r.company}
                        </span>
                      </td>

                      {/* Requisition Date */}
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {r.requisitionDate}
                      </td>

                      {/* Date of Joining (DOJ) */}
                      <td className="py-3 px-3 font-mono font-semibold">
                        {r.dateOfJoining ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {r.dateOfJoining}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 italic">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${getStatusBadge(
                            r.recruitmentStatus
                          )}`}
                        >
                          {r.recruitmentStatus}
                        </span>
                      </td>

                      {/* Time to Fill (Days) / Pending Age */}
                      <td className="py-3 px-3">
                        {r.recruitmentStatus === 'Joined' ? (
                          r.timeToFillDays ? (
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px]">
                              {r.timeToFillDays} Days
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Completed</span>
                          )
                        ) : (
                          <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded text-[11px]">
                            {r.pendingDays ?? 0}d age
                          </span>
                        )}
                      </td>

                      {/* Assisted By */}
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">
                        {r.recruitmentAssistedByName}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setViewingRecord(r)}
                            title="View Full Requisition Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequisition(r);
                                  setIsModalOpen(true);
                                }}
                                title="Edit Requisition"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete requisition ${r.requisitionCode} (${r.positionTitle})?`
                                    )
                                  ) {
                                    await onDeleteRequisition(r.id);
                                  }
                                }}
                                title="Delete Requisition"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

        {/* Pagination & Page Size Control */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={-1}>All ({sortedRecords.length})</option>
            </select>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <RecruitmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequisition(null);
        }}
        onSave={handleSaveRequisitionWithCheck}
        requisition={selectedRequisition}
        canEdit={canEdit}
        currentUserName={currentUserName}
        currentUserCode={currentUserCode}
        employees={employees}
        onManageEmployees={onNavigateToEmployees}
      />

      {/* Excel Import Modal */}
      <RecruitmentExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportExcel}
        canEdit={canEdit}
      />

      {/* Detail View Drawer / Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] bg-blue-600 text-white font-mono px-2 py-0.5 rounded font-bold uppercase">
                  {viewingRecord.requisitionCode}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{viewingRecord.positionTitle}</h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Department:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{viewingRecord.department}</div>
                </div>
                <div>
                  <span className="text-slate-400">Company:</span>
                  <div className="font-mono font-bold text-indigo-600">{viewingRecord.company}</div>
                </div>
                <div>
                  <span className="text-slate-400">Requisition Date:</span>
                  <div className="font-mono">{viewingRecord.requisitionDate}</div>
                </div>
                <div>
                  <span className="text-slate-400">Date of Joining:</span>
                  <div className="font-mono font-bold text-emerald-600">{viewingRecord.dateOfJoining || 'Pending'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Recruitment Status:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{viewingRecord.recruitmentStatus}</div>
                </div>
                <div>
                  <span className="text-slate-400">Time to Fill:</span>
                  <div className="font-mono font-bold text-indigo-600">
                    {viewingRecord.timeToFillDays ? `${viewingRecord.timeToFillDays} Days` : `Pending (${viewingRecord.pendingDays ?? 0}d)`}
                  </div>
                </div>
              </div>

              {/* Requisition Origin & Ownership */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-semibold">Requisition Submitted By:</span>
                  <div className="text-slate-900 dark:text-white font-bold mt-0.5">{viewingRecord.requisitionSubmittedBy || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Head of Department (HOD):</span>
                  <div className="text-slate-900 dark:text-white font-bold mt-0.5">{viewingRecord.hod || 'N/A'}</div>
                </div>
              </div>

              {/* Replacement Details & Financial Cost Allocation */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-indigo-950/40 border border-amber-200/80 dark:border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <span>Replacement &amp; Financial Cost Summary</span>
                  </h4>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded font-bold uppercase border border-amber-300 dark:border-amber-700">
                    {viewingRecord.recruitmentType}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Replaced Employee:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {viewingRecord.replacementOfWhom || (viewingRecord.recruitmentType === 'Replacement' ? 'Vacant Position' : 'N/A (New Role)')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Salary Rate:</span>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {viewingRecord.replacementEmployeeSalary || 'Budgeted Grade Rate'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Approved Vacancies:</span>
                    <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">
                      {viewingRecord.vacancy || 1} Position{(viewingRecord.vacancy || 1) > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Overall Financial Impact Calculation */}
                {(() => {
                  const salaryStr = viewingRecord.replacementEmployeeSalary || '';
                  const numericSalary = parseFloat(salaryStr.replace(/[^0-9.]/g, '')) || 0;
                  const totalVacancies = viewingRecord.vacancy || 1;
                  const monthlyTotal = numericSalary * totalVacancies;
                  const annualTotal = monthlyTotal * 12;

                  if (numericSalary > 0) {
                    return (
                      <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-indigo-800/40 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Calculated Annual Financial Budget Impact:
                        </span>
                        <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          {annualTotal.toLocaleString()} BDT / yr ({monthlyTotal.toLocaleString()} BDT/mo)
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-indigo-800/40 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Financial Allocation:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        Standard Departmental Pay Scale Allocation
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <span className="text-slate-400 font-semibold">Recruitment Assisted By:</span>
                <div className="text-slate-900 dark:text-white font-bold mt-0.5">{viewingRecord.recruitmentAssistedByName}</div>
              </div>

              {viewingRecord.remarks && (
                <div>
                  <span className="text-slate-400 font-semibold">Remarks &amp; Notes:</span>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-1">
                    {viewingRecord.remarks}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
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
