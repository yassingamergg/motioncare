import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sliders, Bell, Sparkles, Check, ChevronDown, ChevronUp, Mic } from 'lucide-react';

export function AudioControls({
  isMuted,
  onToggleMute,
  volume = 0.9,
  onVolumeChange,
  rate = 1.05,
  onRateChange,
  pitch = 1.0,
  onPitchChange,
  selectedVoiceURI = '',
  onVoiceChange,
  enableSfx = true,
  onToggleSfx,
  onTestVoice,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        const vList = window.speechSynthesis.getVoices() || [];
        const enVoices = vList.filter((v) => v.lang.startsWith('en'));
        setAvailableVoices(enVoices.length > 0 ? enVoices : vList);
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  return (
    <div className="relative">
      {/* Quick Access Floating Pill */}
      <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/90 rounded-xl p-1 text-xs shadow-2xl backdrop-blur-md">
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Clinical Voice Coach' : 'Mute Voice Coach'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            !isMuted
              ? 'bg-cyan-950 border border-cyan-600 text-cyan-200'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {!isMuted ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] hidden sm:inline">Voice ON</span>
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
          title="Audio Settings & Voice Customizer"
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            isOpen ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Audio Settings Popover */}
      {isOpen && (
        <div className="absolute top-12 right-0 z-30 w-80 bg-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl text-xs space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider">
              AI Coach Voice & Audio
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Voice Selection Dropdown */}
          {onVoiceChange && (
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-[11px]">
                Coach Voice Tone / Persona
              </label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => onVoiceChange(e.target.value)}
                disabled={isMuted}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-40"
              >
                <option value="">Default System Voice</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Volume Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-semibold">
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

          {/* Speech Rate & Pitch */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-semibold">
                <span>Pace: {rate}x</span>
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

            {onPitchChange && (
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-semibold">
                  <span>Pitch: {pitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={pitch}
                  onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                  disabled={isMuted}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40"
                />
              </div>
            )}
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

