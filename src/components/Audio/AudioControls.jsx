import React, { useState } from 'react';
import { Volume2, VolumeX, Sliders, Bell, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';

export function AudioControls({
  isMuted,
  onToggleMute,
  volume = 0.9,
  onVolumeChange,
  rate = 1.05,
  onRateChange,
  enableSfx = true,
  onToggleSfx,
  onTestVoice,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Quick Access Floating Pill */}
      <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur border border-slate-700/80 rounded-xl p-1 text-xs shadow-lg">
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Clinical Voice Coach' : 'Mute Voice Coach'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            !isMuted
              ? 'bg-cyan-950/90 border border-cyan-700/80 text-cyan-300'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {!isMuted ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] hidden sm:inline">Voice Active</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] hidden sm:inline">Muted</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          title="Audio Settings"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Audio Settings Popover */}
      {isOpen && (
        <div className="absolute top-11 right-0 z-30 w-72 bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-4 shadow-2xl text-xs space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
              Audio Coaching Preferences
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-[10px]"
            >
              Close
            </button>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Speech Volume</span>
              <span className="font-mono text-cyan-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              disabled={isMuted}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40"
            />
          </div>

          {/* Speech Rate */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Speech Pace</span>
              <span className="font-mono text-cyan-400">{rate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              disabled={isMuted}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40"
            />
          </div>

          {/* Biofeedback Sound Effects Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Depth & Rep Chimes</span>
            </div>
            <button
              onClick={onToggleSfx}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                enableSfx ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  enableSfx ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Test Voice Button */}
          <button
            onClick={onTestVoice}
            disabled={isMuted}
            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Voice & Chimes</span>
          </button>
        </div>
      )}
    </div>
  );
}
