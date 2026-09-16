import React from 'react';
import { Award, Compass, TrendingUp, TrendingDown, Minus, CheckCircle, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

export function RecoverySummaryCards({ metrics }) {
  const {
    totalSessions = 0,
    totalReps = 0,
    formattedTotalDuration = '00:00',
    averageFormScore = 0,
    latestFormScore = 0,
    formScoreDelta = 0,
    latestDepth = 0,
    depthImprovementDelta = 0,
    targetFlexionAchieved = false,
    averagePainDelta = 0,
    totalPainReduction = 0,
    recoveryStatus = 'INSUFFICIENT_DATA',
    recoveryMessage = '',
  } = metrics || {};

  const statusConfig = {
    PROGRESSING_WELL: {
      label: 'Progressing Well',
      color: 'bg-emerald-950/80 border-emerald-700 text-emerald-300',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    },
    STEADY_PROGRESS: {
      label: 'Steady Progress',
      color: 'bg-cyan-950/80 border-cyan-700 text-cyan-300',
      icon: <Activity className="w-4 h-4 text-cyan-400" />,
    },
    CONSISTENT: {
      label: 'Consistent Movement',
      color: 'bg-slate-800 border-slate-700 text-slate-300',
      icon: <CheckCircle className="w-4 h-4 text-slate-300" />,
    },
    ELEVATED_PAIN: {
      label: 'Discomfort Elevated',
      color: 'bg-amber-950/80 border-amber-700 text-amber-300',
      icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
    },
    INSUFFICIENT_DATA: {
      label: 'Baseline Gathering',
      color: 'bg-slate-800/80 border-slate-700 text-slate-400',
      icon: <Minus className="w-4 h-4 text-slate-400" />,
    },
  };

  const statusInfo = statusConfig[recoveryStatus] || statusConfig.CONSISTENT;

  return (
    <div className="flex flex-col gap-4">
      {/* Clinical Trajectory Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${statusInfo.color}`}>
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {recoveryMessage}
          </p>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Clinical Recovery Index • Objective CV Telemetry
        </div>
      </div>

      {/* 4 Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Rehabilitation Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-medium">Total Rehab Volume</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalSessions}</span>
              <span className="text-xs text-slate-400">Sessions</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span>{totalReps} Total Reps</span>
              <span className="font-mono text-slate-500">{formattedTotalDuration} Active</span>
            </div>
          </div>
        </div>

        {/* 2. MotionCare Form Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-medium">Mean Form Quality</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{averageFormScore}%</span>
              {formScoreDelta !== 0 && (
                <span className={`text-xs font-semibold flex items-center ${
                  formScoreDelta > 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {formScoreDelta > 0 ? '+' : ''}{formScoreDelta}%
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span>Latest: <strong className="text-slate-200">{latestFormScore}%</strong></span>
              <span className="text-slate-500">Benchmark: 85%+</span>
            </div>
          </div>
        </div>

        {/* 3. Knee Flexion ROM Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-medium">Knee Flexion Depth</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-cyan-300">{latestDepth > 0 ? `${latestDepth}°` : '—'}</span>
              {depthImprovementDelta > 0 && (
                <span className="text-xs font-semibold text-emerald-400">
                  +{depthImprovementDelta}° depth
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span>Target: <strong className="text-slate-200">90°</strong></span>
              <span className={targetFlexionAchieved ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                {targetFlexionAchieved ? 'Target Achieved' : 'Approaching Target'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Pain Mitigation Delta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-medium">Pain Trajectory (VAS)</span>
            {totalPainReduction >= 0 ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {totalPainReduction > 0 ? `-${totalPainReduction}` : totalPainReduction < 0 ? `+${Math.abs(totalPainReduction)}` : '0'}
              </span>
              <span className="text-xs text-slate-400">Net VAS Delta</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span>Avg per set: <strong className="text-slate-200">{averagePainDelta > 0 ? `+${averagePainDelta}` : averagePainDelta}</strong></span>
              <span className={averagePainDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {averagePainDelta <= 0 ? 'Stable/Reduced' : 'Check Tolerances'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
