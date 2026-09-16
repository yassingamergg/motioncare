import React, { useState, useEffect } from 'react';
import { Header } from './components/Navigation/Header.jsx';
import { PoseSessionView } from './pages/Session/PoseSessionView.jsx';
import { RecoveryProfileView } from './pages/Recovery/RecoveryProfileView.jsx';
import { CloudSettingsModal } from './components/Settings/CloudSettingsModal.jsx';
import { SessionRepository } from './lib/supabase/sessionRepository.js';
import { Activity, Dumbbell, LineChart, Stethoscope } from 'lucide-react';

export function App() {
  const [fps, setFps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [activeTab, setActiveTab] = useState('session'); // 'session' | 'recovery'
  const [sessionCount, setSessionCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync session count for navigation badges
  const refreshSessionCount = async () => {
    try {
      const history = await SessionRepository.getSessionHistory();
      if (history) setSessionCount(history.length);
    } catch (err) {
      console.error('[MotionCare] Error reading session count:', err);
    }
  };

  useEffect(() => {
    refreshSessionCount();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Clinical Navbar with View Switcher & Settings */}
      <Header
        isTracking={isTracking}
        fps={fps}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          refreshSessionCount();
        }}
        sessionCount={sessionCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Protocol Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              {activeTab === 'session' ? <Dumbbell className="w-6 h-6" /> : <LineChart className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {activeTab === 'session' ? 'Bodyweight Squat Protocol' : 'Patient Recovery Trajectory'}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300">
                  {activeTab === 'session' ? 'Target: 90° Flexion' : `${sessionCount} Sessions Recorded`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'session'
                  ? 'Prescribed Rehabilitation • Lower-Extremity Functional Mobility & Stability'
                  : 'Longitudinal Telemetry • Range of Motion, Form Scores & Discomfort Mitigation'}
              </p>
            </div>
          </div>

          {/* Milestone Navigation Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Milestone 8: Real-Time Voice Coaching Active</span>
            </div>
          </div>
        </div>

        {/* View Routing */}
        {activeTab === 'session' ? (
          <PoseSessionView
            onFpsUpdate={(newFps) => {
              setFps(newFps);
              setIsTracking(newFps > 0);
            }}
          />
        ) : (
          <RecoveryProfileView
            onSwitchToLiveSession={() => {
              setActiveTab('session');
              refreshSessionCount();
            }}
          />
        )}
      </main>

      {/* Cloud & AI Settings Modal */}
      <CloudSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={refreshSessionCount}
      />

      {/* Professional Clinical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <span>MotionCare AI Platform v0.1.0 • Client-side BlazePose Engine</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Privacy-Preserving On-Device CV</span>
            <span>•</span>
            <span>Vercel-Compatible Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
