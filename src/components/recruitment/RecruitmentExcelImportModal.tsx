// src/components/recruitment/RecruitmentExcelImportModal.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import { RecruitmentRequisition, RecruitmentType } from '../../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (records: Partial<RecruitmentRequisition>[]) => Promise<void>;
  canEdit: boolean;
}

export const RecruitmentExcelImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImport,
  canEdit,
}) => {
  const [parsedRows, setParsedRows] = useState<Partial<RecruitmentRequisition>[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  if (!isOpen) return null;

  // Safe Excel date formatting helper (handles Date objects, Excel serial numbers, and strings)
  const formatDateVal = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(val).trim();
    // Excel serial date number (e.g. 45678)
    if (/^\d{5}$/.test(s)) {
      const num = parseInt(s, 10);
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return s;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        // Use first worksheet or sheet containing 'MRF'
        const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('mrf')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          setError('The selected Excel sheet appears to be empty.');
          return;
        }

        // Map columns
        const mapped = rawJson.map((row, idx) => {
          // Normalize column lookups with multiple fallback variations
          const getVal = (...keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(
                (rk) => rk.trim().toLowerCase() === k.trim().toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== '') return row[matchedKey];
            }
            return '';
          };

          const sl = parseInt(getVal('SL', 'Serial', 'No', 'SL No', 'Serial No'), 10) || idx + 1;
          const pos = String(getVal('Position Title', 'Position', 'Designation', 'Job Title')).trim() || 'Position';
          const dept = String(getVal('Department', 'Dept')).trim() || 'Operations';
          const reqDate = formatDateVal(getVal('Requisition Date', 'Req Date', 'Date', 'Date of Requisition'));
          const reqBy = String(getVal('Requisition Submitted By', 'Submitted By', 'Requisitioner')).trim() || 'HOD';
          const hod = String(getVal('HOD', 'Head of Department', 'Dept Head')).trim() || 'Department Head';
          const comp = String(getVal('Company', 'Unit', 'Factory')).trim() || 'RAL';
          const vac = parseInt(String(getVal('Vacancy', 'No of Vacancy', 'Vacancies', 'Quantity')), 10) || 1;
          const recType: RecruitmentType =
            String(getVal('Recruitment Type', 'Type')).toLowerCase().includes('replace')
              ? 'Replacement'
              : 'New Recruitment';
          const repWhom = String(getVal('Replacement of Whom', 'Replaced Employee', 'Replacement Of')).trim();
          const repSalary = String(getVal('Replacement Employee Salary', 'Salary', 'Previous Salary')).trim();
          const offerDate = formatDateVal(getVal('Offer Letter Date', 'Offer Date', 'Offer Date Issued'));
          const doj = formatDateVal(getVal('Date of Joining (DOJ)', 'Date of Joining', 'DOJ', 'Joining Date'));
          const rawStatus = String(getVal('Recruitment Status', 'Status')).trim().toLowerCase();

          let status: any = 'Ongoing';
          if (rawStatus.includes('join')) status = 'Joined';
          else if (rawStatus.includes('held') || rawStatus.includes('hold')) status = 'Held Up';
          else if (rawStatus.includes('cancel')) status = 'Cancelled';
          else if (rawStatus.includes('did not')) status = 'Did not Join';

          const remarks = String(getVal('Remarks', 'Comments', 'Notes', 'Remark')).trim();
          const assistedBy = String(getVal('Recruitment Assisted By', 'Assisted By', 'Recruiter', 'HR Person')).trim() || 'Quazi Nuzhat Rahman';

          return {
            sl,
            requisitionCode: `MRF-2026-${String(sl).padStart(3, '0')}`,
            positionTitle: pos,
            department: dept,
            requisitionDate: reqDate || '2026-01-01',
            requisitionSubmittedBy: reqBy,
            hod,
            company: comp.toUpperCase(),
            vacancy: vac,
            recruitmentType: recType,
            replacementOfWhom: repWhom || null,
            replacementEmployeeSalary: repSalary || null,
            offerLetterDate: offerDate || null,
            dateOfJoining: doj || null,
            recruitmentStatus: status,
            remarks: remarks || null,
            recruitmentAssistedByName: assistedBy,
          };
        });

        setParsedRows(mapped);
      } catch (err: any) {
        setError(`Failed to parse Excel file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'SL': 1,
        'Position Title': 'Senior Executive, Merchandising',
        'Department': 'Merchandising',
        'Requisition Date': '2026-03-01',
        'Requisition Submitted By': 'GM Merchandising',
        'HOD': 'GM Merchandising',
        'Company': 'RAL',
        'Vacancy': 1,
        'Recruitment Type': 'Replacement',
        'Replacement of Whom': 'Md. Rahim',
        'Replacement Employee Salary': '45000',
        'Offer Letter Date': '2026-03-20',
        'Date of Joining (DOJ)': '2026-04-01',
        'Recruitment Status': 'Joined',
        'Remarks': 'Candidate joined and inducted',
        'Recruitment Assisted By': 'Shahriyar Naiem',
      },
      {
        'SL': 2,
        'Position Title': 'Executive, Human Resources',
        'Department': 'HR',
        'Requisition Date': '2026-03-05',
        'Requisition Submitted By': 'Head of HR',
        'HOD': 'Head of HR',
        'Company': 'SGL',
        'Vacancy': 1,
        'Recruitment Type': 'New Recruitment',
        'Replacement of Whom': '',
        'Replacement Employee Salary': '',
        'Offer Letter Date': '',
        'Date of Joining (DOJ)': '',
        'Recruitment Status': 'Ongoing',
        'Remarks': 'Candidate interviews in progress',
        'Recruitment Assisted By': 'Sabbir Hossain',
      },
      {
        'SL': 3,
        'Position Title': 'Officer, Quality Assurance',
        'Department': 'Quality',
        'Requisition Date': '2026-03-10',
        'Requisition Submitted By': 'DGM QA',
        'HOD': 'DGM QA',
        'Company': 'PSL',
        'Vacancy': 2,
        'Recruitment Type': 'New Recruitment',
        'Replacement of Whom': '',
        'Replacement Employee Salary': '',
        'Offer Letter Date': '',
        'Date of Joining (DOJ)': '',
        'Recruitment Status': 'Ongoing',
        'Remarks': 'Sourcing profiles from portal',
        'Recruitment Assisted By': 'Quazi Nuzhat Rahman',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MRF');
    XLSX.writeFile(wb, 'Recruitment_Requisition_Template.xlsx');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      await onImport(parsedRows);
      setSuccessMsg(`Successfully imported ${parsedRows.length} recruitment requisitions!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Recruitment Excel</h2>
              <p className="text-xs text-slate-400">
                Central MRF Worksheet Auto-Sync with Automatic Calculation &amp; Conflict Checking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs flex items-center space-x-2 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-xs flex items-center space-x-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Row: Template Download & Toggle Guide */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-200 font-medium text-[11px]">
                Have an Excel file ready or download our standard template:
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs transition"
                title="Download pre-formatted .xlsx file with all required headers"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <span>Column Guide</span>
                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Column Guide */}
          {showGuide && (
            <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl border border-indigo-100 dark:border-slate-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 text-xs">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Excel File Column Requirements (যে যে কলাম থাকতে হবে)</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">Header row should be in Row 1</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                {/* Mandatory Columns */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>আবশ্যকীয় কলামসমূহ (Mandatory)</span>
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li><strong className="text-slate-800 dark:text-slate-100">Position Title:</strong> পদের নাম (যেমন: Executive, HR)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Department:</strong> বিভাগের নাম (যেমন: HR &amp; OD, Merchandising)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Requisition Date:</strong> রিকুইজিশন তারিখ (YYYY-MM-DD)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Company:</strong> কোম্পানির নাম (RAL, SGL, PSL, MTSL, RDL, RBL)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Requisition Submitted By:</strong> রিকুইজিশন প্রেরক (আবশ্যক)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Head of Department (HOD):</strong> বিভাগীয় প্রধান (আবশ্যক)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Recruitment Assisted By:</strong> সহায়তাকারী HR-এর নাম</li>
                  </ul>
                </div>

                {/* Status & Outcome Columns */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>স্ট্যাটাস ও ট্র্যাকিং কলাম (Tracking &amp; Status)</span>
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li><strong className="text-slate-800 dark:text-slate-100">Recruitment Status:</strong> Ongoing, Joined, Held Up, Did not Join</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Date of Joining (DOJ):</strong> যোগদানের তারিখ (Joined হলে আবশ্যক)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Offer Letter Date:</strong> অফার লেটার প্রদানের তারিখ</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Vacancy:</strong> শূন্যপদের সংখ্যা (ডিফল্ট: 1)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Remarks:</strong> যে কোনো মন্তব্য বা অগ্রগতি বিবরণ</li>
                  </ul>
                </div>

                {/* Replacement Columns */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>প্রতিস্থাপন তথ্য (Replacement Data)</span>
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li><strong className="text-slate-800 dark:text-slate-100">Recruitment Type:</strong> New Recruitment বা Replacement</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Replacement of Whom:</strong> কার পরিবর্তে নিয়োগ হচ্ছে</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Replacement Employee Salary:</strong> পূর্ববর্তী কর্মীর বেতন</li>
                  </ul>
                </div>

                {/* Additional Columns */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>অন্যান্য কলাম (Other Details)</span>
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    <li><strong className="text-slate-800 dark:text-slate-100">SL:</strong> ক্রমিক নম্বর (না থাকলে স্বয়ংক্রিয়ভাবে ক্রমিক নির্ধারণ হবে)</li>
                    <li><strong className="text-slate-800 dark:text-slate-100">Remarks:</strong> বিশেষ নোট, ইন্টারভিউ বা অনুমোদনের মন্তব্য</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-800/40 transition-colors relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {fileName ? fileName : 'Click to select or drag & drop your Excel file (.xlsx, .xls)'}
              </div>
              <div className="text-[11px] text-slate-400">
                Supports Microsoft Excel (.xlsx, .xls) and CSV files
              </div>
            </div>
          </div>

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  Ready to Sync: <span className="font-mono font-bold text-indigo-600">{parsedRows.length}</span> Records Parsed
                </span>
                <span className="text-slate-400 text-[11px]">Previewing first 4 rows</span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-[11px] max-h-48">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="p-2">SL</th>
                      <th className="p-2">Position</th>
                      <th className="p-2">Dept</th>
                      <th className="p-2">Company</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Assisted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.slice(0, 4).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-mono">{r.sl}</td>
                        <td className="p-2 font-medium truncate max-w-[160px]">{r.positionTitle}</td>
                        <td className="p-2">{r.department}</td>
                        <td className="p-2 font-mono font-bold text-indigo-600">{r.company}</td>
                        <td className="p-2 font-semibold text-emerald-600">{r.recruitmentStatus}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-300">{r.recruitmentAssistedByName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || importing || !canEdit}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md disabled:opacity-50 transition-all"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Syncing Database...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Import {parsedRows.length} Records</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
