import test from 'node:test';
import assert from 'node:assert';
import { VoiceCoach, AUDIO_PRIORITY } from '../src/lib/audio/voiceCoach.js';
import { audioSynthesizer } from '../src/lib/audio/audioSynthesizer.js';

test('Voice Coach & Audio Synthesizer Unit Tests', async (t) => {
  await t.test('initializes with proper clinical defaults', () => {
    const coach = new VoiceCoach();
    assert.strictEqual(coach.isMuted, false);
    assert.strictEqual(coach.speechVolume, 0.9);
    assert.strictEqual(coach.speechRate, 1.05);
    assert.strictEqual(coach.enableSfx, true);
  });

  await t.test('enforces strict clinical priority hierarchy', () => {
    assert.ok(AUDIO_PRIORITY.CRITICAL > AUDIO_PRIORITY.FORM_CORRECTION);
    assert.ok(AUDIO_PRIORITY.FORM_CORRECTION > AUDIO_PRIORITY.DEPTH_MILESTONE);
    assert.ok(AUDIO_PRIORITY.DEPTH_MILESTONE > AUDIO_PRIORITY.REP_COUNT);
    assert.ok(AUDIO_PRIORITY.REP_COUNT > AUDIO_PRIORITY.STATUS);
  });

  await t.test('handles mute and volume controls cleanly', () => {
    const coach = new VoiceCoach();

    coach.setMuted(true);
    assert.strictEqual(coach.isMuted, true);

    // When muted, speak returns false immediately
    const spoke = coach.speak('Push knees outward');
    assert.strictEqual(spoke, false);

    coach.setVolume(0.75);
    assert.strictEqual(coach.speechVolume, 0.75);

    // Clamps volume bounds between 0 and 1
    coach.setVolume(1.8);
    assert.strictEqual(coach.speechVolume, 1.0);
    coach.setVolume(-0.5);
    assert.strictEqual(coach.speechVolume, 0.0);

    coach.setRate(1.2);
    assert.strictEqual(coach.speechRate, 1.2);

    coach.setEnableSfx(false);
    assert.strictEqual(coach.enableSfx, false);
  });

  await t.test('audio synthesizer handles volume and tone calls safely without throw', () => {
    audioSynthesizer.setVolume(0.5);
    assert.strictEqual(audioSynthesizer.volume, 0.5);

    audioSynthesizer.setEnabled(true);
    assert.strictEqual(audioSynthesizer.isEnabled, true);

    // In Node.js non-DOM environment, calls shouldn't crash
    assert.doesNotThrow(() => {
      audioSynthesizer.playTargetDepthChime();
      audioSynthesizer.playRepCompletedChime();
      audioSynthesizer.playFormWarningTone();
      audioSynthesizer.playSessionCompleteCelebration();
    });
  });

  await t.test('form feedback mapping triggers correct spoken cue handlers', () => {
    const coach = new VoiceCoach({ isMuted: true });

    // Should process without throwing in test environment
    assert.doesNotThrow(() => {
      coach.speakFormFeedback({ type: 'knee_valgus', severity: 'warning' });
      coach.speakFormFeedback({ type: 'torso_lean', severity: 'warning' });
      coach.speakFormFeedback({ type: 'speed_fast', severity: 'warning' });
      coach.speakFormFeedback({ type: 'depth_shallow', severity: 'info' });
      coach.speakRepCompleted(5, 10);
      coach.speakTargetDepth();
      coach.speakSessionStart();
      coach.speakSessionComplete(10);
    });
  });
});
