import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, Dumbbell, Award, Compass, TrendingDown, TrendingUp, Minus, Database, Trash2 } from 'lucide-react';
import { PAIN_TREND } from '../../lib/session/sessionManager.js';

export function SessionHistoryList({ sessions = [], onClearHistory }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
        <Database className="w-8 h-8 text-slate-700 mb-2" />
        <p className="font-semibold text-slate-400">No Recorded Sessions Yet</p>
        <p className="text-slate-600 mt-1">
          Perform a guided squat session in the live workspace to archive your first set.
        </p>
      </div>
    );
  }

  // Sort descending by completion time so newest is top
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = new Date(a.startedAt || a.completedAt || 0).getTime();
    const timeB = new Date(b.startedAt || b.completedAt || 0).getTime();
    return timeB - timeA;
  });

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Session History & Kinematic Audit</h3>
          <p className="text-xs text-slate-400">
            {sortedSessions.length} {sortedSessions.length === 1 ? 'session' : 'sessions'} recorded in vault
          </p>
        </div>
        {onClearHistory && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear your local session vault?')) {
                onClearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 border border-rose-900/60 text-xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {sortedSessions.map((session, index) => {
          const isExpanded = expandedId === session.id;
          const dateStr = new Date(session.startedAt || session.completedAt || Date.now()).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          );

          const painBefore = session.painBefore ?? 0;
          const painAfter = session.painAfter ?? 0;
          const painDelta = session.painDelta ?? (painAfter - painBefore);

          return (
            <div
              key={session.id || index}
              className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-xl transition overflow-hidden"
            >
              {/* Main Card Header */}
              <div
                onClick={() => toggleExpand(session.id)}
                className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
                    #{sortedSessions.length - index}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs sm:text-sm">
                        {session.exerciseName || 'Bodyweight Squat'}
                      </span>
                      {session.isSampleCohort && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                          Sample Cohort
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{dateStr}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{session.formattedDuration || '00:00'}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Reps:</span>
                    <strong className="text-white">{session.totalReps || 0}</strong>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Form:</span>
                    <strong className="text-emerald-400">{session.averageFormScore || 0}%</strong>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Depth:</span>
                    <strong className="text-cyan-300">{session.averageDepth || 0}°</strong>
                  </div>

                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      painDelta < 0
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : painDelta > 0
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {painDelta < 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : painDelta > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    <span>{painDelta > 0 ? `+${painDelta}` : painDelta} VAS</span>
                  </div>

                  <button className="text-slate-400 hover:text-slate-200 transition p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expandable Rep Detail Inspection */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Movement Control</span>
                      <span className="font-semibold text-cyan-300">{session.averageControl || 85}%</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Movement Consistency</span>
                      <span className="font-semibold text-emerald-300">{session.movementConsistency || 85}%</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Pre-Exercise VAS</span>
                      <span className="font-semibold text-slate-200">{painBefore} / 10</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Post-Exercise VAS</span>
                      <span className="font-semibold text-slate-200">{painAfter} / 10</span>
                    </div>
                  </div>

                  {/* Individual Reps Breakdown */}
                  {session.reps && session.reps.length > 0 ? (
                    <div>
                      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Repetition Telemetry ({session.reps.length} repetitions)
                      </h4>
                      <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                            <tr>
                              <th className="py-1.5 px-3">#</th>
                              <th className="py-1.5 px-3">Peak Depth</th>
                              <th className="py-1.5 px-3">Duration</th>
                              <th className="py-1.5 px-3">Descent</th>
                              <th className="py-1.5 px-3">Ascent</th>
                              <th className="py-1.5 px-3">Torso Lean</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {session.reps.map((rep, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-800/40">
                                <td className="py-1.5 px-3 text-cyan-400 font-bold">{rep.repIndex || rIdx + 1}</td>
                                <td className="py-1.5 px-3">
                                  <span
                                    className={
                                      rep.peakDepth <= 90
                                        ? 'text-emerald-400 font-semibold'
                                        : 'text-slate-300'
                                    }
                                  >
                                    {Math.round(rep.peakDepth)}°
                                  </span>
                                </td>
                                <td className="py-1.5 px-3">{rep.durationSeconds}s</td>
                                <td className="py-1.5 px-3 text-slate-400">{rep.descentDurationSeconds || '—'}s</td>
                                <td className="py-1.5 px-3 text-slate-400">{rep.ascentDurationSeconds || '—'}s</td>
                                <td className="py-1.5 px-3 text-slate-400">{rep.torsoLean ? `${Math.round(rep.torsoLean)}°` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      Rep-by-rep telemetry details not recorded for this session.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
