import React, { useState } from 'react';
import { Award, Clock, Dumbbell, Activity, TrendingDown, TrendingUp, Minus, CheckCircle, RotateCcw, X, ShieldAlert, Sparkles, Stethoscope } from 'lucide-react';
import { PAIN_TREND } from '../../lib/session/sessionManager';
import { ClinicalSummaryModal } from '../AI/ClinicalSummaryModal';

export function SessionSummaryModal({
  isOpen,
  sessionSummary,
  saveStatus = 'saved_local', // 'saving' | 'saved_supabase' | 'saved_local'
  onStartNewSession,
  onClose,
}) {
  const [showRepsTable, setShowRepsTable] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  if (!isOpen || !sessionSummary) return null;

  const {
    exerciseName = 'Bodyweight Squat',
    totalReps = 0,
    averageFormScore = 85,
    averageDepth = 90,
    averageControl = 85,
    formattedDuration = '00:00',
    painBefore = 0,
    painAfter = 0,
    painDelta = 0,
    painTrend = PAIN_TREND.STABLE,
    reps = [],
    completedAt = new Date().toISOString(),
  } = sessionSummary;

  // Pain trend styling
  const trendConfig = {
    [PAIN_TREND.IMPROVED]: {
      label: 'Pain Decreased (Improved)',
      color: 'text-emerald-400 bg-emerald-950/80 border-emerald-700',
      icon: <TrendingDown className="w-4 h-4 text-emerald-400" />,
    },
    [PAIN_TREND.STABLE]: {
      label: 'Pain Stable (Unchanged)',
      color: 'text-cyan-400 bg-cyan-950/80 border-cyan-700',
      icon: <Minus className="w-4 h-4 text-cyan-400" />,
    },
    [PAIN_TREND.ELEVATED]: {
      label: 'Pain Elevated (Discomfort Increased)',
      color: 'text-amber-400 bg-amber-950/80 border-amber-700',
      icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
    },
  };

  const activeTrend = trendConfig[painTrend] || trendConfig[PAIN_TREND.STABLE];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl my-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            Session Complete
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Rehabilitation Session Summary
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {exerciseName} • Completed {new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* 5 Hero Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {/* Reps Completed */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center mx-auto mb-2 text-cyan-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {totalReps}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Reps Completed</div>
          </div>

          {/* Form Score */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto mb-2 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              {averageFormScore}%
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Form Score</div>
          </div>

          {/* Average Depth */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center mx-auto mb-2 text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-200">
              {averageDepth != null ? `${averageDepth}°` : '--'}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Average Depth</div>
          </div>

          {/* Movement Control */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center col-span-1 sm:col-span-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center mx-auto mb-2 text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-300">
              {averageControl}%
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Movement Control</div>
          </div>

          {/* Duration */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center col-span-2 sm:col-span-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-2 text-slate-300">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {formattedDuration}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Total Duration</div>
          </div>
        </div>

        {/* Patient Pain Trajectory Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Reported Pain Trajectory</h3>
              <p className="text-[11px] text-slate-500">Visual Analog Scale (0–10) Before vs After Exercise</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${activeTrend.color}`}>
              {activeTrend.icon}
              <span>{activeTrend.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium block">
                Pain Before
              </span>
              <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">
                {painBefore} <span className="text-xs text-slate-500 font-normal">/ 10</span>
              </span>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium block">
                Pain After
              </span>
              <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">
                {painAfter} <span className="text-xs text-slate-500 font-normal">/ 10</span>
              </span>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium block">
                Net Delta
              </span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${
                painDelta < 0 ? 'text-emerald-400' : painDelta === 0 ? 'text-cyan-400' : 'text-amber-400'
              }`}>
                {painDelta > 0 ? `+${painDelta}` : painDelta}
              </span>
            </div>
          </div>

          {/* Clinical advisory flag if pain is high */}
          {painAfter >= 7 && (
            <div className="mt-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200">Clinical Alert: </span>
                Elevated post-exercise pain recorded ({painAfter}/10). Allow sufficient rest and bring this session history to your next physiotherapist appointment.
              </div>
            </div>
          )}
        </div>

        {/* Detailed Repetition Breakdown Accordion */}
        {reps.length > 0 && (
          <div className="mb-6 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
            <button
              onClick={() => setShowRepsTable((prev) => !prev)}
              className="w-full px-4 py-3 text-xs font-semibold text-slate-300 flex items-center justify-between hover:bg-slate-900 transition cursor-pointer"
            >
              <span>Inspect Individual Repetitions ({reps.length})</span>
              <span className="text-cyan-400 text-xs font-normal">
                {showRepsTable ? 'Hide Table' : 'Show Table'}
              </span>
            </button>

            {showRepsTable && (
              <div className="max-h-48 overflow-y-auto px-4 pb-3">
                <table className="w-full text-[11px] font-mono text-slate-400 text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-1.5">Rep</th>
                      <th>Peak Depth</th>
                      <th>Duration</th>
                      <th>Descent / Ascent</th>
                      <th>Torso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((r) => (
                      <tr key={r.repIndex} className="border-b border-slate-900">
                        <td className="py-1.5 text-cyan-400 font-bold">#{r.repIndex}</td>
                        <td className="text-slate-200">{r.maxDepth}°</td>
                        <td>{r.totalDuration}s</td>
                        <td>{r.descentDuration}s / {r.ascentDuration}s</td>
                        <td>{r.torsoLean}°</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Persistence Confirmation Badge */}
        <div className="mb-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
          <span>Storage Status:</span>
          <span className="font-mono flex items-center gap-1.5 font-semibold text-slate-300">
            {saveStatus === 'saving' && <span className="text-cyan-400 animate-pulse">Syncing session...</span>}
            {saveStatus === 'saved_supabase' && <span className="text-emerald-400">☁️ Synced to Secure Clinical Cloud</span>}
            {saveStatus === 'saved_local' && <span className="text-teal-400">💾 Stored in Local Clinical Vault</span>}
          </span>
        </div>

        {/* AI Clinician Briefing Trigger */}
        <button
          onClick={() => setIsAiModalOpen(true)}
          className="w-full mb-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 hover:from-purple-900/80 hover:to-indigo-900/80 border border-purple-800/60 text-purple-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md group"
        >
          <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
          <span>Draft Clinician Progress Note (Clinical AI SOAP)</span>
        </button>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStartNewSession}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start New Session</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Nested AI SOAP Modal */}
        <ClinicalSummaryModal
          isOpen={isAiModalOpen}
          sessionOrMetrics={sessionSummary}
          isLongitudinal={false}
          onClose={() => setIsAiModalOpen(false)}
        />
      </div>
    </div>
  );
}
