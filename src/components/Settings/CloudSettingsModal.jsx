import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  Trash2,
} from 'lucide-react';
import { getSupabaseConfig, getSupabaseClient } from '../../lib/supabase/supabaseClient.js';
import { getGeminiApiKey } from '../../lib/ai/geminiClient.js';

export function CloudSettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  // Live test statuses
  const [supabaseStatus, setSupabaseStatus] = useState('idle'); // 'idle' | 'testing' | 'success' | 'error'
  const [supabaseMessage, setSupabaseMessage] = useState('');
  const [geminiStatus, setGeminiStatus] = useState('idle'); // 'idle' | 'testing' | 'success' | 'error'
  const [geminiMessage, setGeminiMessage] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const sbConfig = getSupabaseConfig();
      setSupabaseUrl(sbConfig.url || '');
      setSupabaseKey(sbConfig.anonKey || '');
      setGeminiKey(getGeminiApiKey() || '');
      setSupabaseStatus(sbConfig.isConfigured ? 'success' : 'idle');
      setSupabaseMessage(sbConfig.isConfigured ? 'Configured and active' : 'Using local offline clinical vault');
      const gKey = getGeminiApiKey();
      setGeminiStatus(gKey ? 'success' : 'idle');
      setGeminiMessage(gKey ? 'API Key configured' : 'Using on-device deterministic clinical engine');
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testSupabase = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setSupabaseStatus('error');
      setSupabaseMessage('Please enter both Cloud Vault URL and API Key');
      return;
    }
    setSupabaseStatus('testing');
    setSupabaseMessage('Pinging Cloud Vault endpoint...');
    try {
      // Test direct REST call or client query
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/exercises?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (response.ok || response.status === 200 || response.status === 206) {
        setSupabaseStatus('success');
        setSupabaseMessage('Connection verified successfully! Cloud vault online.');
      } else {
        setSupabaseStatus('error');
        setSupabaseMessage(`HTTP ${response.status}: Database responded. Ensure schema is initialized.`);
      }
    } catch (err) {
      setSupabaseStatus('error');
      setSupabaseMessage(`Connection failed: ${err.message}`);
    }
  };

  const testGemini = async () => {
    if (!geminiKey) {
      setGeminiStatus('error');
      setGeminiMessage('Please enter your Clinical AI Intelligence Key');
      return;
    }
    setGeminiStatus('testing');
    setGeminiMessage('Testing connection to Clinical AI Engine...');
    const startTime = performance.now();
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
    ];
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with exactly: OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });

        const elapsed = Math.round(performance.now() - startTime);

        if (response.ok) {
          setGeminiStatus('success');
          setGeminiMessage(`Verified in ${elapsed}ms! Clinical AI Engine is live.`);
          return;
        } else {
          const errJson = await response.json().catch(() => ({}));
          lastError = errJson?.error?.message || `HTTP ${response.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    setGeminiStatus('error');
    setGeminiMessage(`AI Engine Error: ${lastError || 'Failed to connect to AI engine'}`);
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      if (supabaseUrl.trim()) {
        localStorage.setItem('motioncare_supabase_url', supabaseUrl.trim());
      } else {
        localStorage.removeItem('motioncare_supabase_url');
      }

      if (supabaseKey.trim()) {
        localStorage.setItem('motioncare_supabase_key', supabaseKey.trim());
      } else {
        localStorage.removeItem('motioncare_supabase_key');
      }

      if (geminiKey.trim()) {
        localStorage.setItem('motioncare_gemini_key', geminiKey.trim());
      } else {
        localStorage.removeItem('motioncare_gemini_key');
      }
    }

    setIsSaved(true);
    if (onConfigSaved) onConfigSaved();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleClear = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('motioncare_supabase_url');
      localStorage.removeItem('motioncare_supabase_key');
      localStorage.removeItem('motioncare_gemini_key');
    }
    setSupabaseUrl('');
    setSupabaseKey('');
    setGeminiKey('');
    setSupabaseStatus('idle');
    setSupabaseMessage('Reverted to local offline clinical vault');
    setGeminiStatus('idle');
    setGeminiMessage('Reverted to on-device deterministic clinical engine');
    if (onConfigSaved) onConfigSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl my-8 relative flex flex-col gap-6">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 pr-10">
          <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Cloud Vault & AI Engine Configuration
            </h3>
            <p className="text-xs text-slate-400">
              Configure secure clinical cloud synchronization and AI narrative engine
            </p>
          </div>
        </div>

        {/* Zero-Video Privacy Notice */}
        <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>Dual-Mode Architecture:</strong> MotionCare AI operates 100% offline out-of-the-box using the local clinical vault and on-device kinematics. Connecting your cloud credentials enables remote backup and cloud-accelerated clinical progress notes. <em>Zero video or biometric identity data is transmitted without consent.</em>
          </div>
        </div>

        {/* Section 1: Supabase / Cloud Database Configuration */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-xs sm:text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Secure Clinical Cloud Vault</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseStatus === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-400">
                {supabaseStatus === 'success' ? 'Cloud Vault Connected' : 'Local Vault Mode'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">
                Cloud Endpoint URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-cloud-vault.motioncare.io"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">
                Secure Access Public Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-400">
                {supabaseMessage}
              </span>
              <button
                type="button"
                onClick={testSupabase}
                disabled={supabaseStatus === 'testing'}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition cursor-pointer"
              >
                {supabaseStatus === 'testing' ? 'Testing...' : 'Test Cloud Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Clinical AI Configuration */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-200 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>MotionCare Clinical AI Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  geminiStatus === 'success' ? 'bg-purple-400' : 'bg-cyan-400'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-400">
                {geminiStatus === 'success' ? 'Cloud AI Engine Active' : 'On-Device Engine'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">
                Clinical AI Intelligence Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-400">
                {geminiMessage}
              </span>
              <button
                type="button"
                onClick={testGemini}
                disabled={geminiStatus === 'testing'}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition cursor-pointer"
              >
                {geminiStatus === 'testing' ? 'Testing...' : 'Test AI Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Stored Keys (Revert to Local)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold transition shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              {isSaved ? 'Saved!' : 'Save & Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
