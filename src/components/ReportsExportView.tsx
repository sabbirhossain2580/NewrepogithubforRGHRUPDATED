// src/components/ReportsExportView.tsx
import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Calendar,
  Filter,
  CheckCircle,
  Building,
  Printer,
  ShieldAlert,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Task,
  Employee,
  KPI,
  Responsibility,
  PerformanceRankItem,
} from '../types/index.ts';
import { googleSheetsApi, CreateSheetResult } from '../lib/googleSheets.ts';
import { getCachedAccessToken, signInWithGoogleWorkspace } from '../lib/firebase.ts';

interface ReportsExportViewProps {
  tasks: Task[];
  employees: Employee[];
  kpis: KPI[];
  responsibilities: Responsibility[];
  rankings: PerformanceRankItem[];
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  tasks,
  employees,
  kpis,
  responsibilities,
  rankings,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  // Google Sheets state
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [sheetsConfirmOpen, setSheetsConfirmOpen] = useState(false);
  const [sheetResult, setSheetResult] = useState<CreateSheetResult | null>(null);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [targetExportType, setTargetExportType] = useState<'master' | 'selected'>('master');

  const reportList = [
    {
      id: 1,
      title: '1. Employee-wise Task Report',
      description: 'Comprehensive roster of all assigned, active, and completed tasks per employee.',
    },
    {
      id: 2,
      title: '2. Monthly KPI Achievement Report',
      description: 'Quantitative target vs actual values, measurement method, and approved scores.',
    },
    {
      id: 3,
      title: '3. Overdue Task Report with Detailed Delay Reasons',
      description: 'Overdue duration (days), written delay explanations, and manager directives.',
    },
    {
      id: 4,
      title: '4. Pending Task Report',
      description: 'All tasks currently in execution or awaiting managerial approval.',
    },
    {
      id: 5,
      title: '5. Employee Responsibility Register',
      description: 'Permanent ongoing job duties, deliverables, frequencies, and measurement SLAs.',
    },
    {
      id: 6,
      title: '6. Monthly Performance Ranking Report',
      description: 'Overall scores, approved KPI percentages, task execution scores, and ranks.',
    },
    {
      id: 7,
      title: '7. Department Performance Summary',
      description: 'Executive overview of completion velocity, on-time rates, and KPI distribution.',
    },
    {
      id: 8,
      title: '8. Task Completion & On-Time Delivery Report',
      description: 'Audit of delivery on or before scheduled deadline dates across personnel.',
    },
    {
      id: 9,
      title: '9. KPI Submission & Approval Status Report',
      description: 'Governance tracking of pending submissions, manager reviews, and approvals.',
    },
    {
      id: 10,
      title: '10. Historical Task Changes & Accountability Audit',
      description: 'Modifications, deadline extensions, and chronological change actions.',
    },
  ];

  // Initiate Google Sheets export with user confirmation
  const initiateGoogleSheetsExport = (type: 'master' | 'selected') => {
    setTargetExportType(type);
    setSheetResult(null);
    setSheetsConfirmOpen(true);
  };

  // Perform Google Sheets creation
  const handleConfirmGoogleSheetsExport = async () => {
    setSheetsConfirmOpen(false);
    setSheetsExporting(true);
    setSheetsModalOpen(true);

    try {
      let token = getCachedAccessToken();
      if (!token) {
        // Trigger Google Workspace Auth popup
        const authRes = await signInWithGoogleWorkspace();
        token = authRes.accessToken;
      }

      let result: CreateSheetResult;

      if (targetExportType === 'master') {
        result = await googleSheetsApi.exportComprehensiveMasterSheet({
          tasks,
          employees,
          kpis,
          responsibilities,
          rankings,
        });
      } else {
        const curReport = reportList.find((r) => r.id === selectedReportId) || reportList[0];
        // Create single tab sheet
        const sheetTitle = curReport.title.slice(3);
        const rows = tasks.map((t) => [
          t.taskCode,
          t.title,
          t.employeeName,
          t.employeeDesignation,
          t.priority,
          t.startDate,
          t.originalDeadline,
          t.revisedDeadline || 'N/A',
          t.calculatedStatus,
          `${t.progressPercent}%`,
          t.delayReason || 'None',
          t.managerComments || 'Pending',
        ]);

        result = await googleSheetsApi.createSpreadsheet(
          `Renaissance Group — ${sheetTitle} (${new Date().toLocaleDateString('en-GB')})`,
          [
            {
              title: 'Report Data',
              headers: ['Code', 'Title', 'Assignee', 'Designation', 'Priority', 'Start Date', 'Deadline', 'Revised', 'Status', 'Progress', 'Delay Reason', 'Manager Comments'],
              rows,
            },
          ]
        );
      }

      setSheetResult(result);
    } catch (err: any) {
      alert(`Google Sheets export error: ${err.message}`);
      setSheetsModalOpen(false);
    } finally {
      setSheetsExporting(false);
    }
  };

  // Excel Export Handler
  const exportToExcel = (reportId: number) => {
    setIsExporting(true);
    try {
      let data: any[] = [];
      let filename = 'Renaissance_HR_Report';

      if (reportId === 1) {
        filename = 'Employee_Wise_Task_Report';
        data = tasks.map((t) => ({
          'Task Code': t.taskCode,
          'Task Title': t.title,
          Employee: t.employeeName,
          Designation: t.employeeDesignation,
          Priority: t.priority,
          'Start Date': t.startDate,
          'Original Deadline': t.originalDeadline,
          'Revised Deadline': t.revisedDeadline || 'N/A',
          Status: t.calculatedStatus,
          'Progress %': t.progressPercent,
          'Delay Reason': t.delayReason || 'None',
          'Manager Review': t.managerComments || 'Pending',
        }));
      } else if (reportId === 2) {
        filename = 'Monthly_KPI_Achievement_Report';
        data = kpis.map((k) => ({
          'KPI Code': k.kpiCode,
          Employee: k.employeeName,
          'KPI Title': k.title,
          Target: `${k.targetValue} ${k.unit}`,
          Actual: k.actualValue !== null && k.actualValue !== undefined ? `${k.actualValue} ${k.unit}` : 'Not Submitted',
          'Calculated %': k.calculatedAchievement || 'N/A',
          Weight: k.weight,
          'Approved Achievement %': k.approvedAchievementPercentage || 'Pending',
          'Submission Status': k.submissionStatus,
          'Review Status': k.managerReviewStatus,
        }));
      } else if (reportId === 3) {
        filename = 'Overdue_Tasks_Detailed_Report';
        data = tasks
          .filter((t) => t.isOverdue)
          .map((t) => ({
            'Task Code': t.taskCode,
            'Task Title': t.title,
            Employee: t.employeeName,
            Designation: t.employeeDesignation,
            'Original Deadline': t.originalDeadline,
            'Effective Deadline': t.effectiveDeadline,
            'Days Overdue': t.daysOverdue,
            'Delay Category': t.delayCategory || 'Uncategorized',
            'Delay Justification': t.delayReason || 'Pending written explanation',
            'Manager Comments': t.managerComments || 'Pending review',
          }));
      } else if (reportId === 4) {
        filename = 'Pending_Tasks_Report';
        data = tasks
          .filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
          .map((t) => ({
            'Task Code': t.taskCode,
            Title: t.title,
            Employee: t.employeeName,
            Deadline: t.effectiveDeadline,
            Progress: `${t.progressPercent}%`,
            Status: t.calculatedStatus,
          }));
      } else if (reportId === 5) {
        filename = 'Employee_Responsibility_Register';
        data = responsibilities.map((r) => ({
          'Resp Code': r.responsibilityCode,
          Employee: r.employeeName,
          Title: r.title,
          Description: r.description,
          Category: r.category,
          Frequency: r.frequency,
          Deliverable: r.expectedDeliverable,
          'SLA Criteria': r.measurementCriteria,
          'Linked KPI': r.relatedKpiTitle || 'N/A',
          Status: r.status,
        }));
      } else if (reportId === 6) {
        filename = 'Monthly_Performance_Rankings';
        data = rankings.map((r) => ({
          Rank: r.rank,
          Employee: r.name,
          Designation: r.designation,
          'Assigned Tasks': r.assignedTaskCount,
          'Completed Tasks': r.completedTaskCount,
          'On-Time %': `${r.onTimeCompletionRate}%`,
          'Overdue Tasks': r.overdueTaskCount,
          'Approved KPI Score': r.approvedKpiScore ? `${r.approvedKpiScore}%` : 'Pending',
          'Task Exec Score': `${r.taskExecutionScore}/100`,
          'Overall Score': r.overallScore || 'Pending Evaluation',
          Status: r.statusLabel,
        }));
      } else {
        filename = 'Department_Summary_Report';
        data = employees.map((e) => {
          const empTasks = tasks.filter((t) => t.assignedEmployeeId === e.id);
          const totalTasks = empTasks.length;
          const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
          const overdueTasks = empTasks.filter((t) => t.isOverdue).length;
          const onTimeRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return {
            'Employee Code': e.employeeCode,
            Name: e.name,
            Designation: e.designation,
            'Total Tasks': totalTasks,
            'Completed Tasks': completedTasks,
            'Overdue Tasks': overdueTasks,
            'On-Time Rate': `${onTimeRate}%`,
            'KPI Achievement': e.avgKpiAchievement ? `${e.avgKpiAchievement}%` : 'Pending',
          };
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Export Handler
  const exportToPdf = (reportId: number) => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const currentReport = reportList.find((r) => r.id === reportId) || reportList[0];

      // Corporate Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RENAISSANCE GROUP — HUMAN RESOURCES & OD', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Official Performance Document • Head of HR: Syeda Shaila Ashraf • Timezone: Asia/Dhaka`, 14, 18);

      // Report Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(currentReport.title, 14, 33);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} | Scope: Confidential Departmental Record`, 14, 39);

      let head: string[][] = [];
      let body: any[][] = [];

      if (reportId === 1) {
        head = [['Code', 'Title', 'Assignee', 'Priority', 'Original Deadline', 'Revised', 'Status', 'Progress', 'Delay Reason']];
        body = tasks.map((t) => [
          t.taskCode,
          t.title,
          t.employeeName || 'N/A',
          t.priority,
          t.originalDeadline,
          t.revisedDeadline || '—',
          t.calculatedStatus,
          `${t.progressPercent}%`,
          t.delayReason || 'None',
        ]);
      } else if (reportId === 2) {
        head = [['KPI Code', 'Employee', 'KPI Title', 'Target', 'Actual', 'Weight', 'Approved %', 'Submission Status']];
        body = kpis.map((k) => [
          k.kpiCode,
          k.employeeName || 'N/A',
          k.title,
          `${k.targetValue} ${k.unit}`,
          k.actualValue !== null && k.actualValue !== undefined ? `${k.actualValue} ${k.unit}` : 'Not Submitted',
          `${k.weight}x`,
          k.approvedAchievementPercentage !== null ? `${k.approvedAchievementPercentage}%` : 'Pending',
          k.submissionStatus,
        ]);
      } else if (reportId === 3) {
        head = [['Code', 'Task Title', 'Employee', 'Original Deadline', 'Days Overdue', 'Delay Category', 'Delay Explanation', 'Manager Comment']];
        body = tasks
          .filter((t) => t.isOverdue)
          .map((t) => [
            t.taskCode,
            t.title,
            t.employeeName || 'N/A',
            t.originalDeadline,
            `${t.daysOverdue} days`,
            t.delayCategory || 'General',
            t.delayReason || 'Pending explanation',
            t.managerComments || 'Pending review',
          ]);
      } else if (reportId === 5) {
        head = [['Resp Code', 'Employee', 'Duty Title', 'Category', 'Frequency', 'Deliverable', 'Measurement SLA']];
        body = responsibilities.map((r) => [
          r.responsibilityCode,
          r.employeeName || 'N/A',
          r.title,
          r.category,
          r.frequency,
          r.expectedDeliverable,
          r.measurementCriteria,
        ]);
      } else if (reportId === 6) {
        head = [['Rank', 'Employee', 'Designation', 'Tasks', 'On-Time', 'Overdue', 'Approved KPI', 'Task Exec', 'Overall Score', 'Status']];
        body = rankings.map((r) => [
          String(r.rank),
          r.name,
          r.designation,
          `${r.completedTaskCount}/${r.assignedTaskCount}`,
          `${r.onTimeCompletionRate}%`,
          String(r.overdueTaskCount),
          r.approvedKpiScore ? `${r.approvedKpiScore}%` : 'Pending',
          `${r.taskExecutionScore}/100`,
          r.overallScore ? String(r.overallScore) : 'Pending',
          r.statusLabel,
        ]);
      } else {
        head = [['Code', 'Name', 'Designation', 'Tasks Assigned', 'Tasks Completed', 'Overdue', 'On-Time Delivery', 'Avg KPI Score']];
        body = employees.map((e) => {
          const empTasks = tasks.filter((t) => t.assignedEmployeeId === e.id);
          const totalTasks = empTasks.length;
          const completedTasks = empTasks.filter((t) => t.status === 'Completed').length;
          const overdueTasks = empTasks.filter((t) => t.isOverdue).length;
          const onTimeRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return [
            e.employeeCode,
            e.name,
            e.designation,
            String(totalTasks),
            String(completedTasks),
            String(overdueTasks),
            `${onTimeRate}%`,
            e.avgKpiAchievement ? `${e.avgKpiAchievement}%` : 'Pending',
          ];
        });
      }

      autoTable(doc, {
        head: head,
        body: body,
        startY: 44,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(`Page ${data.pageNumber} of ${pageCount} • Renaissance Group HR & OD Internal Record`, 14, 204);
        },
      });

      doc.save(`${currentReport.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err: any) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reporting &amp; Corporate Export Center</h1>
              <p className="text-xs md:text-sm text-slate-500">
                10 Official HR reports with real Google Sheets, Excel (.xlsx), and PDF exports
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            Head of HR: Syeda Shaila Ashraf
          </span>
        </div>
      </div>

      {/* FEATURED: GOOGLE SHEETS LIVE EXPORT CARD */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded uppercase tracking-wider">
                Google Workspace Integration
              </span>
              <span className="text-xs text-emerald-300">Live Cloud Spreadsheet</span>
            </div>
            <h2 className="text-lg font-bold">Export Master HR Performance Workbook to Google Sheets</h2>
            <p className="text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
              Creates a multi-tab Google Spreadsheet directly in your Google Drive with 5 dedicated tabs: Task Register, Critical Overdue Focus, KPI Performance Scorecard, Monthly Rankings, and Responsibility Register.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => initiateGoogleSheetsExport('master')}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Master Google Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportList.map((rep) => {
          const isSelected = selectedReportId === rep.id;
          return (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={`p-4 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900">{rep.title}</h3>
                  {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rep.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReportId(rep.id);
                    initiateGoogleSheetsExport('selected');
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg transition"
                  title="Export this report to Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Sheets</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToExcel(rep.id);
                  }}
                  disabled={isExporting}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition"
                  title="Download Excel spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToPdf(rep.id);
                  }}
                  disabled={isExporting}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                  title="Download printable corporate PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* USER CONFIRMATION DIALOG (Mandatory for Workspace Mutating Operations) */}
      {sheetsConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-emerald-600 mb-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Create Google Spreadsheet?</h3>
                <p className="text-xs text-slate-500">Google Drive &amp; Sheets File Creation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              This action will create a new Google Spreadsheet file named <strong className="text-slate-900">"Renaissance Group — HR &amp; OD Master Performance Sheet"</strong> in your connected Google Drive account with live database records, KPIs, rankings, and task accountability data.
            </p>

            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <div>• <strong>Destination:</strong> Your Google Drive</div>
              <div>• <strong>Included Records:</strong> {tasks.length} Tasks, {kpis.length} KPIs, {rankings.length} Ranked Personnel</div>
              <div>• <strong>Permissions:</strong> Stored securely in your private Drive folder</div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setSheetsConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGoogleSheetsExport}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center space-x-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Confirm &amp; Create Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE SHEETS RESULT MODAL */}
      {sheetsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            {sheetsExporting ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <h4 className="text-sm font-bold text-slate-900">Creating Google Spreadsheet...</h4>
                <p className="text-xs text-slate-500">Writing multi-tab structured HR performance data to Google Sheets</p>
              </div>
            ) : sheetResult ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900">Google Sheet Created Successfully!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your HR Task &amp; KPI Performance Workbook is ready on your Google Drive.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Spreadsheet ID:</div>
                  <div className="font-mono text-[11px] truncate text-slate-500">{sheetResult.spreadsheetId}</div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={sheetResult.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-xs transition"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setSheetsModalOpen(false)}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
