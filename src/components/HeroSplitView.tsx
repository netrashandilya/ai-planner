import React, { useState } from 'react';
import { UserProfile, StudyTask, Subject } from '../types';
import { CheckCircle2, Sparkles, Box, Terminal, Calendar, Layers, BookOpen, Clock, ArrowRight, Sun, Sunset, Moon } from 'lucide-react';

interface HeroSplitViewProps {
  user: UserProfile | null;
  tasks: StudyTask[];
  subjects: Subject[];
  activeTab: 'daily' | 'weekly' | 'subjects';
  onSelectTab: (tab: 'daily' | 'weekly' | 'subjects') => void;
  onOpenEngineModal: () => void;
  onPrimaryCtaClick: () => void;
  onEditPreferences?: () => void;
  onLogout?: () => void;
}

export const HeroSplitView: React.FC<HeroSplitViewProps> = ({
  user,
  tasks,
  subjects,
  activeTab,
  onSelectTab,
  onOpenEngineModal,
  onPrimaryCtaClick,
  onEditPreferences,
  onLogout
}) => {
  // 3D rendering mode toggle: 'css' (Tailwind isometric approximation) vs 'spline' (Placeholder slot for Spline/Three.js)
  const [renderMode3D, setRenderMode3D] = useState<'css' | 'spline'>('css');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.date === todayStr);
  const sampleTasks = todayTasks.length > 0 ? todayTasks.slice(0, 3) : tasks.slice(0, 3);

  const getPeakEnergyIcon = () => {
    switch (user?.peakEnergyTime) {
      case 'Morning':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'Afternoon':
        return <Sunset className="w-3.5 h-3.5 text-orange-500" />;
      case 'Night':
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="w-full flex flex-col font-sans">
      
      {/* =========================================================================
          UPPER SECTION: PURE WHITE CANVAS (#FFFFFF)
          ========================================================================= */}
      <section className="w-full bg-[#FFFFFF] text-[#111111] pt-6 pb-14 sm:pb-18 px-4 sm:px-8 lg:px-14 border-b border-[#E5E7EB] transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col justify-between min-h-[480px]">
          
          {/* 1. TOP HEADER BAR */}
          <header className="w-full flex items-center justify-between gap-4 pb-12">
            
            {/* Left Brand Mark: Abstract dual-ring/capsule geometric icon + lowercase bold wordmark */}
            <div className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="flex items-center">
                {/* Abstract dual-ring/capsule geometric icon */}
                <svg className="w-8 h-8 text-[#111111]" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer capsule ring */}
                  <rect x="3" y="9" width="18" height="18" rx="9" stroke="currentColor" strokeWidth="3" className="text-[#111111]" />
                  {/* Interlocking offset teal capsule ring */}
                  <rect x="15" y="9" width="18" height="18" rx="9" stroke="#2E9E82" strokeWidth="3" className="opacity-90" />
                  {/* Inner focal core */}
                  <circle cx="12" cy="18" r="2.5" fill="#111111" />
                  <circle cx="24" cy="18" r="2.5" fill="#2E9E82" />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#111111] font-sans lowercase">
                planwise
              </span>
            </div>

            {/* Center Floating Nav Pill: Minimalist links separated by vertical pipe dividers (|) */}
            <nav className="hidden md:flex items-center rounded-full bg-gray-100/90 border border-gray-200/60 px-6 py-2 shadow-xs backdrop-blur-xs">
              <button
                id="hero-nav-daily"
                type="button"
                onClick={() => onSelectTab('daily')}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  activeTab === 'daily' ? 'text-[#111111] font-bold' : 'text-gray-600 hover:text-black'
                }`}
              >
                Daily Schedule
              </button>

              <span className="text-gray-300 select-none px-2 font-light">|</span>

              <button
                id="hero-nav-weekly"
                type="button"
                onClick={() => onSelectTab('weekly')}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  activeTab === 'weekly' ? 'text-[#111111] font-bold' : 'text-gray-600 hover:text-black'
                }`}
              >
                7-Day Grid
              </button>

              <span className="text-gray-300 select-none px-2 font-light">|</span>

              <button
                id="hero-nav-subjects"
                type="button"
                onClick={() => onSelectTab('subjects')}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  activeTab === 'subjects' ? 'text-[#111111] font-bold' : 'text-gray-600 hover:text-black'
                }`}
              >
                Subjects ({subjects.length})
              </button>

              <span className="text-gray-300 select-none px-2 font-light">|</span>

              <button
                id="hero-nav-engine"
                type="button"
                onClick={onOpenEngineModal}
                className="text-xs font-semibold px-2 py-0.5 text-gray-600 hover:text-[#2E9E82] transition-colors flex items-center gap-1"
              >
                <Terminal className="w-3 h-3 text-[#2E9E82]" />
                <span>Python Engine</span>
              </button>
            </nav>

            {/* Right Navigation Action: Rounded pill button in teal */}
            <div className="flex items-center gap-3">
              {user && (
                <button
                  type="button"
                  onClick={onEditPreferences}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  title="Adjust Peak Energy Preferences"
                >
                  {getPeakEnergyIcon()}
                  <span>{user.peakEnergyTime} Peak</span>
                </button>
              )}

              <button
                id="btn-hero-action"
                type="button"
                onClick={user ? onPrimaryCtaClick : onPrimaryCtaClick}
                className="rounded-full px-6 py-2.5 bg-[#2E9E82] text-white font-medium text-sm hover:bg-[#25856e] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                {user ? 'Open Planner' : 'Get Started'}
              </button>
            </div>

          </header>

          {/* 2. HERO GRID (TWO COLUMNS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-end pt-4 sm:pt-6">
            
            {/* Left Column: Extra-large display headline & bottom feature checklist */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8 sm:space-y-10">
              <h1 className="font-bold tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[1.05] text-[#111111] max-w-2xl">
                Smart study planning, calculated.
              </h1>

              {/* Bottom horizontal feature checklist: 2 to 3 compact items prefixed with green CheckCircle2 */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">
                    (Diff × 10) ÷ Days Priority Formula
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">
                    15% Buffer Free-Time Reservation
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">
                    Dynamic Missed-Hour Redistribution
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column (Aligned with bottom of headline): Tight bold paragraph & primary CTA */}
            <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-end space-y-6">
              <div className="max-w-sm space-y-6">
                <p className="text-lg md:text-xl font-semibold leading-snug text-gray-900">
                  AI-powered study blocks scheduled around your peak energy windows, with automatic redistribution of missed sessions into preserved buffer hours.
                </p>

                {/* Primary CTA Button: fully rounded pill */}
                <button
                  id="btn-hero-primary-cta"
                  type="button"
                  onClick={onPrimaryCtaClick}
                  className="rounded-full bg-black text-white px-8 py-3.5 text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98] inline-flex items-center gap-2.5 cursor-pointer"
                >
                  <span>{user ? 'View Today’s Schedule' : 'Start Planning Free'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          BOTTOM SECTION: SOLID EMERALD/MINT-TEAL 3D CANVAS (#2E9E82)
          Takes up 35% - 45% of viewport height
          ========================================================================= */}
      <section 
        className="w-full bg-[#2E9E82] text-white relative overflow-hidden py-10 sm:py-14 px-4 sm:px-8 lg:px-14 min-h-[380px] lg:min-h-[440px] flex flex-col justify-between"
        style={{ backgroundColor: '#2E9E82' }}
      >
        {/* Subtle radial lighting overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.18)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.14)_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col justify-between h-full space-y-8">
          
          {/* Top-Left Status Badge & 3D Mode Toggle */}
          <div className="w-full flex items-center justify-between flex-wrap gap-3">
            
            {/* Top-Left Status Badge */}
            <div className="backdrop-blur-md bg-white/20 border border-white/25 rounded-full px-4 py-1.5 text-xs text-white font-medium inline-flex items-center gap-2.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shrink-0"></span>
              <span>• Powered by: PlanWise Python Engine &amp; Firestore</span>
            </div>

            {/* 3D Treatment Toggle (Pure Tailwind/CSS 3D vs Three.js/Spline Slot) */}
            <div className="backdrop-blur-md bg-black/15 border border-white/20 rounded-full p-1 flex items-center gap-1 text-[11px] font-medium text-white/90">
              <button
                type="button"
                onClick={() => setRenderMode3D('css')}
                className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  renderMode3D === 'css' ? 'bg-white text-[#2E9E82] font-semibold shadow-xs' : 'hover:text-white'
                }`}
              >
                Isometric Torus 3D
              </button>
              <button
                type="button"
                onClick={() => setRenderMode3D('spline')}
                className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  renderMode3D === 'spline' ? 'bg-white text-[#2E9E82] font-semibold shadow-xs' : 'hover:text-white'
                }`}
              >
                Spline / Three.js Slot
              </button>
            </div>

          </div>

          {/* 3D GRAPHIC TREATMENT: Tilted Isometric Cylindrical Rings & Torus Shapes */}
          <div className="w-full relative min-h-[220px] sm:min-h-[260px] flex items-center justify-between">
            
            {renderMode3D === 'css' ? (
              /* Pure Tailwind/CSS 3D Approximation using tilted ellipses with thick borders & 3D transforms */
              <div className="w-full h-full relative flex items-center justify-center lg:justify-between">
                
                {/* Left Floating Interactive Study Schedule Hologram */}
                <div className="hidden md:flex flex-col gap-2.5 max-w-xs z-20">
                  <div className="text-[11px] font-mono tracking-wider uppercase text-white/80 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Live Adaptive Session Queue</span>
                  </div>

                  {sampleTasks.slice(0, 2).map((st, idx) => (
                    <div 
                      key={st.id || idx} 
                      className="backdrop-blur-md bg-white/15 border border-white/25 rounded-xl p-3.5 shadow-lg text-white transform hover:-translate-y-1 transition-transform"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold">{st.subjectName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                          {st.startTime.slice(11, 16)} - {st.endTime.slice(11, 16)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/80">
                        <span>{st.durationHours}h block</span>
                        <span className="text-emerald-200 font-medium">
                          {st.isPeakEnergy ? '★ Peak Energy Window' : 'Standard Window'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Center / Right: Isometric Floating Torus Rings & Cylinders with realistic drop-shadow-2xl */}
                <div className="relative w-full max-w-xl h-64 flex items-center justify-center perspective-1000">
                  
                  {/* Primary Large Tilted Isometric Torus Ring */}
                  <div 
                    className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border-[18px] sm:border-[22px] border-white/85 drop-shadow-2xl animate-float-isometric-1 preserve-3d"
                    style={{
                      boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.45), inset 0 10px 20px rgba(255, 255, 255, 0.6), inset 0 -10px 20px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    {/* Inner concentric ring highlight */}
                    <div className="w-full h-full rounded-full border-4 border-emerald-100/40 opacity-75" />
                  </div>

                  {/* Secondary Tilted Intersecting Ring */}
                  <div 
                    className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-[14px] sm:border-[18px] border-white/60 drop-shadow-2xl animate-float-isometric-2 preserve-3d -right-2 sm:right-12"
                    style={{
                      boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.4), inset 0 8px 16px rgba(255, 255, 255, 0.5)',
                    }}
                  />

                  {/* Tertiary Smaller Floating Floating Ring */}
                  <div 
                    className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[10px] sm:border-[14px] border-emerald-100/90 drop-shadow-2xl animate-float-isometric-3 preserve-3d -left-2 sm:left-10"
                    style={{
                      boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.35), inset 0 6px 12px rgba(255, 255, 255, 0.7)',
                    }}
                  />

                  {/* Central Geometric Core Sphere / Floating Accent */}
                  <div 
                    className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-white via-emerald-100 to-teal-50 drop-shadow-2xl z-10 flex items-center justify-center text-[#2E9E82] font-bold text-xs sm:text-sm font-mono shadow-2xl"
                    style={{
                      boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.4), inset 0 4px 8px rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    PW
                  </div>

                </div>

                {/* Right Stat Chip on Desktop */}
                <div className="hidden xl:flex flex-col gap-2 text-right z-20">
                  <span className="text-3xl font-bold font-mono tracking-tight">15%</span>
                  <span className="text-xs text-white/80 max-w-[130px]">
                    Preserved buffer time for autonomous recovery
                  </span>
                </div>

              </div>
            ) : (
              /* Three.js / Spline 3D Canvas Placeholder Slot */
              <div className="w-full h-56 sm:h-64 rounded-2xl border-2 border-dashed border-white/40 bg-white/10 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3 drop-shadow-2xl">
                <Box className="w-10 h-10 text-white animate-bounce" />
                <div>
                  <h3 className="text-base font-bold text-white">Three.js / Spline 3D Scene Slot</h3>
                  <p className="text-xs text-white/80 max-w-md mt-1">
                    Ready to embed dynamic Spline 3D exports (<code className="bg-black/20 px-1.5 py-0.5 rounded font-mono">@splinetool/react-spline</code>) or interactive Three.js WebGL canvas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRenderMode3D('css')}
                  className="px-4 py-1.5 rounded-full bg-white text-[#2E9E82] text-xs font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  Switch Back to CSS Isometric Rings
                </button>
              </div>
            )}

          </div>

          {/* Quick Nav Anchor Footer inside Teal Canvas */}
          <div className="flex items-center justify-between text-xs text-white/80 pt-2 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Next Peak Window: <strong>{user?.peakEnergyTime || 'Morning'} (08:00 - 12:00)</strong></span>
            </div>

            <button
              type="button"
              onClick={onPrimaryCtaClick}
              className="hover:text-white underline underline-offset-4 flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Jump to Interactive Study Blocks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
