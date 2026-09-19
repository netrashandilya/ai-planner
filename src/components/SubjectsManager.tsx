import React, { useState } from 'react';
import { Subject } from '../types';
import { planWiseStore } from '../firebase/config';
import { Plus, Trash2, Calendar, Award, BookOpen } from 'lucide-react';

interface SubjectsManagerProps {
  userId: string;
  subjects: Subject[];
  onSubjectsUpdated: () => void;
  onTriggerReschedule: () => void;
}

export const SubjectsManager: React.FC<SubjectsManagerProps> = ({
  userId,
  subjects,
  onSubjectsUpdated,
  onTriggerReschedule: _onTriggerReschedule
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [difficulty, setDifficulty] = useState<number>(7);

  // Calculate live formula priority
  const calculateLivePriority = (diff: number, targetDate: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return ((diff * 10) / days).toFixed(2);
    } catch {
      return '1.00';
    }
  };

  const livePriority = calculateLivePriority(difficulty, examDate);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pScore = parseFloat(calculateLivePriority(difficulty, examDate));
    planWiseStore.addSubject({
      userId,
      name: name.trim(),
      examDate,
      difficulty,
      priorityScore: pScore
    });

    setName('');
    setIsAdding(false);
    onSubjectsUpdated();
  };

  const handleDeleteSubject = (id: string) => {
    planWiseStore.deleteSubject(id);
    onSubjectsUpdated();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2E9E82]" />
            <h3 className="font-bold text-base text-gray-900 tracking-tight">
              Subject Inventory &amp; Exam Deadlines
            </h3>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Dynamic prioritization formula: <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-semibold">(Difficulty × 10) ÷ Days_Remaining</code>
          </p>
        </div>

        <button
          id="btn-toggle-add-subject"
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-900 transition-colors cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancel' : 'Add Subject'}</span>
        </button>
      </div>

      {/* Add Subject Collapsible Form */}
      {isAdding && (
        <form onSubmit={handleAddSubject} className="mt-4 p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Subject Name */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Subject / Course Name
              </label>
              <input
                id="input-subject-name"
                type="text"
                required
                placeholder="e.g. Operating Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2E9E82]"
              />
            </div>

            {/* Exam Date */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Exam Date
              </label>
              <input
                id="input-subject-date"
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2E9E82]"
              />
            </div>

            {/* Difficulty Rating Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-700">
                  Difficulty (1–10)
                </label>
                <span className="text-xs font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-full font-mono">
                  {difficulty}/10
                </span>
              </div>
              <input
                id="slider-subject-difficulty"
                type="range"
                min={1}
                max={10}
                step={1}
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2E9E82]"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>1 (Easy)</span>
                <span>10 (Intensive)</span>
              </div>
            </div>

          </div>

          {/* Formula Live Output preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200 text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <Award className="w-3.5 h-3.5 text-[#2E9E82]" />
              <span>Computed Priority Score: <strong className="text-gray-900 font-mono text-sm">{livePriority}</strong></span>
              {difficulty >= 7 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-[#2E9E82] border border-teal-200 font-medium">
                  High Difficulty → Peak Energy Slot
                </span>
              )}
            </div>

            <button
              id="btn-submit-subject"
              type="submit"
              className="px-5 py-2 rounded-full bg-[#111111] hover:bg-gray-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Subject List Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {subjects.map((sub) => {
          const pScore = calculateLivePriority(sub.difficulty, sub.examDate);
          const isHigh = sub.difficulty >= 7;

          return (
            <div
              key={sub.id}
              className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 flex flex-col justify-between hover:border-gray-300 transition-colors shadow-2xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                    {sub.name}
                  </h4>
                  <button
                    id={`btn-delete-subject-${sub.id}`}
                    onClick={() => handleDeleteSubject(sub.id)}
                    className="text-gray-600 hover:text-red-600 p-1 transition-colors cursor-pointer"
                    title="Delete subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-600" />
                  <span>Exam: {sub.examDate}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 text-[10px] uppercase font-semibold">Diff:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isHigh ? 'bg-teal-50 text-[#2E9E82] border border-teal-200' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {sub.difficulty}/10
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-gray-600 text-[10px] uppercase font-semibold">Priority:</span>
                  <span className="font-bold text-gray-900 text-[12px] bg-white px-2 py-0.5 rounded-md border border-gray-200 font-mono">
                    {pScore}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
