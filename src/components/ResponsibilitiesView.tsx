// src/components/ResponsibilitiesView.tsx
import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Briefcase,
  Edit2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Responsibility, Employee } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ResponsibilitiesViewProps {
  responsibilities: Responsibility[];
  employees: Employee[];
  onRefresh: () => void;
  onCreateResponsibility: (data: Partial<Responsibility>) => Promise<void>;
  onUpdateResponsibility: (id: number, data: Partial<Responsibility>) => Promise<void>;
}

export const ResponsibilitiesView: React.FC<ResponsibilitiesViewProps> = ({
  responsibilities,
  employees,
  onRefresh,
  onCreateResponsibility,
  onUpdateResponsibility,
}) => {
  const { activePersona } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedResp, setSelectedResp] = useState<Responsibility | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);

  const canManage = activePersona.role !== 'employee';

  const categories = [
    'Talent Acquisition',
    'Training & OD',
    'HR Operations & Analytics',
    'Performance Management',
    'Compliance',
    'Employee Relations',
  ];

  const frequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'Ad Hoc'];

  const filtered = responsibilities.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.responsibilityCode.toLowerCase().includes(q) ||
      (r.employeeName && r.employeeName.toLowerCase().includes(q));

    const matchCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchFrequency = selectedFrequency === 'all' || r.frequency === selectedFrequency;
    const matchEmployee = selectedEmployeeId === 'all' || r.employeeId === parseInt(selectedEmployeeId, 10);

    return matchSearch && matchCategory && matchFrequency && matchEmployee;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await onCreateResponsibility(formData);
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
    if (!selectedResp) return;
    try {
      setActionLoading(true);
      await onUpdateResponsibility(selectedResp.id, formData);
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
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Responsibility Register</h1>
              <p className="text-xs md:text-sm text-slate-500">
                Ongoing job duties &amp; permanent recurring responsibilities (separate from one-time tasks and monthly KPIs)
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setFormData({
                responsibilityCode: `RESP-0${responsibilities.length + 1}`,
                category: 'Talent Acquisition',
                frequency: 'Monthly',
                status: 'active',
                effectiveDate: '2026-01-01',
              });
              setCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Job Responsibility</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search duty title, description, code, employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
          />
        </div>

        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.designation})
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedFrequency}
          onChange={(e) => setSelectedFrequency(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="all">All Frequencies</option>
          {frequencies.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Responsibilities Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Resp Code</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Title &amp; Duty Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Expected Deliverable &amp; Criteria</th>
                <th className="py-3 px-4">Status</th>
                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((resp) => (
                <tr key={resp.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800 shrink-0">
                    {resp.responsibilityCode}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                    <div>{resp.employeeName}</div>
                    <div className="text-[11px] text-slate-400">{resp.employeeDesignation}</div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-bold text-slate-900">{resp.title}</div>
                    <p className="text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{resp.description}</p>
                    {resp.relatedKpiTitle && (
                      <div className="text-[10px] text-indigo-700 font-medium mt-1">
                        Linked KPI: {resp.relatedKpiTitle}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                      {resp.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-semibold text-[11px]">
                      {resp.frequency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-slate-700">
                    <div className="font-medium text-slate-900">{resp.expectedDeliverable}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">SLA: {resp.measurementCriteria}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        resp.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {resp.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedResp(resp);
                          setFormData({
                            title: resp.title,
                            description: resp.description,
                            category: resp.category,
                            frequency: resp.frequency,
                            expectedDeliverable: resp.expectedDeliverable,
                            measurementCriteria: resp.measurementCriteria,
                            relatedKpiTitle: resp.relatedKpiTitle || '',
                            status: resp.status,
                          });
                          setEditModalOpen(true);
                        }}
                        className="text-slate-500 hover:text-indigo-600 p-1 rounded transition"
                        title="Edit Responsibility"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RESPONSIBILITY MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Define Ongoing Job Responsibility</h3>
            <p className="text-xs text-slate-500 mt-1">
              Permanent duty assignment in Renaissance HR &amp; OD Responsibility Register
            </p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign to Employee</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category || 'Talent Acquisition'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsibility Title</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Executive Talent Acquisition & Onboarding"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Duty Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline regular core deliverables, scope, and recurring responsibilities..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formData.frequency || 'Monthly'}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {frequencies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate || '2026-01-01'}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Deliverable</label>
                  <input
                    type="text"
                    required
                    value={formData.expectedDeliverable || ''}
                    onChange={(e) => setFormData({ ...formData, expectedDeliverable: e.target.value })}
                    placeholder="e.g. Monthly Talent Pipeline Dashboard"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Measurement Criteria / SLA</label>
                  <input
                    type="text"
                    required
                    value={formData.measurementCriteria || ''}
                    onChange={(e) => setFormData({ ...formData, measurementCriteria: e.target.value })}
                    placeholder="e.g. Time-to-fill <= 30 calendar days"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Related KPI (Optional link)</label>
                <input
                  type="text"
                  value={formData.relatedKpiTitle || ''}
                  onChange={(e) => setFormData({ ...formData, relatedKpiTitle: e.target.value })}
                  placeholder="e.g. Average Time-to-Fill for Executive Positions"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
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
                  {actionLoading ? 'Saving...' : 'Register Responsibility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESPONSIBILITY MODAL */}
      {editModalOpen && selectedResp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Edit Responsibility</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedResp.responsibilityCode} • {selectedResp.employeeName}
            </p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Duty Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={formData.frequency || 'Monthly'}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {frequencies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Deliverable</label>
                  <input
                    type="text"
                    required
                    value={formData.expectedDeliverable || ''}
                    onChange={(e) => setFormData({ ...formData, expectedDeliverable: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Measurement Criteria</label>
                  <input
                    type="text"
                    required
                    value={formData.measurementCriteria || ''}
                    onChange={(e) => setFormData({ ...formData, measurementCriteria: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
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
                  {actionLoading ? 'Saving...' : 'Update Responsibility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
