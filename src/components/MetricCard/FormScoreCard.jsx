import React, { useState } from 'react';
import { Award, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, ShieldAlert, Sparkles } from 'lucide-react';

export function FormScoreCard({
  formAnalysis,
  liveFeedback,
  repsCount = 0,
}) {
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // If no rep has been evaluated yet, show ready / baseline state
  const hasAnalysis = formAnalysis && formAnalysis.overallScore != null;

  const {
    overallScore = 85,
    depthScore = 85,
    alignmentScore = 85,
    controlScore = 85,
    consistencyScore = 85,
    prioritizedFeedback = null,
    allFeedback = [],
  } = formAnalysis || {};

  // Active message to display: prioritized feedback from last rep, or live feedback
  const activeFeedback = prioritizedFeedback || (liveFeedback ? {
    severity: liveFeedback.severity,
    message: liveFeedback.message,
    type: 'live',
  } : {
    severity: 'info',
    message: 'Perform a squat repetition to generate Form Score.',
    type: 'baseline',
  });

  // Color coding by score threshold
  const getScoreColor = (val) => {
    if (val >= 85) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
    if (val >= 70) return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40';
    return 'text-amber-400 border-amber-500/50 bg-amber-950/40';
  };

  const getBarColor = (val) => {
    if (val >= 85) return 'bg-emerald-400';
    if (val >= 70) return 'bg-cyan-400';
    return 'bg-amber-400';
  };

  const severityStyles = {
    warning: {
      card: 'bg-amber-950/60 border-amber-700/80 text-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
      badge: 'bg-amber-950 text-amber-300 border-amber-700',
    },
    success: {
      card: 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    },
    info: {
      card: 'bg-slate-950/60 border-slate-700/80 text-slate-300',
      icon: <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />,
      badge: 'bg-slate-900 text-slate-300 border-slate-700',
    },
  };

  const currentSev = severityStyles[activeFeedback.severity] || severityStyles.info;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-700 flex items-center justify-center text-teal-300">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 text-sm tracking-tight">
              MotionCare Form Score
            </h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">
              Assistive Biomechanical Model
            </span>
          </div>
        </div>

        {/* Prototype label */}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
          Non-Clinical Prototype
        </span>
      </div>

      {/* Main Score Display & Radial / Number */}
      <div className="grid grid-cols-12 gap-4 items-center bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
        {/* Left: Overall Score Circle */}
        <div className="col-span-5 flex flex-col items-center justify-center text-center border-r border-slate-800 pr-2">
          <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg ${getScoreColor(hasAnalysis ? overallScore : 85)}`}>
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {hasAnalysis ? `${overallScore}%` : '--'}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
              Overall Form
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-medium">
            {repsCount > 0 ? `Evaluated on Rep #${formAnalysis?.repIndex || repsCount}` : 'Awaiting 1st Rep'}
          </span>
        </div>

        {/* Right: Sub-Score Breakdown Bars */}
        <div className="col-span-7 flex flex-col gap-2 pl-1">
          {/* Depth */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">Squat Depth</span>
              <span className="font-mono font-semibold text-slate-200">
                {hasAnalysis ? `${depthScore}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(depthScore)}`}
                style={{ width: `${hasAnalysis ? depthScore : 0}%` }}
              />
            </div>
          </div>

          {/* Alignment */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">Knee & Torso Alignment</span>
              <span className="font-mono font-semibold text-slate-200">
                {hasAnalysis ? `${alignmentScore}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(alignmentScore)}`}
                style={{ width: `${hasAnalysis ? alignmentScore : 0}%` }}
              />
            </div>
          </div>

          {/* Control */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">Tempo & Control</span>
              <span className="font-mono font-semibold text-slate-200">
                {hasAnalysis ? `${controlScore}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(controlScore)}`}
                style={{ width: `${hasAnalysis ? controlScore : 0}%` }}
              />
            </div>
          </div>

          {/* Consistency */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">Rep Consistency</span>
              <span className="font-mono font-semibold text-slate-200">
                {hasAnalysis ? `${consistencyScore}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(consistencyScore)}`}
                style={{ width: `${hasAnalysis ? consistencyScore : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Prioritized Single Correction Banner */}
      <div className={`rounded-xl p-3.5 border text-xs flex items-start gap-2.5 transition ${currentSev.card}`}>
        {currentSev.icon}
        <div className="flex-1">
          <div className="font-semibold text-[11px] uppercase tracking-wider mb-0.5 opacity-90">
            {activeFeedback.severity === 'warning'
              ? 'Assistive Form Correction'
              : activeFeedback.severity === 'success'
              ? 'Movement Quality'
              : 'Kinematic Observation'}
          </div>
          <div className="leading-snug">{activeFeedback.message}</div>
        </div>
      </div>

      {/* Expandable audit log for all detected rules */}
      {allFeedback.length > 1 && (
        <div className="border-t border-slate-800 pt-2">
          <button
            onClick={() => setShowAllAlerts((prev) => !prev)}
            className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
          >
            <span>Secondary Observations ({allFeedback.length - 1})</span>
            {showAllAlerts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAllAlerts && (
            <div className="mt-2 space-y-1.5">
              {allFeedback.slice(1).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 text-[11px] text-slate-300 flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
