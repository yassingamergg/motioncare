import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  X,
  Stethoscope,
  ShieldCheck,
  Printer,
  RefreshCw,
  FileText,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { generateClinicalProgressNote } from '../../lib/ai/geminiClient.js';

export function ClinicalSummaryModal({
  isOpen,
  sessionOrMetrics,
  isLongitudinal = false,
  sessions = [],
  onClose,
}) {
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !sessionOrMetrics) {
      setNote(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    generateClinicalProgressNote(sessionOrMetrics, {
      isLongitudinal,
      sessions,
    })
      .then((res) => {
        if (isMounted) {
          setNote(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[MotionCare AI] Error generating clinical note:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sessionOrMetrics, isLongitudinal, sessions]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!note) return;
    const formattedText = `MOTIONCARE AI — CLINICAL PROGRESS NOTE (SOAP)
Generated: ${new Date(note.generatedAt).toLocaleString()}
Engine: ${note.engine === 'gemini' ? 'MotionCare Clinical AI Engine (Cloud-Accelerated)' : 'MotionCare Clinical Engine (On-Device)'}

${note.disclaimer}

============================================================
[S] SUBJECTIVE:
${note.subjective}

[O] OBJECTIVE:
${note.objective}

[A] ASSESSMENT:
${note.assessment}

[P] PLAN / CLINICAL CONSIDERATIONS:
${note.plan}
============================================================`;

    navigator.clipboard.writeText(formattedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl my-8 relative flex flex-col gap-5">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {note?.title || 'Clinical Progress Note (SOAP)'}
                </h3>
                {note?.engine && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      note.engine === 'gemini'
                        ? 'bg-purple-950 border border-purple-700 text-purple-300'
                        : 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{note.engine === 'gemini' ? 'MotionCare Clinical AI' : 'On-Device Engine'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {note?.subtitle || 'Objective physical therapy progress documentation'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !note}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied for EHR!' : 'Copy for EHR/EMR'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isLoading || !note}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Conservative Clinical Medical Disclaimer Watermark */}
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>Assistive AI Observation for Licensed Physiotherapist Review:</strong> This documentation is generated from verified on-device kinematic telemetry to assist clinical charting. It does not constitute an independent medical diagnosis, treatment plan, or medical clearance.
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <div className="text-sm font-semibold text-slate-300">
              Synthesizing Clinical Telemetry into SOAP Progress Note...
            </div>
            <div className="text-xs text-slate-500">
              Applying physical therapy kinematic heuristics & privacy guarantees
            </div>
          </div>
        )}

        {/* Structured SOAP Sections */}
        {!isLoading && note && (
          <div className="flex flex-col gap-4 text-xs">
            {/* S: Subjective */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-300 flex items-center justify-center font-mono text-xs">
                  S
                </span>
                <span className="uppercase tracking-wide text-xs">Subjective (Patient Reported Outcomes)</span>
              </div>
              <p className="text-slate-300 leading-relaxed pl-8">
                {note.subjective}
              </p>
            </div>

            {/* O: Objective */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center font-mono text-xs">
                  O
                </span>
                <span className="uppercase tracking-wide text-xs">Objective (Computer Vision Telemetry)</span>
              </div>
              <div className="text-slate-300 leading-relaxed pl-8 whitespace-pre-line font-mono text-[11px]">
                {note.objective}
              </div>
            </div>

            {/* A: Assessment */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center justify-center font-mono text-xs">
                  A
                </span>
                <span className="uppercase tracking-wide text-xs">Assessment (Biomechanical Analysis)</span>
              </div>
              <p className="text-slate-300 leading-relaxed pl-8">
                {note.assessment}
              </p>
            </div>

            {/* P: Plan */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-200">
                <span className="w-6 h-6 rounded-lg bg-teal-950 border border-teal-700 text-teal-300 flex items-center justify-center font-mono text-xs">
                  P
                </span>
                <span className="uppercase tracking-wide text-xs">Plan Considerations (Clinician Review)</span>
              </div>
              <div className="text-slate-300 leading-relaxed pl-8 whitespace-pre-line">
                {note.plan}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Video Privacy: No raw imagery transmitted</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
