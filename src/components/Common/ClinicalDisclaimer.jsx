import React from 'react';
import { AlertCircle } from 'lucide-react';

export function ClinicalDisclaimer() {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 flex items-start gap-3 shadow-inner">
      <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-slate-200">Physiotherapy Assistive Notice: </span>
        MotionCare AI calculates joint kinematics as assistive feedback for prescribed protocols.
        It does not diagnose injuries, provide medical prognoses, or replace professional clinician oversight.
      </div>
    </div>
  );
}
