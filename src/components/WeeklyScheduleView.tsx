import React from 'react';
import { StudyTask, UserProfile } from '../types';
import { Calendar, Zap, Shield } from 'lucide-react';

interface WeeklyScheduleViewProps {
  tasks: StudyTask[];
  user: UserProfile;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({ tasks, user }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    return { dateStr, dayLabel, formattedDate };
  });

  const formatHour = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-700" />
            7-Day Master Schedule Grid
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Optimized distribution of 1–2h sessions with designated 15% cognitive recovery buffers.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-gray-800"></span>
            <span>Study Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300"></span>
            <span>15% Free Buffer</span>
          </div>
        </div>
      </div>

      {/* 7 Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 mt-5">
        {days.map((day) => {
          const dayTasks = tasks.filter(t => t.date === day.dateStr);
          const totalHours = dayTasks.reduce((acc, t) => acc + (t.durationHours || 0), 0);

          return (
            <div
              key={day.dateStr}
              className="bg-gray-50/80 border border-gray-200 rounded-xl p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="text-center pb-2 mb-2.5 border-b border-gray-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-800 block">
                    {day.dayLabel}
                  </span>
                  <span className="text-[10px] font-mono text-gray-600">
                    {day.formattedDate}
                  </span>
                </div>

                <div className="space-y-2">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`p-2 rounded-lg text-[11px] border transition-all ${
                        t.status === 'completed'
                          ? 'bg-gray-100 border-gray-200 text-gray-600 line-through'
                          : t.status === 'missed'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : t.isPeakEnergy
                          ? 'bg-teal-50 border-teal-200 text-teal-900 font-semibold'
                          : 'bg-white border-gray-200 text-gray-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 font-mono font-medium">
                          {formatHour(t.startTime)}
                        </span>
                        {t.isPeakEnergy && <Zap className="w-2.5 h-2.5 text-[#2E9E82]" />}
                      </div>
                      <div className="truncate font-medium mt-0.5" title={t.subjectName}>
                        {t.subjectName}
                      </div>
                    </div>
                  ))}

                  {/* Explicit 15% Buffer Slot */}
                  <div className="p-2 rounded-lg text-[10px] border border-dashed border-emerald-300 bg-emerald-50/70 text-emerald-800 text-center">
                    <Shield className="w-2.5 h-2.5 mx-auto mb-0.5 text-[#2E9E82]" />
                    15% Buffer Block
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200 text-[10px] font-mono text-gray-600 text-center font-medium">
                {totalHours.toFixed(1)}h / {user.studyHoursPerDay}h
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
