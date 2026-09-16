import React, { useState } from 'react';
import { Dumbbell, RotateCcw, ChevronDown, ChevronUp, Check, Clock, Compass, Target } from 'lucide-react';
import { SQUAT_STATES } from '../../lib/exercises/squatDetector';

export function RepCounterCard({
  repSnapshot,
  onResetReps,
}) {
  const [showHistory, setShowHistory] = useState(false);

  const {
    state = SQUAT_STATES.STANDING,
    reps = 0,
    currentAngle,
    depthProgress = 0,
    feedback = 'Stand upright to begin',
    lastRep = null,
    completedReps = [],
    sessionSummary = {},
  } = repSnapshot || {};

  // State styling configuration
  const stateStyles = {
    [SQUAT_STATES.STANDING]: {
      label: 'Standing',
      badgeClass: 'bg-slate-800 border-slate-700 text-slate-300',
      dotClass: 'bg-slate-400',
    },
    [SQUAT_STATES.DESCENDING]: {
      label: 'Descending',
      badgeClass: 'bg-amber-950/80 border-amber-600 text-amber-300 animate-pulse',
      dotClass: 'bg-amber-400',
    },
    [SQUAT_STATES.BOTTOM]: {
      label: 'Target Depth',
      badgeClass: 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/50',
      dotClass: 'bg-emerald-400',
    },
    [SQUAT_STATES.ASCENDING]: {
      label: 'Ascending',
      badgeClass: 'bg-cyan-950/80 border-cyan-600 text-cyan-300',
      dotClass: 'bg-cyan-400',
    },
  };

  const activeStyle = stateStyles[state] || stateStyles[SQUAT_STATES.STANDING];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header with Rep Counter & State */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
              Squat Rep Counter
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${activeStyle.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${activeStyle.dotClass}`} />
                {activeStyle.label}
              </span>
            </div>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={onResetReps}
          title="Reset Reps"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Rep Count Display */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-medium block">Completed Reps</span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold font-mono text-white tracking-tight">
              {reps}
            </span>
            <span className="text-sm font-semibold text-slate-500">reps</span>
          </div>
        </div>

        {/* Depth Progress Meter */}
        <div className="w-36 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Depth Gauge</span>
            <span className="font-mono text-cyan-300 font-semibold">{depthProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
            <div
              className={`h-full transition-all duration-150 rounded-full ${
                depthProgress >= 100
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : depthProgress >= 70
                  ? 'bg-cyan-400'
                  : 'bg-slate-600'
              }`}
              style={{ width: `${Math.min(100, depthProgress)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 text-right">
            Target: ≤ 100°
          </div>
        </div>
      </div>

      {/* Live Assistive Cue Banner */}
      <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 flex items-center gap-2">
        <Target className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className="truncate">{feedback}</span>
      </div>

      {/* Last Completed Rep Summary */}
      {lastRep && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-2">
          <div className="text-slate-400 font-medium flex items-center justify-between">
            <span>Last Rep (#{lastRep.repIndex})</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" /> Valid Rep
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Peak Depth</span>
              <span className="font-mono font-bold text-slate-200">{lastRep.maxDepth}°</span>
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Duration</span>
              <span className="font-mono font-bold text-slate-200">{lastRep.totalDuration}s</span>
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Torso Lean</span>
              <span className="font-mono font-bold text-slate-200">{lastRep.torsoLean}°</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between px-1">
            <span>Descent: {lastRep.descentDuration}s</span>
            <span>Ascent: {lastRep.ascentDuration}s</span>
          </div>
        </div>
      )}

      {/* Session Consistency Overview (If > 1 rep) */}
      {sessionSummary?.totalReps > 1 && (
        <div className="flex items-center justify-between text-xs px-2 py-1 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-400">
          <span>Movement Consistency:</span>
          <span className="font-mono font-bold text-emerald-400">
            {sessionSummary.movementConsistency}%
          </span>
        </div>
      )}

      {/* Rep History Drawer */}
      {completedReps.length > 0 && (
        <div className="border-t border-slate-800/80 pt-2">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
          >
            <span>Repetition Log ({completedReps.length})</span>
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showHistory && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pr-1">
              {completedReps.map((r) => (
                <div
                  key={r.repIndex}
                  className="bg-slate-950/80 border border-slate-800/70 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px] font-mono"
                >
                  <span className="text-cyan-400 font-semibold">Rep #{r.repIndex}</span>
                  <span className="text-slate-300">Depth: {r.maxDepth}°</span>
                  <span className="text-slate-400">Time: {r.totalDuration}s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
