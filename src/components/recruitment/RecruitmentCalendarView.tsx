// src/components/recruitment/RecruitmentCalendarView.tsx
import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, Mail, Briefcase, Building } from 'lucide-react';
import { RecruitmentRequisition } from '../../types/index.ts';
import { RecruitmentRealtimeIndicator, SyncStatus } from './RecruitmentRealtimeIndicator.tsx';

interface Props {
  requisitions: RecruitmentRequisition[];
  syncStatus: SyncStatus;
  lastUpdated: string | null;
  onRefresh: () => void;
}

export const RecruitmentCalendarView: React.FC<Props> = ({
  requisitions,
  syncStatus,
  lastUpdated,
  onRefresh,
}) => {
  // Default to October 2026 or current active cycle
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Find events for each day
  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const joined = requisitions.filter((r) => r.dateOfJoining === dateStr);
    const requisitionsCreated = requisitions.filter((r) => r.requisitionDate === dateStr);
    const offerLetters = requisitions.filter((r) => r.offerLetterDate === dateStr);
    return { joined, requisitionsCreated, offerLetters, total: joined.length + requisitionsCreated.length + offerLetters.length };
  };

  const selectedDateStr = selectedDay
    ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
              Recruitment Schedule
            </span>
            <span className="text-xs text-slate-400">DOJ, Offers &amp; Requisition Dates</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Recruitment Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Timeline of employee joining dates, offer letters &amp; requisition launches
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

      {/* Calendar Controls & Month Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              {monthNames[currentMonth]} {currentYear}
            </h2>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear((y) => y - 1);
                  } else {
                    setCurrentMonth((m) => m - 1);
                  }
                  setSelectedDay(null);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(9);
                  setCurrentYear(2026);
                  setSelectedDay(null);
                }}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Oct 2026
              </button>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear((y) => y + 1);
                  } else {
                    setCurrentMonth((m) => m + 1);
                  }
                  setSelectedDay(null);
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-[11px] font-semibold text-slate-500 pt-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Joined Employees (DOJ)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Requisition Initiated</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Offer Letter Issued</span>
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="p-2 font-bold text-slate-400 uppercase text-[10px]">
                {d}
              </div>
            ))}

            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="p-2 rounded-xl opacity-20" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const { joined, requisitionsCreated, offerLetters, total } = getEventsForDay(day);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[64px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-sm'
                      : total > 0
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {total > 0 && (
                      <span className="text-[10px] font-mono text-slate-400">×{total}</span>
                    )}
                  </div>

                  {/* Indicator Dots */}
                  <div className="flex flex-wrap gap-1 mt-1 justify-center">
                    {joined.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title={`${joined.length} joined`} />
                    )}
                    {requisitionsCreated.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs" title={`${requisitionsCreated.length} reqs`} />
                    )}
                    {offerLetters.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" title={`${offerLetters.length} offers`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Event Drawer */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {selectedDateStr ? `Events for ${selectedDateStr}` : 'Select a Day to View Activities'}
            </h3>
          </div>

          {!selectedDayEvents || selectedDayEvents.total === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No recruitment events or DOJ recorded for this selected calendar date.
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto text-xs pr-1">
              {/* Joined Employees */}
              {selectedDayEvents.joined.map((r) => (
                <div
                  key={`joined-${r.id}`}
                  className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">🎉 Employee Joined (DOJ)</span>
                    <span className="font-mono text-[10px] text-emerald-600 font-bold">{r.company}</span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">{r.positionTitle}</div>
                  <div className="text-[11px] text-slate-500">{r.department} • Time to Fill: {r.timeToFillDays ?? '-'}d</div>
                </div>
              ))}

              {/* Requisitions Created */}
              {selectedDayEvents.requisitionsCreated.map((r) => (
                <div
                  key={`req-${r.id}`}
                  className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800 dark:text-blue-300">📄 Requisition Initiated</span>
                    <span className="font-mono text-[10px] text-blue-600 font-bold">{r.company}</span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">{r.positionTitle}</div>
                  <div className="text-[11px] text-slate-500">{r.department} • {r.recruitmentType}</div>
                </div>
              ))}

              {/* Offer Letters */}
              {selectedDayEvents.offerLetters.map((r) => (
                <div
                  key={`offer-${r.id}`}
                  className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 dark:text-amber-300">✉️ Offer Letter Issued</span>
                    <span className="font-mono text-[10px] text-amber-600 font-bold">{r.company}</span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">{r.positionTitle}</div>
                  <div className="text-[11px] text-slate-500">{r.department} • Assisted: {r.recruitmentAssistedByName.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
