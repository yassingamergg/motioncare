import test from 'node:test';
import assert from 'node:assert';
import {
  sanitizeTelemetryPayload,
  buildSingleSessionPrompt,
  buildLongitudinalPrompt,
} from '../src/lib/ai/clinicalSummaryPrompt.js';
import {
  generateDeterministicClinicalSummary,
  generateClinicalProgressNote,
} from '../src/lib/ai/geminiClient.js';

test('Clinical Summary Engine & Privacy Unit Tests', async (t) => {
  await t.test('privacy sanitizer removes all non-numeric and media fields', () => {
    const dirtySession = {
      exerciseName: 'Bodyweight Squat',
      totalReps: 10,
      averageFormScore: 88,
      averageDepth: 91,
      painBefore: 4,
      painAfter: 2,
      rawImageData: 'data:image/jpeg;base64,...',
      videoBlob: new Uint8Array([1, 2, 3]),
      landmarkCoordinates33: Array(33).fill({ x: 0.5, y: 0.5, z: 0.1 }),
    };

    const clean = sanitizeTelemetryPayload(dirtySession);

    assert.strictEqual(clean.totalReps, 10);
    assert.strictEqual(clean.averageFormScore, 88);
    assert.strictEqual(clean.averageDepthFlexion, 91);
    assert.strictEqual(clean.painDelta, -2);
    assert.strictEqual(clean.rawImageData, undefined);
    assert.strictEqual(clean.videoBlob, undefined);
    assert.strictEqual(clean.landmarkCoordinates33, undefined);
  });

  await t.test('builds single session prompt with strict SOAP directives', () => {
    const session = {
      exerciseName: 'Bodyweight Squat',
      totalReps: 10,
      averageFormScore: 92,
      averageDepth: 88,
      durationSeconds: 95,
      formattedDuration: '01:35',
      painBefore: 3,
      painAfter: 2,
    };

    const prompt = buildSingleSessionPrompt(session);
    assert.ok(prompt.includes('CRITICAL MEDICAL DIRECTIVES'));
    assert.ok(prompt.includes('[SUBJECTIVE]'));
    assert.ok(prompt.includes('[OBJECTIVE]'));
    assert.ok(prompt.includes('[ASSESSMENT]'));
    assert.ok(prompt.includes('[PLAN_CONSIDERATIONS]'));
    assert.ok(prompt.includes('88°'));
  });

  await t.test('generates high-fidelity deterministic SOAP note for single session', () => {
    const session = {
      exerciseName: 'Bodyweight Squat',
      totalReps: 12,
      averageFormScore: 90,
      averageDepth: 89, // ≤ 90° target achieved
      averageControl: 88,
      durationSeconds: 120,
      formattedDuration: '02:00',
      painBefore: 4,
      painAfter: 2, // -2 pain delta
      painDelta: -2,
    };

    const note = generateDeterministicClinicalSummary(session, false);

    assert.ok(note.title.includes('SOAP'));
    assert.strictEqual(note.engine, 'local');
    assert.ok(note.disclaimer.includes('Physiotherapist Review'));
    assert.ok(note.subjective.includes('4/10'));
    assert.ok(note.subjective.includes('2/10'));
    assert.ok(note.objective.includes('89°'));
    assert.ok(note.objective.includes('Target achieved'));
    assert.ok(note.assessment.length > 20);
    assert.ok(note.plan.length > 20);
  });

  await t.test('generates longitudinal clinical progress note across multiple sessions', () => {
    const longitudinalMetrics = {
      totalSessions: 10,
      totalReps: 106,
      averageFormScore: 88,
      latestFormScore: 95,
      formScoreDelta: 27,
      latestDepth: 89,
      depthImprovementDelta: 29,
      targetFlexionAchieved: true,
      totalPainReduction: 5,
      recoveryStatus: 'PROGRESSING_WELL',
    };

    const note = generateDeterministicClinicalSummary(longitudinalMetrics, true);

    assert.ok(note.title.includes('Longitudinal'));
    assert.strictEqual(note.engine, 'local');
    assert.ok(note.subjective.includes('5 points'));
    assert.ok(note.objective.includes('10 sessions'));
    assert.ok(note.objective.includes('89°'));
    assert.ok(note.assessment.includes('positive functional recovery'));
  });

  await t.test('generateClinicalProgressNote falls back to deterministic engine gracefully when offline', async () => {
    const session = {
      exerciseName: 'Bodyweight Squat',
      totalReps: 8,
      averageFormScore: 78,
      averageDepth: 102,
      painBefore: 3,
      painAfter: 3,
    };

    const result = await generateClinicalProgressNote(session, { isLongitudinal: false });
    assert.ok(result);
    assert.ok(result.subjective);
    assert.ok(result.objective);
    assert.ok(result.assessment);
    assert.ok(result.plan);
    assert.strictEqual(result.engine, 'local');
  });

  await t.test('analyzeLiveCameraFrame provides intelligent biomechanical coaching tips', async () => {
    const { analyzeLiveCameraFrame } = await import('../src/lib/ai/geminiClient.js');

    // Test torso lean compensation guidance
    const resLean = await analyzeLiveCameraFrame(null, { torsoLean: 42, activeDepth: 95 }, { reps: 3 });
    assert.ok(resLean.tip.includes('chest') || resLean.tip.includes('upright') || resLean.tip.includes('spine'));
    assert.strictEqual(resLean.source, 'on_device');

    // Test shallow depth guidance
    const resShallow = await analyzeLiveCameraFrame(null, { torsoLean: 18, activeDepth: 112 }, { reps: 4, squatState: 'BOTTOM' });
    assert.ok(resShallow.tip.includes('depth') || resShallow.tip.includes('90°'));

    // Test ideal form validation
    const resIdeal = await analyzeLiveCameraFrame(null, { torsoLean: 15, activeDepth: 88, leftKnee: 88, rightKnee: 89 }, { reps: 5, squatState: 'BOTTOM' });
    assert.ok(resIdeal.tip.includes('depth') || resIdeal.tip.includes('heels') || resIdeal.tip.includes('spine') || resIdeal.tip.length > 10);
  });
});
