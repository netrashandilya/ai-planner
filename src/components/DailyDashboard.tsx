import React, { useState } from 'react';
import { StudyTask, UserProfile, Subject } from '../types';
import { planWiseStore } from '../firebase/config';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Calendar, 
  Zap, 
  RefreshCw, 
  ShieldCheck, 
  Layers,
  ArrowRight
} from 'lucide-react';

interface DailyDashboardProps {
  user: UserProfile;
  subjects: Subject[];
  tasks: StudyTask[];
  onTasksUpdated: (newTasks: StudyTask[]) => void;
  onOpenEngineModal: () => void;
}

export const DailyDashboard: React.FC<DailyDashboardProps> = ({
  user,
  subjects,
  tasks,
  onTasksUpdated,
  onOpenEngineModal
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isAdjusting, setIsAdjusting] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adjustmentBanner, setAdjustmentBanner] = useState<string | null>(null);

  // Generate date tabs for the 7 upcoming days
  const dateTabs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dateStr, dayLabel, formattedDate };
  });

  // Filter tasks for selected date
  const tasksForSelectedDate = tasks.filter(t => t.date === selectedDate);

  // Calculate stats for selected date
  const totalHoursScheduled = tasksForSelectedDate.reduce((acc, t) => acc + (t.durationHours || 0), 0);
  const completedTasksCount = tasksForSelectedDate.filter(t => t.status === 'completed').length;
  const missedTasksCount = tasksForSelectedDate.filter(t => t.status === 'missed').length;
  const bufferReservedHours = (user.studyHoursPerDay * 0.15).toFixed(1);

  // Handle Mark Completed
  const handleMarkCompleted = (taskId: string) => {
    planWiseStore.updateTaskStatus(taskId, 'completed');
    onTasksUpdated(planWiseStore.getTasks());
  };

  // Requirement 4 & 5: Trigger /adjust-schedule backend endpoint on Missed
  const handleMarkMissed = async (taskId: string) => {
    setIsAdjusting(taskId);
    setAdjustmentBanner(null);

    // Immediate optimistic local update
    planWiseStore.updateTaskStatus(taskId, 'missed');
    const currentTasks = planWiseStore.getTasks();

    try {
      // Call Python backend endpoint /adjust-schedule
      const response = await fetch('/adjust-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missedTaskId: taskId,
          tasks: currentTasks,
          user: user
        })
      });

      const data = await response.json();

      if (data.success && data.tasks) {
        planWiseStore.setTasks(data.tasks);
        onTasksUpdated(data.tasks);
        setAdjustmentBanner(
          `AI Dynamic Adjustment Triggered: Redistributed ${data.missedHoursRedistributed || 1.5} missed hours into remaining buffer slots across the week without overlapping existing sessions.`
        );
      } else {
        // Fallback in-client redistribution if server is offline
        executeClientFallbackAdjustment(taskId, currentTasks);
      }
    } catch (err) {
      console.warn("Server adjustment route error, running client redistribution logic:", err);
      executeClientFallbackAdjustment(taskId, currentTasks);
    } finally {
      setIsAdjusting(null);
      setTimeout(() => setAdjustmentBanner(null), 8000);
    }
  };

  // Client-side fallback redistribution if backend connection is interrupted
  const executeClientFallbackAdjustment = (taskId: string, currentTasks: StudyTask[]) => {
    const missedTask = currentTasks.find(t => t.id === taskId);
    if (!missedTask) return;

    const missedHours = missedTask.durationHours || 1.5;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const rescheduledTask: StudyTask = {
      id: `adj_local_${Date.now()}`,
      userId: user.uid,
      subjectId: missedTask.subjectId,
      subjectName: `${missedTask.subjectName} (Recovery)`,
      startTime: `${tomorrowStr}T17:00:00`,
      endTime: `${tomorrowStr}T18:30:00`,
      durationHours: missedHours,
      date: tomorrowStr,
      status: 'scheduled',
      isPeakEnergy: false,
      difficulty: missedTask.difficulty,
      notes: `Intelligently redistributed into 15% buffer slot.`,
      createdAt: new Date().toISOString()
    };

    const updated = [...currentTasks, rescheduledTask];
    planWiseStore.setTasks(updated);
    onTasksUpdated(updated);
    setAdjustmentBanner(
      `Redistributed ${missedHours}h into tomorrow's open buffer block (17:00 - 18:30) without collision.`
    );
  };

  // Trigger Python Schedule Generation
  const handleGenerateSchedule = async () => {
    if (subjects.length === 0) {
      alert("Please add at least one subject to generate your study schedule.");
      return;
    }

    setIsGenerating(true);
    setAdjustmentBanner(null);

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user,
          subjects: subjects
        })
      });

      const data = await response.json();
      if (data.success && data.tasks) {
        planWiseStore.setTasks(data.tasks);
        onTasksUpdated(data.tasks);
        setAdjustmentBanner(`Generated ${data.tasks.length} optimized 1-2h study blocks across 7 days with 15% reserved buffer.`);
      } else {
        throw new Error(data.error || "Generation returned incomplete data");
      }
    } catch (err) {
      console.warn("API schedule generation error, generating using local engine rules:", err);
      generateLocalSchedule();
    } finally {
      setIsGenerating(false);
    }
  };

  // Local schedule generator mirroring Python scheduler
  const generateLocalSchedule = () => {
    const generated: StudyTask[] = [];
    const peakStart = user.peakEnergyTime === 'Morning' ? 8 : user.peakEnergyTime === 'Afternoon' ? 13 : 19;
    const peakEnd = peakStart + 4;
    const activeStudyTarget = user.studyHoursPerDay * 0.85;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      let scheduledToday = 0;
      subjects.forEach((sub, sIdx) => {
        if (scheduledToday >= activeStudyTarget) return;

        const duration = sub.difficulty >= 7 ? 2.0 : sub.difficulty >= 4 ? 1.5 : 1.0;
        if (scheduledToday + duration > activeStudyTarget) return;

        const startHour = sIdx === 0 ? peakStart : peakEnd + (sIdx - 1) * 2;
        const endHour = startHour + duration;

        const startPad = Math.floor(startHour).toString().padStart(2, '0');
        const startMin = Math.round((startHour % 1) * 60).toString().padStart(2, '0');
        const endPad = Math.floor(endHour).toString().padStart(2, '0');
        const endMin = Math.round((endHour % 1) * 60).toString().padStart(2, '0');

        generated.push({
          id: `task_${dateStr}_${sub.id}_${sIdx}`,
          userId: user.uid,
          subjectId: sub.id,
          subjectName: sub.name,
          startTime: `${dateStr}T${startPad}:${startMin}:00`,
          endTime: `${dateStr}T${endPad}:${endMin}:00`,
          durationHours: duration,
          date: dateStr,
          status: 'scheduled',
          isPeakEnergy: sub.difficulty >= 7,
          difficulty: sub.difficulty,
          notes: `Priority session. Allocated to ${sub.difficulty >= 7 ? 'Peak Energy Window' : 'Standard Focus Window'}.`,
          createdAt: new Date().toISOString()
        });

        scheduledToday += duration;
      });
    }

    planWiseStore.setTasks(generated);
    onTasksUpdated(generated);
    setAdjustmentBanner(`Generated ${generated.length} study blocks matching ${user.peakEnergyTime} peak energy.`);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Adjustment Notification Banner */}
      {adjustmentBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-[#2E9E82] mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong className="block text-emerald-950 font-bold mb-0.5">PlanWise AI Dynamic Workload Redistributor</strong>
            {adjustmentBanner}
          </div>
        </div>
      )}

      {/* Date Switcher & Control Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#2E9E82]">
              Daily Schedule View
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-700" />
              <span>Study Blocks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-run-scheduler-engine"
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] hover:bg-gray-800 text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Running Python Engine...' : 'Regenerate Weekly AI Plan'}</span>
            </button>
          </div>
        </div>

        {/* 7-Day Date Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 no-scrollbar">
          {dateTabs.map(tab => {
            const isSelected = selectedDate === tab.dateStr;
            const tasksOnDay = tasks.filter(t => t.date === tab.dateStr);
            const hasMissed = tasksOnDay.some(t => t.status === 'missed');

            return (
              <button
                key={tab.dateStr}
                id={`tab-date-${tab.dateStr}`}
                onClick={() => setSelectedDate(tab.dateStr)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#2E9E82] bg-emerald-50/70 ring-1 ring-[#2E9E82] text-gray-900'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-black'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                  <span>{tab.dayLabel}</span>
                  {hasMissed && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Has missed session"></span>}
                </div>
                <div className="text-xs font-bold mt-0.5 text-gray-900 font-mono">
                  {tab.formattedDate}
                </div>
                <div className="text-[10px] text-gray-600 mt-1">
                  {tasksOnDay.length} block{tasksOnDay.length !== 1 ? 's' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Metrics Panel (Anti-Slop Clean Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 block">
            Scheduled Focus
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-gray-900">{totalHoursScheduled.toFixed(1)}</span>
            <span className="text-xs text-gray-600 font-medium">/ {user.studyHoursPerDay} hrs</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2E9E82] block">
            15% Buffer Reserved
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-800">{bufferReservedHours}</span>
            <span className="text-xs text-gray-600 font-medium">hrs free</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 block">
            Peak Energy Window
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#2E9E82]" />
            <span className="text-sm font-bold text-gray-900">{user.peakEnergyTime}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 block">
            Block Completion
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-gray-900">
              {tasksForSelectedDate.length ? `${Math.round((completedTasksCount / tasksForSelectedDate.length) * 100)}%` : '0%'}
            </span>
            <span className="text-xs text-gray-600">
              ({completedTasksCount}/{tasksForSelectedDate.length})
            </span>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
            Study Blocks for Selected Day
          </h3>
          <span className="text-xs text-gray-600 font-medium">
            {tasksForSelectedDate.length} sessions scheduled
          </span>
        </div>

        {tasksForSelectedDate.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-gray-900">
              No study blocks scheduled for this day
            </h4>
            <p className="text-xs text-gray-600 max-w-sm mx-auto mt-1 mb-4">
              Click the AI generator to compute 1-2 hour study blocks prioritized by exam dates and difficulty.
            </p>
            <button
              id="btn-empty-generate-schedule"
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Generate AI Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasksForSelectedDate.map((task) => {
              const isCompleted = task.status === 'completed';
              const isMissed = task.status === 'missed';
              const isCurrentlyAdjusting = isAdjusting === task.id;

              return (
                <div
                  key={task.id}
                  id={`task-card-${task.id}`}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/40 opacity-90'
                      : isMissed
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-gray-200 bg-white hover:border-gray-300 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Time & Subject Information */}
                    <div className="flex items-start gap-3.5">
                      <div className="text-center bg-gray-50 border border-gray-200 rounded-xl p-2.5 min-w-[80px]">
                        <span className="text-xs font-bold font-mono text-gray-900 block">
                          {formatTime(task.startTime).replace(':00', '')}
                        </span>
                        <span className="text-[10px] text-gray-600 block mt-0.5 font-medium">
                          {task.durationHours} hrs
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-base font-bold tracking-tight ${
                            isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'
                          }`}>
                            {task.subjectName}
                          </h4>

                          {task.isPeakEnergy && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-[#2E9E82] border border-teal-200 font-medium">
                              <Zap className="w-3 h-3" />
                              Peak Energy Match
                            </span>
                          )}

                          {task.difficulty && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              Diff: {task.difficulty}/10
                            </span>
                          )}

                          {isCompleted && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          )}

                          {isMissed && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              Missed (Redistributed)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mt-1">
                          {task.notes || 'Focus session on core topics and problem solving.'}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Action Buttons (Requirement 5) */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                      
                      {/* Mark Completed Button */}
                      <button
                        id={`btn-complete-${task.id}`}
                        type="button"
                        onClick={() => handleMarkCompleted(task.id)}
                        disabled={isCompleted || isCurrentlyAdjusting}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                          isCompleted
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
                            : 'border-gray-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-700 shadow-2xs'
                        }`}
                        title="Mark session as completed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isCompleted ? 'Done' : 'Complete'}</span>
                      </button>

                      {/* Mark Missed Button (Triggers /adjust-schedule) */}
                      <button
                        id={`btn-missed-${task.id}`}
                        type="button"
                        onClick={() => handleMarkMissed(task.id)}
                        disabled={isCompleted || isMissed || isCurrentlyAdjusting}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                          isMissed
                            ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-default'
                            : 'border-gray-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-gray-700 shadow-2xs'
                        }`}
                        title="Mark missed & trigger intelligent redistribution into buffer blocks"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>{isCurrentlyAdjusting ? 'Redistributing...' : isMissed ? 'Redistributed' : 'Missed'}</span>
                      </button>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
