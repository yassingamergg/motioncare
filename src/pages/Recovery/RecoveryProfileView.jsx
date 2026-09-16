import React, { useState, useEffect } from 'react';
import { SessionRepository } from '../../lib/supabase/sessionRepository.js';
import {
  calculateLongitudinalMetrics,
  formatTrendDataForCharts,
  getSampleRecoverySessions,
} from '../../lib/analytics/recoveryAnalytics.js';
import { RecoverySummaryCards } from '../../components/Recovery/RecoverySummaryCards.jsx';
import { FormTrendChart } from '../../components/Recovery/FormTrendChart.jsx';
import { RomTrendChart } from '../../components/Recovery/RomTrendChart.jsx';
import { PainTrajectoryChart } from '../../components/Recovery/PainTrajectoryChart.jsx';
import { SessionHistoryList } from '../../components/Recovery/SessionHistoryList.jsx';
import { ClinicalDisclaimer } from '../../components/Common/ClinicalDisclaimer.jsx';
import { ClinicalSummaryModal } from '../../components/AI/ClinicalSummaryModal.jsx';
import { Dumbbell, LineChart, Sparkles, RefreshCw, UserCheck, Stethoscope, ArrowRight, Database } from 'lucide-react';

export function RecoveryProfileView({ onSwitchToLiveSession }) {
  const [realSessions, setRealSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useSampleData, setUseSampleData] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Fetch recorded sessions from vault
  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const history = await SessionRepository.getSessionHistory();
      setRealSessions(history || []);
      // If user has zero recorded sessions, default to sample data so they see the full charts immediately
      if (!history || history.length === 0) {
        setUseSampleData(true);
      }
    } catch (err) {
      console.error('[MotionCare] Error loading session history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleClearHistory = async () => {
    await SessionRepository.clearHistory();
    await loadSessions();
  };

  // Determine active dataset
  const activeSessions = useSampleData ? getSampleRecoverySessions() : realSessions;
  const metrics = calculateLongitudinalMetrics(activeSessions);
  const chartData = formatTrendDataForCharts(activeSessions);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Recovery Profile Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
            <LineChart className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Patient Longitudinal Recovery Profile
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                Milestone 7 Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Objective biomechanical telemetry tracking knee flexion angles, form scores, and VAS discomfort reduction across physical therapy sets.
            </p>
          </div>
        </div>

        {/* Dataset Toggle & Action */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setUseSampleData(false)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                !useSampleData
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Vault ({realSessions.length})
            </button>
            <button
              onClick={() => setUseSampleData(true)}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                useSampleData
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>3-Wk Knee Cohort</span>
            </button>
          </div>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 hover:from-purple-900/90 hover:to-indigo-900/90 border border-purple-700/80 text-purple-200 font-semibold text-xs transition cursor-pointer shadow-md group"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition" />
            <span>AI Clinician SOAP Note</span>
          </button>

          <button
            onClick={onSwitchToLiveSession}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-950/50 cursor-pointer"
          >
            <Dumbbell className="w-4 h-4" />
            <span>Perform Guided Session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cohort Notice (if using sample dataset) */}
      {useSampleData && (
        <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-cyan-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Sample Clinical Cohort Active:</strong> Displaying simulated 3-week post-knee rehabilitation trajectory (10 sessions, progressing from 118° to 89° depth). Switch to &quot;My Vault&quot; to inspect your real-time camera recordings.
            </span>
          </div>
          {realSessions.length > 0 && (
            <button
              onClick={() => setUseSampleData(false)}
              className="text-cyan-400 underline hover:text-cyan-300 whitespace-nowrap cursor-pointer"
            >
              Switch to My Sessions ({realSessions.length})
            </button>
          )}
        </div>
      )}

      {/* High-Level Recovery Summary KPI Cards */}
      <RecoverySummaryCards metrics={metrics} />

      {/* Biomechanical Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Form Score Evolution */}
        <FormTrendChart data={chartData.formTrendData} />

        {/* 2. Knee Flexion ROM Progression */}
        <RomTrendChart data={chartData.romTrendData} />
      </div>

      {/* Full-width Pain Trajectory (VAS 0-10) */}
      <PainTrajectoryChart data={chartData.painTrendData} />

      {/* Session History & Rep Audit Table */}
      <SessionHistoryList
        sessions={activeSessions}
        onClearHistory={!useSampleData ? handleClearHistory : null}
      />

      {/* Medical Disclaimer */}
      <ClinicalDisclaimer />

      {/* Longitudinal AI SOAP Modal */}
      <ClinicalSummaryModal
        isOpen={isAiModalOpen}
        sessionOrMetrics={metrics}
        isLongitudinal={true}
        sessions={activeSessions}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
}
