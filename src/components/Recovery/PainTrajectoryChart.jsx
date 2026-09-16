import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { HeartPulse } from 'lucide-react';
import { PAIN_TREND } from '../../lib/session/sessionManager.js';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const delta = data.painDelta;
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
          {data.fullLabel || `Session ${label}`}
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-300">
          <span>Pre-Exercise Baseline:</span>
          <span className="font-bold">{data.painBefore} / 10 VAS</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-cyan-300">
          <span>Post-Exercise Discomfort:</span>
          <span className="font-bold">{data.painAfter} / 10 VAS</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
          <span>Net Discomfort Delta:</span>
          <span
            className={`font-bold ${
              delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {delta > 0 ? `+${delta}` : delta} VAS
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function PainTrajectoryChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] text-center text-slate-500 text-xs">
        <HeartPulse className="w-8 h-8 text-slate-700 mb-2" />
        <p>No VAS pain tracking history recorded yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">Report pre/post scores to track discomfort mitigation.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-400" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Pain Trajectory (VAS 0–10)</h3>
            <p className="text-xs text-slate-400">Pre-exercise baseline vs post-exercise reported discomfort</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 inline-block" />
            <span>Pre-Exercise</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
            <span>Post-Exercise</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[0, 10]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="painBefore" name="Pre-Exercise VAS" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="painAfter" name="Post-Exercise VAS" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
