import React, { useState } from 'react';
import { Activity, ShieldAlert, ArrowRight, X } from 'lucide-react';

export function PainReportModal({
  isOpen,
  mode = 'pre', // 'pre' | 'post'
  initialScore = 0,
  onSubmit,
  onCancel,
}) {
  const [score, setScore] = useState(initialScore);

  if (!isOpen) return null;

  const isPre = mode === 'pre';

  // Pain descriptors according to standard VAS clinical scale
  const getDescriptor = (val) => {
    if (val === 0) return { label: 'No Pain', desc: 'Completely comfortable. No aches or joint restriction.', color: 'text-emerald-400', border: 'border-emerald-500' };
    if (val <= 3) return { label: 'Mild Discomfort', desc: 'Noticeable tightness or stiffness, but minimal impact.', color: 'text-teal-400', border: 'border-teal-500' };
    if (val <= 6) return { label: 'Moderate Pain', desc: 'Noticeable discomfort during movement. Tolerable but requires attention.', color: 'text-amber-400', border: 'border-amber-500' };
    return { label: 'Severe / Sharp Pain', desc: 'Significant pain. Do not push through sharp joint pain.', color: 'text-rose-400', border: 'border-rose-500' };
  };

  const descriptor = getDescriptor(score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative">
        {/* Close / Skip button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isPre ? 'bg-cyan-950/80 border-cyan-700 text-cyan-400' : 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isPre ? 'Pre-Exercise Pain Check-in' : 'Post-Exercise Pain Assessment'}
            </h2>
            <p className="text-xs text-slate-400">
              {isPre
                ? 'Establish your baseline joint & muscle pain before starting.'
                : 'Report your pain level immediately following the exercise set.'}
            </p>
          </div>
        </div>

        {/* Big Numeric Score Display */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 mb-5 text-center">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Visual Analog Scale (VAS 0–10)
          </span>
          <div className="flex items-baseline justify-center gap-2">
            <span className={`text-6xl font-extrabold font-mono tracking-tight ${descriptor.color}`}>
              {score}
            </span>
            <span className="text-slate-500 text-sm font-semibold">/ 10</span>
          </div>

          <div className="mt-3">
            <span className={`text-sm font-bold block ${descriptor.color}`}>
              {descriptor.label}
            </span>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {descriptor.desc}
            </p>
          </div>
        </div>

        {/* Number Selector Pills */}
        <div className="mb-6">
          <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-2 px-1">
            <span>0 = No Pain</span>
            <span>5 = Moderate</span>
            <span>10 = Severe</span>
          </div>
          <div className="grid grid-cols-11 gap-1.5">
            {Array.from({ length: 11 }, (_, i) => i).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setScore(num)}
                className={`py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                  score === num
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 scale-105'
                    : 'bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Clinical advisory notice for high pain */}
        {score >= 7 && (
          <div className="mb-5 bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">High Pain Reported: </span>
              If you experience sharp or escalating joint pain, do not force the movement.
              Take a rest interval and consult your physiotherapist.
            </div>
          </div>
        )}

        {/* Submit Action */}
        <button
          onClick={() => onSubmit(score)}
          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{isPre ? 'Confirm Baseline & Start Session' : 'Record Pain & View Summary'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
