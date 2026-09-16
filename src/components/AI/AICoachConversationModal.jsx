import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Bot,
  User,
  Sliders,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { askAICoachConversation } from '../../lib/ai/geminiClient.js';

export function AICoachConversationModal({
  isOpen,
  onClose,
  voiceCoach,
  telemetry = {},
  mediaElement = null,
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your MotionCare AI Coach. Ask me anything about your squat form, depth, tempo, knee comfort, or posture.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Speech Recognition instance
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available voices
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(voiceCoach?.selectedVoiceURI || '');
  const [voiceRate, setVoiceRate] = useState(voiceCoach?.speechRate || 1.05);
  const [voicePitch, setVoicePitch] = useState(voiceCoach?.speechPitch || 1.0);
  const [voiceVolume, setVoiceVolume] = useState(voiceCoach?.speechVolume || 0.9);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Load voices
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

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
          setSpeechError(null);
          speechTranscriptRef.current = '';
        };

        rec.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          speechTranscriptRef.current = transcript;
          setInputText(transcript);
        };

        rec.onerror = (event) => {
          console.warn('[AICoach] Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error !== 'no-speech') {
            setSpeechError(`Voice input error (${event.error}). Please try again or type below.`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
          const finalSpoken = speechTranscriptRef.current.trim();
          if (finalSpoken.length >= 2) {
            handleSendMessage(finalSpoken);
            speechTranscriptRef.current = '';
          }
        };

        recognitionRef.current = rec;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome/Edge or type your question.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      setInputText('');
      speechTranscriptRef.current = '';
      setSpeechError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('[AICoach] Start recognition failed:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query || isThinking) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const replyText = await askAICoachConversation(
        query,
        historyPayload,
        telemetry,
        mediaElement
      );

      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak response aloud through Voice Coach
      if (voiceCoach) {
        voiceCoach.speak(replyText, 100, true);
      }
    } catch (err) {
      console.error('[AICoach] Conversation error:', err);
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        role: 'model',
        text: "I'm focusing on your form! Keep your spine neutral and descent controlled.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleReplayVoice = (text) => {
    if (voiceCoach) {
      voiceCoach.speak(text, 100, true);
    }
  };

  const handleVoiceChange = (uri) => {
    setSelectedVoice(uri);
    if (voiceCoach) voiceCoach.setVoiceURI(uri);
  };

  const handleRateChange = (r) => {
    setVoiceRate(r);
    if (voiceCoach) voiceCoach.setRate(r);
  };

  const handlePitchChange = (p) => {
    setVoicePitch(p);
    if (voiceCoach) voiceCoach.setPitch(p);
  };

  const handleVolumeChange = (v) => {
    setVoiceVolume(v);
    if (voiceCoach) voiceCoach.setVolume(v);
  };

  if (!isOpen) return null;

  const quickQuestions = [
    'How is my squat depth?',
    'Check my chest & spine posture',
    'Tips for knee stiffness',
    'How can I improve my form score?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col h-[640px] max-h-[90vh] relative overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-950/50">
              <Bot className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  MotionCare AI Biomechanics Coach
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                  Live 2-Way Voice
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ask questions about your live form, joint angles, or recovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVoiceSettings((prev) => !prev)}
              title="Voice & Speech Settings"
              className={`p-2 rounded-xl transition cursor-pointer ${
                showVoiceSettings
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voice Customization Drawer (Collapsible) */}
        {showVoiceSettings && (
          <div className="bg-slate-950 border-b border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fadeIn">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-[11px]">
                Coach Voice Accent & Tone
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="">Default System Voice</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-semibold">
                <span>Pace: {voiceRate}x</span>
                <span>Pitch: {voicePitch}x</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={voiceRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  title="Speech Pace"
                />
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={voicePitch}
                  onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  title="Speech Pitch"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Telemetry Summary Pill (Contextual) */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Depth:{' '}
              <strong className="text-cyan-400">
                {telemetry.jointAngles?.activeDepth != null
                  ? `${Math.round(telemetry.jointAngles.activeDepth)}°`
                  : 'N/A'}
              </strong>
            </span>
            <span>
              Torso:{' '}
              <strong className="text-cyan-400">
                {telemetry.jointAngles?.torsoLean != null
                  ? `${Math.round(telemetry.jointAngles.torsoLean)}°`
                  : 'N/A'}
              </strong>
            </span>
            <span>
              Reps: <strong className="text-emerald-400">{telemetry.repSnapshot?.reps || 0}</strong>
            </span>
          </div>
          <span className="text-slate-500">Live Camera Grounded AI</span>
        </div>

        {/* Conversation Message List */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-slate-950 shrink-0 mt-0.5 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-slate-950 font-medium rounded-tr-none shadow-md'
                    : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <div
                  className={`flex items-center justify-between gap-2 mt-1.5 text-[10px] ${
                    msg.role === 'user' ? 'text-slate-900/70 font-semibold' : 'text-slate-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.role === 'model' && (
                    <button
                      onClick={() => handleReplayVoice(msg.text)}
                      title="Replay Spoken Voice"
                      className="hover:text-cyan-400 transition cursor-pointer flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Speak</span>
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-slate-950 shrink-0 mt-0.5">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Analyzing camera kinematics & physical therapy rules...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              disabled={isThinking}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] whitespace-nowrap transition cursor-pointer disabled:opacity-40"
            >
              💬 {q}
            </button>
          ))}
        </div>

        {/* Speech Error Banner (if any) */}
        {speechError && (
          <div className="px-4 py-1.5 bg-rose-950/60 border-t border-rose-800 text-rose-300 text-[11px]">
            {speechError}
          </div>
        )}

        {/* Input & Voice Controls */}
        <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex items-center gap-2">
          {/* Speech Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? 'Stop Listening' : 'Speak to AI Coach (Voice Recognition)'}
            className={`p-3 rounded-2xl border transition shadow-lg cursor-pointer flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-400'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder={isListening ? 'Listening to your voice...' : 'Ask your AI Coach (e.g. "How is my depth?")...'}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isThinking}
            className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-950/50 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
