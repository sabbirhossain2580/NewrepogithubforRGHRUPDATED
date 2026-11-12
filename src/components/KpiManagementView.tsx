// src/components/KpiManagementView.tsx
import React, { useState } from 'react';
import {
  Target,
  PlusCircle,
  Search,
  CheckCircle,
  Clock,
  Award,
  AlertTriangle,
  TrendingUp,
  FileCheck,
  Send,
  ShieldCheck,
  Info,
  Trash2,
  X,
  HelpCircle,
} from 'lucide-react';
import { KPI, Employee, KpiMeasurementMethod } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface KpiManagementViewProps {
  kpis: KPI[];
  employees: Employee[];
  onRefresh: () => void;
  onCreateKpi: (data: any) => Promise<void>;
  onDeleteKpi: (id: number) => Promise<void>;
  onSubmitKpi: (id: number, data: { actualValue: number; evidenceNotes?: string }) => Promise<void>;
  onReviewKpi: (id: number, data: { status: 'Recommended' | 'Revision Requested'; comments?: string }) => Promise<void>;
  onApproveKpi: (id: number, data: { approvedPercentage: number; reviewStatus?: string }) => Promise<void>;
}

export const KpiManagementView: React.FC<KpiManagementViewProps> = ({
  kpis,
  employees,
  onRefresh,
  onCreateKpi,
  onDeleteKpi,
  onSubmitKpi,
  onReviewKpi,
  onApproveKpi,
}) => {
  const { activePersona } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [kpiToDelete, setKpiToDelete] = useState<KPI | null>(null);
  const [showGuideBanner, setShowGuideBanner] = useState(true);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [formData, setFormData] = useState<any>({
    measurementMethod: 'higher_is_better',
    unit: '%',
    weight: 1.0,
    reportingPeriod: 'October 2026',
  });

  const [actualVal, setActualVal] = useState<number | string>('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [approvedPct, setApprovedPct] = useState<number | string>('');
  const [reviewStatusChoice, setReviewStatusChoice] = useState<'Recommended' | 'Revision Requested'>('Recommended');
  const [actionLoading, setActionLoading] = useState(false);

  const canCreate = activePersona.role !== 'employee';
  const canReview = activePersona.role === 'hr_manager' || activePersona.role === 'head_of_hr' || activePersona.role === 'admin';
  const canApprove = activePersona.role === 'head_of_hr' || activePersona.role === 'admin';

  const filteredKpis = kpis.filter((k) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      k.title.toLowerCase().includes(q) ||
      k.kpiCode.toLowerCase().includes(q) ||
      (k.employeeName && k.employeeName.toLowerCase().includes(q));

    const matchEmployee = employeeFilter === 'all' || k.employeeId === parseInt(employeeFilter, 10);
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'Approved'
        ? k.approvedAchievementPercentage !== null
        : statusFilter === 'Pending'
        ? k.submissionStatus === 'Submitted' && k.approvedAchievementPercentage === null
        : k.submissionStatus === statusFilter;

    return matchSearch && matchEmployee && matchStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await onCreateKpi(formData);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpi) return;
    try {
      setActionLoading(true);
      await onSubmitKpi(selectedKpi.id, {
        actualValue: parseFloat(String(actualVal)),
        evidenceNotes,
      });
      setSubmitModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpi) return;
    try {
      setActionLoading(true);
      await onReviewKpi(selectedKpi.id, {
        status: reviewStatusChoice,
      });
      setReviewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpi) return;
    try {
      setActionLoading(true);
      await onApproveKpi(selectedKpi.id, {
        approvedPercentage: parseFloat(String(approvedPct)),
      });
      setApproveModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!kpiToDelete) return;
    try {
      setActionLoading(true);
      await onDeleteKpi(kpiToDelete.id);
      setDeleteModalOpen(false);
      setKpiToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete KPI');
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
            <div className="p-2 bg-purple-600 text-white rounded-lg shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly KPI Management &amp; Evaluation</h1>
              <p className="text-xs md:text-sm text-slate-500">
                Departmental targets, quantitative evaluations, approval workflow &amp; weighted performance scores
              </p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setFormData({
                employeeId: employees[1]?.id || '',
                measurementMethod: 'higher_is_better',
                unit: '%',
                weight: 1.0,
                reportingPeriod: 'October 2026',
              });
              setCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create KPI Target</span>
          </button>
        )}
      </div>

      {/* Quick Guide Banner for KPIs */}
      {showGuideBanner ? (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200 rounded-xl p-4 shadow-xs relative">
          <button
            onClick={() => setShowGuideBanner(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            title="Dismiss Guide"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 mt-0.5">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="space-y-3 flex-1 pr-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>KPI Management &amp; Deletion Guide • কেপিআই পরিচালনা ও মুছে ফেলার নিয়ম</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                    Executive HR &amp; OD
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Renaissance Group এইচআর সিস্টেমে কেপিআই মূল্যায়ন, অনুমোদন ও ডিলিট করার নিয়মাবলী:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Step 1: Add & Submit */}
                <div className="bg-white/90 backdrop-blur-xs p-3 rounded-lg border border-purple-100 shadow-2xs">
                  <div className="flex items-center space-x-2 text-purple-900 font-bold mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">1</span>
                    <span>নতুন KPI তৈরি ও জমা দেওয়া (Create &amp; Submit)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>ম্যানেজমেন্ট উপরে ডানপাশের বেগুনি <strong>&quot;+ Create KPI Target&quot;</strong> বাটনে ক্লিক করে টার্গেট সেট করবেন।</li>
                    <li>সংশ্লিষ্ট কর্মী (Employee) তার সারিতে <strong>&quot;Submit&quot;</strong> বাটনে চাপ দিয়ে অর্জিত মান (Actual Value) ও এভিডেন্স জমা দেবেন।</li>
                    <li>ম্যানেজার <strong>&quot;Review&quot;</strong> করে রেকমেন্ড করবেন এবং <strong>Head of HR</strong> ফাইনাল অনুমোদন (Approve) করবেন।</li>
                  </ol>
                </div>

                {/* Step 2: Delete KPI */}
                <div className="bg-white/90 backdrop-blur-xs p-3 rounded-lg border border-rose-100 shadow-2xs">
                  <div className="flex items-center space-x-2 text-rose-900 font-bold mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs">2</span>
                    <span>KPI কীভাবে ডিলিট করবেন? (How to Delete KPI)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    <li>নিচের টেবিলে যে KPI টি বাদ দিতে চান সেটির সারির ডানপাশে যান (Actions কলাম)।</li>
                    <li>লাল ডাস্টবিন আইকন <strong>(<Trash2 className="w-3 h-3 inline text-red-600" /> Delete)</strong> এ ক্লিক করুন।</li>
                    <li>নিশ্চিতকরণ পপআপে কোড ও বিস্তারিত দেখে লাল <strong>&quot;Confirm Delete&quot;</strong> এ চাপুন।</li>
                    <li>KPI টি ডাটাবেজ থেকে মুছে যাবে এবং এর সাথে যুক্ত টাস্কগুলো স্বয়ংক্রিয়ভাবে আনলিঙ্ক হয়ে যাবে।</li>
                  </ol>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white/70 p-2 rounded border border-slate-200/60 flex items-center justify-between">
                <div>
                  <strong className="text-slate-700">অনুমতি ও নিরাপত্তা (Security):</strong> টাস্ক ও কেপিআই অনুমোদন কেবল <strong>Shahriyar Naiem (Manager)</strong> ও <strong>Syeda Shaila Ashraf (Head of HR)</strong> করতে পারেন। সাধারণ এক্সিকিউটিভরা (Fariha, Sabbir, Nuzhat, Maisha) কোনো টাস্ক বা কেপিআই ডিলিট কিংবা অ্যাপ্রুভ করতে পারবে না।
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowGuideBanner(true)}
            className="text-[11px] text-purple-600 hover:text-purple-800 flex items-center space-x-1 font-medium bg-purple-50 px-2.5 py-1 rounded-md transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Show KPI Guide (কেপিআই সহায়িকা দেখুন)</span>
          </button>
        </div>
      )}

      {/* Info Callout */}
      <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl flex items-start space-x-3 text-xs text-purple-900">
        <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Accountability Rule:</strong> Unsubmitted KPIs are explicitly labeled as <span className="font-semibold">"Not Submitted"</span> rather than silently evaluated as 0%. Only <span className="font-semibold">Approved KPI Achievement Percentages</span> (signed off by Head of HR) count towards the official monthly rankings.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search KPI code, title, employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
          />
        </div>

        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="Approved">Approved Only</option>
          <option value="Pending">Pending Review / Approval</option>
          <option value="Not Submitted">Not Submitted</option>
        </select>
      </div>

      {/* KPIs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">KPI Code</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">KPI Title &amp; Description</th>
                <th className="py-3 px-4">Target vs Actual</th>
                <th className="py-3 px-4">Calculated %</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Approved Achievement</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKpis.map((kpi) => (
                <tr key={kpi.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {kpi.kpiCode}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                    <div>{kpi.employeeName}</div>
                    <div className="text-[11px] text-slate-400">{kpi.employeeDesignation}</div>
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="font-bold text-slate-900">{kpi.title}</div>
                    <p className="text-slate-500 line-clamp-1 mt-0.5">{kpi.description}</p>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Method: <span className="font-mono">{kpi.measurementMethod}</span> • Source: {kpi.dataSource || 'HRIS'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-700">
                      Target: <strong className="text-slate-900">{kpi.targetValue} {kpi.unit}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Actual: {kpi.actualValue !== null && kpi.actualValue !== undefined ? (
                        <strong className="text-indigo-600">{kpi.actualValue} {kpi.unit}</strong>
                      ) : (
                        <span className="italic text-slate-400">Not Submitted</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                    {kpi.calculatedAchievement !== null && kpi.calculatedAchievement !== undefined ? (
                      <span className={kpi.calculatedAchievement >= 100 ? 'text-purple-700' : 'text-slate-800'}>
                        {kpi.calculatedAchievement}%
                      </span>
                    ) : (
                      <span className="text-slate-300 font-normal italic">Pending</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                    {kpi.weight}x
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {kpi.approvedAchievementPercentage !== null ? (
                      <div className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                        {kpi.approvedAchievementPercentage}%
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Awaiting Approval</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        kpi.submissionStatus === 'Approved'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : kpi.submissionStatus === 'Submitted'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {kpi.submissionStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* Employee Submit Actuals */}
                      <button
                        onClick={() => {
                          setSelectedKpi(kpi);
                          setActualVal(kpi.actualValue || '');
                          setEvidenceNotes(kpi.evidenceNotes || '');
                          setSubmitModalOpen(true);
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded font-semibold text-[11px] shadow-xs"
                        title="Submit Actual Value & Evidence"
                      >
                        Submit
                      </button>

                      {/* Manager Review */}
                      {canReview && (
                        <button
                          onClick={() => {
                            setSelectedKpi(kpi);
                            setReviewModalOpen(true);
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px]"
                          title="Manager Review & Recommend"
                        >
                          Review
                        </button>
                      )}

                      {/* Head of HR Approval */}
                      {canApprove && (
                        <button
                          onClick={() => {
                            setSelectedKpi(kpi);
                            setApprovedPct(kpi.calculatedAchievement || kpi.approvedAchievementPercentage || 100);
                            setApproveModalOpen(true);
                          }}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold text-[11px] shadow-xs"
                          title="Final Approval by Head of HR"
                        >
                          Approve
                        </button>
                      )}

                      {/* Delete KPI (Management Only: Shahriyar Naiem, Syeda Shaila Ashraf, Admin) */}
                      {canCreate && (
                        <button
                          onClick={() => {
                            setKpiToDelete(kpi);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete KPI (কেপিআই মুছুন)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE KPI */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Define Monthly KPI Target</h3>
            <p className="text-xs text-slate-500 mt-1">Configure measurable targets for Renaissance HR &amp; OD</p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Employee</label>
                <select
                  required
                  value={formData.employeeId || ''}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">KPI Title</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Average Time-to-Fill for Executive Positions"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description &amp; Formula</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Measurement formula and data validation guidelines..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Measurement Method</label>
                  <select
                    value={formData.measurementMethod || 'higher_is_better'}
                    onChange={(e) => setFormData({ ...formData, measurementMethod: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="higher_is_better">Higher is Better (Standard)</option>
                    <option value="lower_is_better">Lower is Better (e.g. Turnaround Days)</option>
                    <option value="percentage">Direct Percentage (%)</option>
                    <option value="milestone">Milestone / Deliverable Count</option>
                    <option value="qualitative">Qualitative / Manual Evaluation</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Value &amp; Unit</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.targetValue || ''}
                      onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                      placeholder="e.g. 30"
                      className="w-2/3 border border-slate-300 rounded-lg p-2"
                    />
                    <input
                      type="text"
                      required
                      value={formData.unit || '%'}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="Days, %"
                      className="w-1/3 border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weight Factor</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="5.0"
                    value={formData.weight || 1.0}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reporting Period</label>
                  <input
                    type="text"
                    value={formData.reportingPeriod || 'October 2026'}
                    onChange={(e) => setFormData({ ...formData, reportingPeriod: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Create Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT ACTUAL VALUE */}
      {submitModalOpen && selectedKpi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Submit Monthly KPI Deliverable</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedKpi.title} • Target: {selectedKpi.targetValue} {selectedKpi.unit}
            </p>

            <form onSubmit={handleSubmitActual} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Actual Value Achieved ({selectedKpi.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={actualVal}
                  onChange={(e) => setActualVal(e.target.value)}
                  placeholder={`Enter achieved value in ${selectedKpi.unit}`}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Evidence Notes &amp; Verification Data</label>
                <textarea
                  rows={3}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Cite data sources, audit reports, or calculation methodologies..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGER REVIEW */}
      {reviewModalOpen && selectedKpi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Manager Review &amp; Recommendation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Review KPI submission for {selectedKpi.employeeName}
            </p>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recommendation</label>
                <select
                  value={reviewStatusChoice}
                  onChange={(e) => setReviewStatusChoice(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="Recommended">Recommended for Approval</option>
                  <option value="Revision Requested">Request Revision</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Submit Recommendation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FINAL APPROVAL (HEAD OF HR) */}
      {approveModalOpen && selectedKpi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Final Head of HR Approval</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedKpi.title} • {selectedKpi.employeeName}
            </p>

            <form onSubmit={handleApproveSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Final Approved Achievement Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={approvedPct}
                  onChange={(e) => setApprovedPct(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Calculated score: {selectedKpi.calculatedAchievement || 'N/A'}%
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Approving...' : 'Sign & Approve Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE KPI CONFIRMATION */}
      {deleteModalOpen && kpiToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-red-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete KPI Record</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete this KPI?</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5 my-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">KPI Code:</span>
                <span className="font-mono font-bold text-slate-800">{kpiToDelete.kpiCode}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Title:</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{kpiToDelete.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Employee:</span>
                <span className="text-slate-700 font-medium">
                  {kpiToDelete.employeeName || 'Unassigned'}
                  {kpiToDelete.employeeDesignation ? ` (${kpiToDelete.employeeDesignation})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Target Value:</span>
                <span className="font-mono text-slate-700 font-bold">{kpiToDelete.targetValue} {kpiToDelete.unit}</span>
              </div>
              <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2.5 leading-relaxed">
                ⚠️ <strong>সতর্কতা:</strong> এই KPI মুছে ফেললে এটি পারফরম্যান্স র‍্যাঙ্কিং হিসাব থেকে বাদ যাবে এবং এর সাথে যুক্ত টাস্কগুলো স্বয়ংক্রিয়ভাবে আনলিঙ্ক হয়ে যাবে।
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setKpiToDelete(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Deleting...' : 'Confirm Delete (ডিলিট নিশ্চিত করুন)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
