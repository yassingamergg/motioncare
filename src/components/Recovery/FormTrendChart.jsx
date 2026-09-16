import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Award } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
          {data.fullLabel || `Session ${label}`}
        </div>
        <div className="flex items-center justify-between gap-4 text-emerald-400">
          <span>Overall Form Score:</span>
          <span className="font-bold">{data.formScore}%</span>
        </div>
        {data.controlScore !== undefined && (
          <div className="flex items-center justify-between gap-4 text-cyan-400">
            <span>Movement Control:</span>
            <span className="font-bold">{data.controlScore}%</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 text-slate-500 text-[11px] pt-1 border-t border-slate-800/80">
          <span>Clinical Target:</span>
          <span>85%</span>
        </div>
      </div>
    );
  }
  return null;
}

export function FormTrendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] text-center text-slate-500 text-xs">
        <Award className="w-8 h-8 text-slate-700 mb-2" />
        <p>No form score history recorded yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">Complete sessions to track postural quality over time.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Form Quality Progression</h3>
            <p className="text-xs text-slate-400">Overall MotionCare Form Score across longitudinal sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>Form Score</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 border-t-2 border-dashed border-emerald-500/70 inline-block" />
            <span>85% Target</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="formScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[50, 100]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={85}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="formScore"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#formScoreGradient)"
              activeDot={{ r: 6, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
