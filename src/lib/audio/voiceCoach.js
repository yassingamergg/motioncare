/**
 * MotionCare AI — Real-Time Clinical Voice Coach Engine
 * Milestone 8: Prioritized Text-to-Speech (TTS) & Auditory Biofeedback
 *
 * Provides hands-free physical therapy guidance using the native Web Speech API,
 * with anti-chatter throttling and clinical priority queuing.
 */

import { audioSynthesizer } from './audioSynthesizer.js';

export const AUDIO_PRIORITY = {
  CRITICAL: 100,
  FORM_CORRECTION: 80,
  DEPTH_MILESTONE: 60,
  REP_COUNT: 40,
  STATUS: 20,
};

export class VoiceCoach {
  constructor(options = {}) {
    // Load persisted settings if available
    let stored = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('motioncare_voice_settings');
        if (raw) stored = JSON.parse(raw);
      }
    } catch {
      // Ignore
    }

    this.isMuted = options.isMuted ?? stored.isMuted ?? false;
    this.speechVolume = options.speechVolume ?? stored.speechVolume ?? 0.9;
    this.speechRate = options.speechRate ?? stored.speechRate ?? 1.05; // Slightly brisk, clear pace
    this.speechPitch = options.speechPitch ?? stored.speechPitch ?? 1.0;
    this.enableSfx = options.enableSfx ?? stored.enableSfx ?? true;
    this.selectedVoiceURI = options.selectedVoiceURI ?? stored.selectedVoiceURI ?? null;

    // Cooldown & throttling state
    this.lastSpokenTimestamp = 0;
    this.minSpokenIntervalMs = 3200; // 3.2s minimum spacing between corrections
    this.lastSpokenPhrase = '';
    this.lastSpokenPhraseTime = 0;
    this.phraseDedupeIntervalMs = 5500; // 5.5s deduplication for identical phrases
    this.currentPriority = 0;

    // Rep milestone tracking
    this.lastAnnouncedRep = 0;
  }

  /**
   * Checks if browser speech synthesis is supported
   * @returns {boolean}
   */
  isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Retrieves available system voices (filtered for English/natural voices)
   * @returns {Array<SpeechSynthesisVoice>}
   */
  getAvailableVoices() {
    if (!this.isSupported()) return [];
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return voices.filter((v) => v.lang.startsWith('en'));
    } catch {
      return [];
    }
  }

  /**
   * Core speech dispatcher with priority and throttling
   * @param {string} text - Spoken clinical phrase
   * @param {number} priority - AUDIO_PRIORITY tier
   * @param {boolean} [force=false] - Bypass cooldown for high priority events
   */
  speak(text, priority = AUDIO_PRIORITY.FORM_CORRECTION, force = false) {
    if (this.isMuted || !this.isSupported() || !text) return false;

    const now = performance.now();

    // Deduplication check: avoid repeating the exact same cue within 5.5s
    if (text === this.lastSpokenPhrase && now - this.lastSpokenPhraseTime < this.phraseDedupeIntervalMs && !force) {
      return false;
    }

    // Cooldown throttle check: prevent speech spamming
    if (!force && now - this.lastSpokenTimestamp < this.minSpokenIntervalMs) {
      if (priority <= this.currentPriority) {
        return false;
      }
    }

    try {
      const synth = window.speechSynthesis;
      if (synth.speaking && priority > this.currentPriority) {
        synth.cancel(); // Cancel lower priority cue for urgent correction
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.speechVolume;
      utterance.rate = this.speechRate;
      utterance.pitch = this.speechPitch;

      // Select preferred voice if specified
      if (this.selectedVoiceURI) {
        const voices = this.getAvailableVoices();
        const found = voices.find((v) => v.voiceURI === this.selectedVoiceURI);
        if (found) utterance.voice = found;
      }

      utterance.onstart = () => {
        this.currentPriority = priority;
      };

      utterance.onend = () => {
        this.currentPriority = 0;
      };

      utterance.onerror = () => {
        this.currentPriority = 0;
      };

      synth.speak(utterance);

      this.lastSpokenTimestamp = now;
      this.lastSpokenPhrase = text;
      this.lastSpokenPhraseTime = now;

      return true;
    } catch (err) {
      console.warn('[VoiceCoach] Speech synthesis error:', err);
      return false;
    }
  }

  /**
   * Translates real-time form analyzer feedback into crisp spoken guidance
   * @param {Object} feedback - Primary feedback item from FormAnalyzer
   */
  speakFormFeedback(feedback) {
    if (!feedback || this.isMuted) return;

    const { type, severity, message } = feedback;

    // Valgus warning (high priority)
    if (type === 'knee_valgus') {
      if (this.enableSfx) audioSynthesizer.playFormWarningTone();
      this.speak('Push your knees outward over your toes', AUDIO_PRIORITY.FORM_CORRECTION);
      return;
    }

    // Torso lean warning
    if (type === 'torso_lean') {
      if (this.enableSfx) audioSynthesizer.playFormWarningTone();
      this.speak('Keep your chest upright', AUDIO_PRIORITY.FORM_CORRECTION);
      return;
    }

    // Speed warning (fast drop)
    if (type === 'speed_fast') {
      this.speak('Slow down your descent', AUDIO_PRIORITY.FORM_CORRECTION);
      return;
    }

    // Shallow depth suggestion
    if (type === 'depth_shallow') {
      this.speak('Try sinking slightly deeper', AUDIO_PRIORITY.DEPTH_MILESTONE);
      return;
    }
  }

  /**
   * Biofeedback chime and voice on reaching target depth
   */
  speakTargetDepth() {
    if (this.enableSfx) {
      audioSynthesizer.playTargetDepthChime();
    }
    // We keep speech light on bottom position to avoid distracting the patient
  }

  /**
   * Announces completed repetition and plays affirmative harmonic chime
   * @param {number} repIndex
   * @param {number} [targetReps=10]
   */
  speakRepCompleted(repIndex, targetReps = 10) {
    if (this.enableSfx) {
      audioSynthesizer.playRepCompletedChime();
    }

    if (this.isMuted) return;

    if (repIndex === targetReps) {
      this.speak(`Rep ${repIndex}. Target reached! Complete your set.`, AUDIO_PRIORITY.REP_COUNT, true);
    } else if (repIndex === Math.floor(targetReps / 2)) {
      this.speak(`Rep ${repIndex}. Halfway there.`, AUDIO_PRIORITY.REP_COUNT, true);
    } else if (repIndex % 3 === 0 || repIndex === 1) {
      this.speak(`Rep ${repIndex}`, AUDIO_PRIORITY.REP_COUNT);
    }

    this.lastAnnouncedRep = repIndex;
  }

  /**
   * Spoken announcement on session start
   */
  speakSessionStart() {
    this.speak('Starting guided squat session. Stand back and begin.', AUDIO_PRIORITY.STATUS, true);
  }

  /**
   * Spoken announcement & celebration on session completion
   * @param {number} totalReps
   */
  speakSessionComplete(totalReps = 0) {
    if (this.enableSfx) {
      audioSynthesizer.playSessionCompleteCelebration();
    }
    this.speak(`Set complete! ${totalReps} reps recorded. Please report your comfort level.`, AUDIO_PRIORITY.STATUS, true);
  }

  /**
   * Stops any active speech synthesis immediately
   */
  stopSpeaking() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.currentPriority = 0;
    }
  }

  persistSettings() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('motioncare_voice_settings', JSON.stringify(this.getSettings()));
      }
    } catch {
      // Ignore
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.isMuted && this.isSupported()) {
      this.stopSpeaking();
    }
    this.persistSettings();
  }

  setVolume(vol) {
    this.speechVolume = Math.max(0, Math.min(1, Number(vol) || 0));
    audioSynthesizer.setVolume(this.speechVolume);
    this.persistSettings();
  }

  setRate(rate) {
    this.speechRate = Math.max(0.7, Math.min(1.5, Number(rate) || 1.0));
    this.persistSettings();
  }

  setPitch(pitch) {
    this.speechPitch = Math.max(0.6, Math.min(1.4, Number(pitch) || 1.0));
    this.persistSettings();
  }

  setEnableSfx(enable) {
    this.enableSfx = Boolean(enable);
    audioSynthesizer.setEnabled(this.enableSfx);
    this.persistSettings();
  }

  setVoiceURI(uri) {
    this.selectedVoiceURI = uri;
    this.persistSettings();
  }

  getSettings() {
    return {
      isMuted: this.isMuted,
      speechVolume: this.speechVolume,
      speechRate: this.speechRate,
      speechPitch: this.speechPitch,
      enableSfx: this.enableSfx,
      selectedVoiceURI: this.selectedVoiceURI,
    };
  }
}
