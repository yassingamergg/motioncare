/**
 * MotionCare AI — Web Audio Biofeedback Synthesizer
 * Milestone 8: Zero-Latency Pure Tone Generation for Exercise Telemetry
 *
 * Uses native Web Audio API to produce crisp, pleasant biofeedback tones
 * with zero external asset dependencies or network latency.
 */

class AudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = true;
    this.volume = 0.6;
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol) || 0));
  }

  setEnabled(enabled) {
    this.isEnabled = Boolean(enabled);
  }

  /**
   * Plays a bright affirmative chime when knee flexion reaches target depth (<= 90°)
   */
  playTargetDepthChime() {
    if (!this.isEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6 note

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Plays a double harmonic chime upon valid repetition completion
   */
  playRepCompletedChime() {
    if (!this.isEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(this.volume * 0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.14);

      // Note 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      gain2.gain.setValueAtTime(this.volume * 0.5, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.38);
    } catch {
      // Audio safety
    }
  }

  /**
   * Plays a gentle low-frequency corrective cue on form deviation (e.g. Valgus or Lean)
   */
  playFormWarningTone() {
    if (!this.isEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio safety
    }
  }

  /**
   * Plays an ascending celebration arpeggio upon set completion
   */
  playSessionCompleteCelebration() {
    if (!this.isEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (C Major)

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(this.volume * 0.4, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.3);
      });
    } catch {
      // Audio safety
    }
  }
}

export const audioSynthesizer = new AudioSynthesizer();
