/**
 * PlanWise AI - AI-Powered Study Planner
 * Dual-Tone Split Canvas Architecture
 * Hackathon Edition
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, Subject, StudyTask } from './types';
import { planWiseStore } from './firebase/config';
import { HeroSplitView } from './components/HeroSplitView';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { DailyDashboard } from './components/DailyDashboard';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { SubjectsManager } from './components/SubjectsManager';
import { CodeEngineModal } from './components/CodeEngineModal';
import { Calendar, Layers, BookOpen, Terminal, Sparkles, LogOut, Sliders, Shield } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => planWiseStore.getUser());
  const [subjects, setSubjects] = useState<Subject[]>(() => planWiseStore.getSubjects());
  const [tasks, setTasks] = useState<StudyTask[]>(() => planWiseStore.getTasks());
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [showEngineModal, setShowEngineModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'subjects'>('daily');

  // Sync with reactive store (real-time listener)
  useEffect(() => {
    const unsubscribe = planWiseStore.subscribe(() => {
      setUser(planWiseStore.getUser());
      setSubjects(planWiseStore.getSubjects());
      setTasks(planWiseStore.getTasks());
    });
    return () => unsubscribe();
  }, []);

  // Initial schedule auto-generation if tasks are empty
  useEffect(() => {
    if (user && subjects.length > 0 && tasks.length === 0) {
      fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, subjects })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.tasks) {
            planWiseStore.setTasks(data.tasks);
          }
        })
        .catch(err => console.warn("Initial auto-generation fallback:", err));
    }
  }, [user, subjects]);

  const handleAuthenticated = (authUser: UserProfile, isNewUser: boolean) => {
    setUser(authUser);
    if (isNewUser || !authUser.studyHoursPerDay) {
      setIsOnboarding(true);
    } else {
      setIsOnboarding(false);
    }
  };

  const handleOnboardingComplete = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setIsOnboarding(false);
  };

  const handleLogout = () => {
    planWiseStore.setUser(null);
    setUser(null);
    setIsOnboarding(false);
  };

  const scrollToWorkspace = () => {
    const el = document.getElementById('planner-workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToAuth = () => {
    const el = document.getElementById('auth-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans antialiased flex flex-col selection:bg-teal-100 selection:text-teal-900">
      
      {/* 
        =======================================================================
        DUAL-TONE SPLIT CANVAS HERO
        - Upper Section: Pure White (#FFFFFF)
        - Lower Section: Solid Emerald/Mint-Teal (#2E9E82) with 3D Isometric Torus
        =======================================================================
      */}
      <HeroSplitView
        user={user}
        tasks={tasks}
        subjects={subjects}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (user) scrollToWorkspace();
          else scrollToAuth();
        }}
        onOpenEngineModal={() => setShowEngineModal(true)}
        onPrimaryCtaClick={() => {
          if (!user) scrollToAuth();
          else scrollToWorkspace();
        }}
        onEditPreferences={() => setIsOnboarding(true)}
        onLogout={handleLogout}
      />

      {/* 
        =======================================================================
        INTERACTIVE APPLICATION WORKSPACE
        =======================================================================
      */}
      <div className="w-full bg-[#F9FAFB] border-t border-[#E5E7EB] flex-1">
        
        {!user ? (
          /* Step 1: Authentication View */
          <section id="auth-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center max-w-md mx-auto mb-6">
              <span className="text-xs font-semibold text-[#2E9E82] uppercase tracking-wider">
                Get Started with PlanWise
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-[#111111] mt-1">
                Access your Personalized Schedule
              </h2>
            </div>
            <AuthScreen onAuthenticated={handleAuthenticated} />
          </section>
        ) : isOnboarding ? (
          /* Step 1: Onboarding View */
          <section id="onboarding-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <OnboardingScreen user={user} onComplete={handleOnboardingComplete} />
          </section>
        ) : (
          /* Dashboard & Planner Workspace */
          <section id="planner-workspace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
            
            {/* User Session Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-800 text-sm">
                  {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    {user.displayName || user.email}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                    <span>Target: <strong>{user.studyHoursPerDay} hrs/day</strong></span>
                    <span>•</span>
                    <span>Peak: <strong>{user.peakEnergyTime}</strong></span>
                    <span>•</span>
                    <span className="text-[#2E9E82] font-medium">15% Free Buffer Protected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboarding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust Constraints</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* View Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-3">
              <div className="flex items-center gap-1.5 p-1 rounded-full bg-gray-100 border border-gray-200">
                <button
                  id="nav-tab-daily"
                  onClick={() => setActiveTab('daily')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'daily'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Daily Schedule</span>
                </button>

                <button
                  id="nav-tab-weekly"
                  onClick={() => setActiveTab('weekly')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'weekly'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>7-Day Grid</span>
                </button>

                <button
                  id="nav-tab-subjects"
                  onClick={() => setActiveTab('subjects')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'subjects'
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Subjects ({subjects.length})</span>
                </button>
              </div>

              {/* Engine Spec Badges */}
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                <span className="hidden sm:inline">Engine Constraints:</span>
                <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-700 font-medium text-[11px]">
                  (Diff × 10) ÷ Days_Remaining
                </span>
                <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium text-[11px]">
                  15% Buffer
                </span>
              </div>
            </div>

            {/* Active Tab Views */}
            {activeTab === 'daily' && (
              <div className="space-y-8">
                <DailyDashboard
                  user={user}
                  subjects={subjects}
                  tasks={tasks}
                  onTasksUpdated={(newTasks) => setTasks(newTasks)}
                  onOpenEngineModal={() => setShowEngineModal(true)}
                />
                <SubjectsManager
                  userId={user.uid}
                  subjects={subjects}
                  onSubjectsUpdated={() => setSubjects(planWiseStore.getSubjects())}
                  onTriggerReschedule={() => {}}
                />
              </div>
            )}

            {activeTab === 'weekly' && (
              <div className="space-y-8">
                <WeeklyScheduleView tasks={tasks} user={user} />
                <DailyDashboard
                  user={user}
                  subjects={subjects}
                  tasks={tasks}
                  onTasksUpdated={(newTasks) => setTasks(newTasks)}
                  onOpenEngineModal={() => setShowEngineModal(true)}
                />
              </div>
            )}

            {activeTab === 'subjects' && (
              <SubjectsManager
                userId={user.uid}
                subjects={subjects}
                onSubjectsUpdated={() => setSubjects(planWiseStore.getSubjects())}
                onTriggerReschedule={() => {}}
              />
            )}

          </section>
        )}

      </div>

      {/* 
        =======================================================================
        CLEAN MINIMAL FOOTER
        =======================================================================
      */}
      <footer className="border-t border-gray-200 bg-white py-8 text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-900 lowercase tracking-tight">planwise</span>
            <span>—</span>
            <span>AI-Powered Study Planner with Dynamic Workload Redistribution</span>
          </div>

          <div className="flex items-center gap-4 text-gray-600">
            <span>Firebase Auth &amp; Firestore</span>
            <span>•</span>
            <span>Python 3.10 Antigravity Engine</span>
            <span>•</span>
            <button
              onClick={() => setShowEngineModal(true)}
              className="text-[#2E9E82] font-semibold hover:underline cursor-pointer"
            >
              Inspect Source &amp; Schema
            </button>
          </div>
        </div>
      </footer>

      {/* Code and Schema Inspector Modal */}
      <CodeEngineModal
        isOpen={showEngineModal}
        onClose={() => setShowEngineModal(false)}
      />

    </div>
  );
}
