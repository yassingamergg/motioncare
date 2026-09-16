import React from 'react';
import { Activity, ShieldCheck, Cpu, Dumbbell, LineChart, Settings } from 'lucide-react';

export function Header({
  isTracking,
  fps = 0,
  activeTab = 'session',
  onTabChange,
  sessionCount = 0,
  onOpenSettings,
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-900/30 text-white font-bold">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">MotionCare</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                AI CORE
              </span>
            </div>
            <p className="text-xs text-slate-400">Computer Vision Biomechanical Rehabilitation</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        {onTabChange && (
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => onTabChange('session')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'session'
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Live Exercise</span>
            </button>
            <button
              onClick={() => onTabChange('recovery')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'recovery'
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Recovery Profile</span>
              {sessionCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-800/80 text-cyan-100 font-mono">
                  {sessionCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Clinical & Privacy status & Settings */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>On-Device Inference • Privacy Preserved</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isTracking ? `${fps} FPS` : 'STANDBY'}</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                isTracking ? 'bg-emerald-400 shadow-md shadow-emerald-500/50' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isTracking ? 'Live Tracking' : 'Standby'}
            </span>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Cloud & AI Settings (Supabase + Gemini)"
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
