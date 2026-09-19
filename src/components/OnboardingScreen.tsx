import React, { useState } from 'react';
import { UserProfile, PeakEnergyTime } from '../types';
import { planWiseStore } from '../firebase/config';
import { Sun, Sunset, Moon, Clock, ArrowRight, Check, Zap } from 'lucide-react';

interface OnboardingScreenProps {
  user: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ user, onComplete }) => {
  const [studyHours, setStudyHours] = useState<number>(user.studyHoursPerDay || 5);
  const [peakEnergy, setPeakEnergy] = useState<PeakEnergyTime>(user.peakEnergyTime || 'Morning');
  const [isSaving, setIsSaving] = useState(false);

  const peakOptions: { id: PeakEnergyTime; title: string; timeWindow: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'Morning',
      title: 'Morning Prime',
      timeWindow: '08:00 — 12:00',
      desc: 'Optimal for analytical rigor, mathematical proofs, and complex algorithmic problem solving.',
      icon: <Sun className="w-5 h-5 text-zinc-100" />
    },
    {
      id: 'Afternoon',
      title: 'Afternoon Focus',
      timeWindow: '13:00 — 17:00',
      desc: 'Ideal for system architecture, active recall, coding implementations, and structured synthesis.',
      icon: <Sunset className="w-5 h-5 text-zinc-100" />
    },
    {
      id: 'Night',
      title: 'Night Owl Flow',
      timeWindow: '19:00 — 23:00',
      desc: 'Quiet nocturnal deep work, theory absorption, research synthesis, and undisturbed conceptual focus.',
      icon: <Moon className="w-5 h-5 text-zinc-100" />
    }
  ];

  // Calculated constraints
  const bufferHours = (studyHours * 0.15).toFixed(1);
  const activeStudyHours = (studyHours * 0.85).toFixed(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedUser: UserProfile = {
      ...user,
      studyHoursPerDay: studyHours,
      peakEnergyTime: peakEnergy,
      updatedAt: new Date().toISOString()
    };

    planWiseStore.setUser(updatedUser);
    setTimeout(() => {
      setIsSaving(false);
      onComplete(updatedUser);
    }, 400);
  };

  return (
    <div className="w-full flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-10 shadow-xl">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-mono font-bold">
              1
            </span>
            <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Profile Configuration
            </span>
          </div>
          <span className="text-xs text-gray-600 font-medium">
            Cognitive Constraints
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-[#111111]">
            Calibrate Cognitive Engine
          </h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            PlanWise uses your temporal constraints to allocate 1–2 hour study blocks, reserving a strict 15% recovery buffer and scheduling high-difficulty subjects during your cognitive peak.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. Study Hours Selector */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2E9E82]" />
                  Available Study Hours Per Day
                </label>
                <p className="text-xs text-gray-600 mt-0.5">
                  Daily target capacity including self-study, assignments, and revision.
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold font-mono text-[#111111]">
                  {studyHours}
                </span>
                <span className="text-xs font-medium text-gray-600 ml-1">hrs/day</span>
              </div>
            </div>

            {/* Range Slider */}
            <input
              id="slider-study-hours"
              type="range"
              min={2}
              max={12}
              step={0.5}
              value={studyHours}
              onChange={(e) => setStudyHours(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2E9E82] focus:outline-none"
            />

            <div className="flex justify-between text-[11px] font-medium text-gray-600 mt-2">
              <span>2 hrs (Light)</span>
              <span>6 hrs (Standard)</span>
              <span>12 hrs (Intensive)</span>
            </div>

            {/* 15% Buffer Math Breakdown */}
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-gray-600 block text-[10px] uppercase font-semibold">Active Study (85%)</span>
                <span className="text-gray-900 font-bold text-sm">{activeStudyHours} hrs</span>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
                <span className="text-emerald-800 block text-[10px] uppercase font-semibold">15% Free Buffer</span>
                <span className="text-emerald-950 font-bold text-sm">{bufferHours} hrs reserved</span>
              </div>
            </div>
          </div>

          {/* 2. Peak Energy Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#2E9E82]" />
              Peak Energy Window
            </label>
            <p className="text-xs text-gray-600 mb-4">
              Subjects with high difficulty (rating 7–10) are prioritized into this window.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {peakOptions.map((opt) => {
                const isSelected = peakEnergy === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`btn-peak-${opt.id.toLowerCase()}`}
                    type="button"
                    onClick={() => setPeakEnergy(opt.id)}
                    className={`relative text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2E9E82] bg-emerald-50/60 shadow-sm ring-1 ring-[#2E9E82]'
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-gray-100 border border-gray-200">
                        {opt.icon}
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#2E9E82] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      {opt.title}
                    </div>
                    <div className="text-[11px] font-mono text-gray-600 mt-0.5">
                      {opt.timeWindow}
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              id="btn-save-onboarding"
              type="submit"
              disabled={isSaving}
              className="py-3 px-8 rounded-full bg-[#111111] hover:bg-gray-800 text-white text-sm font-semibold tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isSaving ? 'Calibrating...' : 'Initialize AI Schedule'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
