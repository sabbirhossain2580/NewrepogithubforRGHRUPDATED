// src/components/recruitment/RecruitmentReportsView.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Building,
  Users,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { RecruitmentStats, RecruitmentRequisition } from '../../types/index.ts';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';

interface Props {
  requisitions: RecruitmentRequisition[];
  stats: RecruitmentStats | null;
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
}

type ReportType =
  | 'monthly'
  | 'department'
  | 'company'
  | 'employee'
  | 'timeToFill'
  | 'pending';

export const RecruitmentReportsView: React.FC<Props> = ({
  requisitions,
  stats,
  syncStatus,
  lastUpdated,
  onRefresh,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('monthly');

  if (!stats) return null;

  // Export Excel for chosen report
  const downloadExcel = (type: ReportType) => {
    const wb = XLSX.utils.book_new();

    switch (type) {
      case 'monthly': {
        const rows = stats.charts.monthlyTrends.map((m) => ({
          Month: m.month,
          'Total Requisitions Received': m.requisitions,
          'Joined Employees': m.joined,
          'Ongoing Pipelines': m.ongoing,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');
        break;
      }
      case 'department': {
        const rows = stats.charts.departmentBreakdown.map((d) => ({
          Department: d.department,
          'Total Requisitions': d.total,
          'Joined Employees': d.joined,
          'Ongoing Pipeline': d.ongoing,
          'Avg Turnaround (Days)': d.avgTimeToFill,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Department Summary');
        break;
      }
      case 'company': {
        const rows = stats.charts.companyBreakdown.map((c) => ({
          Company: c.company,
          'Total Requisitions': c.total,
          'Joined Employees': c.joined,
          'Ongoing Pipeline': c.ongoing,
          'Held Up': c.heldUp,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Company Summary');
        break;
      }
      case 'employee': {
        const rows = stats.charts.employeeContributions.map((e) => ({
          'Employee ID': e.employeeCode,
          Name: e.employeeName,
          Designation: e.designation,
          'Total Handled': e.totalAssigned,
          'Joined Count': e.joined,
          Ongoing: e.ongoing,
          'Held Up': e.heldUp,
          'Completion Rate (%)': `${e.completionRate}%`,
          'Avg Turnaround (Days)': e.avgTimeToFill,
          'Management Rating': e.rating,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'HR Performance');
        break;
      }
      case 'timeToFill': {
        const rows = stats.charts.monthlyTimeToFill.map((t) => ({
          Month: t.month,
          'Average Turnaround (Days)': t.avgDays,
          'Joined Candidates Sample': t.joinedCount,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Time to Fill');
        break;
      }
      case 'pending': {
        const pendingRows = requisitions
          .filter((r) => r.recruitmentStatus === 'Ongoing' || r.recruitmentStatus === 'Held Up')
          .map((r) => ({
            SL: r.sl,
            'MRF Code': r.requisitionCode,
            Position: r.positionTitle,
            Department: r.department,
            Company: r.company,
            'Requisition Date': r.requisitionDate,
            Status: r.recruitmentStatus,
            'Pending Days': r.pendingDays ?? 0,
            'Assisted By': r.recruitmentAssistedByName,
            Remarks: r.remarks || '',
          }));
        const ws = XLSX.utils.json_to_sheet(pendingRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Pending Requisitions');
        break;
      }
    }

    XLSX.writeFile(wb, `RG_HR_${type.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export PDF for chosen report
  const downloadPDF = (type: ReportType) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('RENAISSANCE GROUP — HR & OD DEPARTMENT', 14, 15);
    doc.setFontSize(10);
    doc.text(`Official Executive Report: ${type.toUpperCase()}`, 14, 22);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 27);

    let head: string[][] = [];
    let body: any[][] = [];

    switch (type) {
      case 'monthly':
        head = [['Month', 'Requisitions', 'Joined', 'Ongoing']];
        body = stats.charts.monthlyTrends.map((m) => [m.month, m.requisitions, m.joined, m.ongoing]);
        break;
      case 'department':
        head = [['Department', 'Total', 'Joined', 'Ongoing', 'Avg Days']];
        body = stats.charts.departmentBreakdown.map((d) => [d.department, d.total, d.joined, d.ongoing, `${d.avgTimeToFill}d`]);
        break;
      case 'company':
        head = [['Company', 'Total', 'Joined', 'Ongoing', 'Held Up']];
        body = stats.charts.companyBreakdown.map((c) => [c.company, c.total, c.joined, c.ongoing, c.heldUp]);
        break;
      case 'employee':
        head = [['Name', 'ID', 'Handled', 'Joined', 'Rate %', 'Avg Days', 'Rating']];
        body = stats.charts.employeeContributions.map((e) => [
          e.employeeName,
          e.employeeCode,
          e.totalAssigned,
          e.joined,
          `${e.completionRate}%`,
          `${e.avgTimeToFill}d`,
          `★ ${e.rating.toFixed(1)}`,
        ]);
        break;
      case 'timeToFill':
        head = [['Month', 'Average Time to Fill (Days)', 'Joined Sample Size']];
        body = stats.charts.monthlyTimeToFill.map((t) => [t.month, `${t.avgDays} Days`, t.joinedCount]);
        break;
      case 'pending':
        head = [['SL', 'Position', 'Dept', 'Co.', 'Req Date', 'Age', 'Assisted By']];
        body = requisitions
          .filter((r) => r.recruitmentStatus === 'Ongoing' || r.recruitmentStatus === 'Held Up')
          .map((r) => [r.sl, r.positionTitle, r.department, r.company, r.requisitionDate, `${r.pendingDays ?? 0}d`, r.recruitmentAssistedByName.split(' ')[0]]);
        break;
    }

    autoTable(doc, {
      head,
      body,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`RG_HR_${type.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const reportTabs = [
    { id: 'monthly' as const, label: 'Monthly Summary', icon: Calendar },
    { id: 'department' as const, label: 'Department-wise Report', icon: Briefcase },
    { id: 'company' as const, label: 'Company-wise Report', icon: Building },
    { id: 'employee' as const, label: 'HR Team Performance', icon: Users },
    { id: 'timeToFill' as const, label: 'Turnaround (TTF) Report', icon: Clock },
    { id: 'pending' as const, label: 'Pending Requisitions', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
              Management Intelligence
            </span>
            <span className="text-xs text-slate-400">Export &amp; Analytics Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Reports &amp; Data Export
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Download verified executive digests in Excel (.xlsx) and PDF (.pdf) formats
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

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap gap-2">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedReport(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Report Preview Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {reportTabs.find((t) => t.id === selectedReport)?.label} Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live calculated data ready for instant export
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => downloadExcel(selectedReport)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={() => downloadPDF(selectedReport)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Dynamic Table Preview */}
        <div className="overflow-x-auto text-xs">
          {selectedReport === 'monthly' && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3 text-center">Total Requisitions</th>
                  <th className="p-3 text-center text-emerald-600">Joined</th>
                  <th className="p-3 text-center text-blue-600">Ongoing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {stats.charts.monthlyTrends.map((m) => (
                  <tr key={m.month}>
                    <td className="p-3 font-sans font-semibold">{m.month}</td>
                    <td className="p-3 text-center">{m.requisitions}</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">{m.joined}</td>
                    <td className="p-3 text-center text-blue-600 font-bold">{m.ongoing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 'department' && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-center">Total Requisitions</th>
                  <th className="p-3 text-center text-emerald-600">Joined</th>
                  <th className="p-3 text-center text-blue-600">Ongoing</th>
                  <th className="p-3 text-center">Average Turnaround (Days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.charts.departmentBreakdown.map((d) => (
                  <tr key={d.department}>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{d.department}</td>
                    <td className="p-3 text-center font-mono font-bold">{d.total}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600">{d.joined}</td>
                    <td className="p-3 text-center font-mono font-bold text-blue-600">{d.ongoing}</td>
                    <td className="p-3 text-center font-mono">{d.avgTimeToFill}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 'company' && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Company Code</th>
                  <th className="p-3 text-center">Total Requisitions</th>
                  <th className="p-3 text-center text-emerald-600">Joined</th>
                  <th className="p-3 text-center text-blue-600">Ongoing</th>
                  <th className="p-3 text-center text-amber-600">Held Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {stats.charts.companyBreakdown.map((c) => (
                  <tr key={c.company}>
                    <td className="p-3 font-bold text-indigo-600">{c.company}</td>
                    <td className="p-3 text-center font-bold">{c.total}</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">{c.joined}</td>
                    <td className="p-3 text-center text-blue-600 font-bold">{c.ongoing}</td>
                    <td className="p-3 text-center text-amber-600 font-bold">{c.heldUp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 'employee' && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">ID</th>
                  <th className="p-3 text-center">Handled</th>
                  <th className="p-3 text-center text-emerald-600">Joined</th>
                  <th className="p-3 text-center">Completion %</th>
                  <th className="p-3 text-center">Avg TTF</th>
                  <th className="p-3 text-center">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.charts.employeeContributions.map((e) => (
                  <tr key={e.employeeCode}>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{e.employeeName}</td>
                    <td className="p-3 font-mono text-indigo-600 font-bold">{e.employeeCode}</td>
                    <td className="p-3 text-center font-mono">{e.totalAssigned}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600">{e.joined}</td>
                    <td className="p-3 text-center font-mono font-bold">{e.completionRate}%</td>
                    <td className="p-3 text-center font-mono">{e.avgTimeToFill}d</td>
                    <td className="p-3 text-center font-mono font-bold text-amber-600">★ {e.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 'timeToFill' && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Reporting Month</th>
                  <th className="p-3 text-center">Average Turnaround Time (Days)</th>
                  <th className="p-3 text-center">Joined Candidates Analyzed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {stats.charts.monthlyTimeToFill.map((t) => (
                  <tr key={t.month}>
                    <td className="p-3 font-sans font-semibold">{t.month}</td>
                    <td className="p-3 text-center font-bold text-indigo-600">{t.avgDays} Days</td>
                    <td className="p-3 text-center">{t.joinedCount} Candidates</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 'pending' && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">SL &amp; Code</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Pending Age</th>
                  <th className="p-3">Assisted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requisitions
                  .filter((r) => r.recruitmentStatus === 'Ongoing' || r.recruitmentStatus === 'Held Up')
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="p-3 font-mono text-slate-500">#{r.sl} • {r.requisitionCode}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{r.positionTitle}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{r.department}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">{r.company}</td>
                      <td className="p-3 font-semibold">{r.recruitmentStatus}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600">{r.pendingDays ?? 0}d</td>
                      <td className="p-3">{r.recruitmentAssistedByName.split(' ')[0]}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
