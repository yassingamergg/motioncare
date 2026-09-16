import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Compass } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isMet = data.isTargetMet;
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
          {data.fullLabel || `Session ${label}`}
        </div>
        <div className="flex items-center justify-between gap-4 text-cyan-300">
          <span>Knee Flexion Depth:</span>
          <span className="font-bold">{data.depth}°</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400">
          <span>Prescription Target:</span>
          <span>90° Flexion</span>
        </div>
        <div className="pt-1 border-t border-slate-800/80">
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
              isMet
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                : 'bg-amber-950 border border-amber-800 text-amber-300'
            }`}
          >
            {isMet ? 'Target Reached (≤ 90°)' : 'Shallow (Approaching Target)'}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function RomTrendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] text-center text-slate-500 text-xs">
        <Compass className="w-8 h-8 text-slate-700 mb-2" />
        <p>No range-of-motion history recorded yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">Complete sessions to observe joint angle progression.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Knee Flexion ROM Progression</h3>
            <p className="text-xs text-slate-400">Peak knee flexion angle at bottom position (Target: ≤ 90°)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>Knee Depth</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 border-t-2 border-dashed border-cyan-500/70 inline-block" />
            <span>90° Target</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[75, 135]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}°`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={90}
              stroke="#06b6d4"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
            <Line
              type="monotone"
              dataKey="depth"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#0891b2', stroke: '#06b6d4', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#22d3ee', stroke: '#164e63', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
