import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, Terminal, LogOut, Sun, Sunset, Moon, Code2, RefreshCw } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onOpenEngineModal: () => void;
  onLogout: () => void;
  onResetDemo: () => void;
  onEditPreferences: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenEngineModal,
  onLogout,
  onResetDemo,
  onEditPreferences
}) => {
  const getPeakIcon = () => {
    switch (user?.peakEnergyTime) {
      case 'Morning':
        return <Sun className="w-3.5 h-3.5 text-zinc-100" />;
      case 'Afternoon':
        return <Sunset className="w-3.5 h-3.5 text-zinc-100" />;
      case 'Night':
        return <Moon className="w-3.5 h-3.5 text-zinc-100" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-zinc-100" />;
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold font-mono text-sm tracking-wider shadow-sm">
            PW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-100 font-mono">
                planwise AI
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400">
                Hackathon Build
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              AI-Powered Monochromatic Study Schedule Engine
            </p>
          </div>
        </div>

        {/* Actions & User State */}
        <div className="flex items-center gap-2.5">
          {user && (
            <>
              {/* Peak Energy Indicator */}
              <button
                id="btn-edit-preferences"
                onClick={onEditPreferences}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-300 hover:border-zinc-700 transition-colors"
                title="Click to adjust study preferences"
              >
                {getPeakIcon()}
                <span>{user.peakEnergyTime} Peak</span>
                <span className="text-zinc-500">•</span>
                <span>{user.studyHoursPerDay}h/day</span>
              </button>

              {/* Code & Engine Inspector Modal Trigger */}
              <button
                id="btn-open-engine-modal"
                onClick={onOpenEngineModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-200 transition-colors"
                title="View Firestore Schema & Python Scheduler Source"
              >
                <Terminal className="w-3.5 h-3.5 text-zinc-300" />
                <span className="hidden sm:inline">Engine &amp; Schema</span>
              </button>

              {/* Reset Data */}
              <button
                id="btn-reset-demo"
                onClick={onResetDemo}
                className="p-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                title="Reset sample subjects and tasks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* User Dropdown / Sign Out */}
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <span className="text-xs text-zinc-400 font-mono hidden lg:inline truncate max-w-[140px]">
                  {user.email}
                </span>
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-1.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
