// src/components/AdminSetupWizardView.tsx
import React, { useState } from 'react';
import {
  Settings,
  Shield,
  UserCheck,
  RotateCcw,
  Sliders,
  Clock,
  Building,
  CheckCircle,
  HelpCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { AppSetting, Employee } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminSetupWizardViewProps {
  settings: AppSetting[];
  employees: Employee[];
  onRefresh: () => void;
  onUpdateSettings: (settings: Array<{ settingKey: string; settingValue: string }>) => Promise<void>;
  onResetSeed: () => Promise<void>;
}

export const AdminSetupWizardView: React.FC<AdminSetupWizardViewProps> = ({
  settings,
  employees,
  onRefresh,
  onUpdateSettings,
  onResetSeed,
}) => {
  const { activePersona } = useAuth();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue]));

  const [activeStep, setActiveStep] = useState<number>(1);
  const [headOfHrEmail, setHeadOfHrEmail] = useState(settingsMap['head_of_hr_email'] || 'head.hr@renaissance.com.bd');
  const [kpiWeight, setKpiWeight] = useState(settingsMap['scoring_kpi_weight'] || '70');
  const [taskWeight, setTaskWeight] = useState(settingsMap['scoring_task_weight'] || '30');
  const [kpiCap, setKpiCap] = useState(settingsMap['kpi_cap_percentage'] || '120');
  const [timezone, setTimezone] = useState(settingsMap['timezone'] || 'Asia/Dhaka');
  const [dayCutoff, setDayCutoff] = useState(settingsMap['day_cutoff_time'] || '23:59');
  const [reportingPeriod, setReportingPeriod] = useState(settingsMap['current_reporting_period'] || 'October 2026');

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const canManage = activePersona.role === 'admin' || activePersona.role === 'head_of_hr';

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onUpdateSettings([
        { settingKey: 'head_of_hr_email', settingValue: headOfHrEmail },
        { settingKey: 'scoring_kpi_weight', settingValue: kpiWeight },
        { settingKey: 'scoring_task_weight', settingValue: String(100 - parseInt(kpiWeight, 10)) },
        { settingKey: 'kpi_cap_percentage', settingValue: kpiCap },
        { settingKey: 'timezone', settingValue: timezone },
        { settingKey: 'day_cutoff_time', settingValue: dayCutoff },
        { settingKey: 'current_reporting_period', settingValue: reportingPeriod },
      ]);
      alert('System configuration and governance parameters saved successfully.');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Are you sure you want to re-seed demo data? This will restore the 5 core employees, Head of HR, responsibilities, demonstration tasks, and KPIs.')) {
      return;
    }
    try {
      setResetting(true);
      await onResetSeed();
      alert('Database successfully refreshed with initial Renaissance Group demonstration records.');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  const wizardSteps = [
    { num: 1, title: '1. Head of HR Supervisory Account', desc: 'Designate separate Head of HR role' },
    { num: 2, title: '2. Team & Reporting Hierarchy', desc: '5 employees & managerial structure' },
    { num: 3, title: '3. Job Duties & KPI Cycle', desc: 'Permanent duties & October 2026 cycle' },
    { num: 4, title: '4. Scoring & Overdue Cutoff Rules', desc: 'Asia/Dhaka timezone & formula calibration' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings &amp; Setup Wizard</h1>
              <p className="text-xs md:text-sm text-slate-500">
                Administrative governance, configurable Head of HR supervisory assignment &amp; scoring rules
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleResetData}
            disabled={resetting}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{resetting ? 'Resetting...' : 'Re-seed Demo Data'}</span>
          </button>
        )}
      </div>

      {/* 8-Step Setup Wizard Stepper */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Section 19: Administrator Onboarding &amp; Setup Wizard
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {wizardSteps.map((step) => (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              className={`p-3 rounded-lg border text-left transition ${
                activeStep === step.num
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">{step.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{step.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Wizard Step 1: Head of HR Account */}
      {activeStep === 1 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Step 1: Configure Head of HR Account</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The Head of HR is a separate supervisory role that oversees the department, approves final KPI scores, and reviews escalations. <strong className="text-slate-800">Do not assume that Shahriyar Naiem is the Head of HR.</strong>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Designated Head of HR Email</label>
              <input
                type="email"
                value={headOfHrEmail}
                onChange={(e) => setHeadOfHrEmail(e.target.value)}
                placeholder="head.hr@renaissance.com.bd"
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Current assignee: Syeda Shaila Ashraf, Head of HR (EMP-000)
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <strong>Supervisory Powers:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>View entire HR department dashboard</li>
                <li>Assign tasks &amp; deadlines across all 5 team members</li>
                <li>Final sign-off on approved KPI achievement percentages</li>
                <li>Calibrate monthly performance rankings</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Step 2: Team & Reporting Hierarchy */}
      {activeStep === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Building className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Step 2: Team Members &amp; Reporting Relationships</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Initial 5 team members and reporting managers in Renaissance HR &amp; OD:
          </p>

          <div className="divide-y divide-slate-100 text-xs">
            {employees.map((emp) => (
              <div key={emp.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{emp.name}</span>{' '}
                  <span className="text-slate-500">({emp.designation})</span>
                </div>
                <div className="text-slate-600 font-medium">
                  Reports to: <strong className="text-slate-800">{emp.reportingManagerName || 'Board / MD'}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wizard Step 3: Job Duties & KPI Cycle */}
      {activeStep === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Step 3: Permanent Duties &amp; Active Cycle</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Active Reporting Cycle Period</label>
              <input
                type="text"
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="October 2026"
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Configured Timezone</label>
              <input
                type="text"
                disabled
                value="Asia/Dhaka (UTC+06:00)"
                className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Wizard Step 4: Scoring & Overdue Cutoff Rules */}
      {activeStep === 4 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Sliders className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Step 4: Performance Formula &amp; Overdue Cutoff</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Approved KPI Weight (%)</label>
                <input
                  type="number"
                  min="20"
                  max="90"
                  value={kpiWeight}
                  onChange={(e) => setKpiWeight(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Execution Weight (%)</label>
                <input
                  type="number"
                  disabled
                  value={100 - parseInt(kpiWeight || '70', 10)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">KPI Over-Achievement Cap (%)</label>
                <input
                  type="number"
                  min="100"
                  max="150"
                  value={kpiCap}
                  onChange={(e) => setKpiCap(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">End-of-Day Overdue Cutoff Time</label>
                <input
                  type="text"
                  value={dayCutoff}
                  onChange={(e) => setDayCutoff(e.target.value)}
                  placeholder="23:59"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tasks due today are NOT marked overdue until 23:59 Asia/Dhaka passes.
                </span>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                <strong>Accountability Preservation:</strong> When a deadline extension is approved by a manager, the revised deadline takes effect for scheduling, but the original deadline remains permanently recorded in the database.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
              >
                {saving ? 'Saving...' : 'Save All Governance Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
