/**
 * MotionCare AI — Clinical Prompt Engine & Privacy Sanitizer
 * Milestone 7: Gemini AI Clinical Summaries & SOAP Progress Notes
 *
 * PRIVACY RULE: Zero video frames or raw facial/body imagery are ever passed.
 * Only anonymous, structured kinematic telemetry and VAS numbers are processed.
 */

export const CLINICAL_SYSTEM_INSTRUCTION = `You are MotionCare AI, an assistive biomechanical telemetry analysis tool designed to draft objective clinical progress notes for licensed physiotherapists.

CRITICAL MEDICAL DIRECTIVES:
1. You are NOT diagnosing medical conditions, prescribing treatments, or replacing clinician judgment.
2. Every note must be explicitly framed as an assistive observation for physiotherapist review.
3. Structure your response in standard physical therapy SOAP format:
   - S (Subjective): Patient-reported outcome scores (pre/post VAS pain and discomfort trend).
   - O (Objective): Numerical kinematics tracked by on-device computer vision (repetition count, knee flexion depth, form quality score, tempo, movement stability, torso lean).
   - A (Assessment): Objective biomechanical observations of functional movement quality, depth attainment, and motor control patterns.
   - P (Plan / Clinical Considerations): Neutral, assistive considerations for the supervising physiotherapist's clinical review (e.g. cueing, depth tolerance, volume pacing).
4. Maintain formal, conservative medical terminology. Do not make definitive diagnostic declarations.`;

/**
 * Sanitizes input session data to ensure NO binary, image, or raw landmark matrices are included.
 * @param {Object} session
 * @returns {Object} Cleaned, numerical telemetry
 */
export function sanitizeTelemetryPayload(session = {}) {
  const painBefore = Number(session.painBefore ?? 0);
  const painAfter = Number(session.painAfter ?? 0);
  const painDelta = Number(session.painDelta ?? (painAfter - painBefore));

  return {
    exerciseName: String(session.exerciseName || 'Bodyweight Squat'),
    totalReps: Number(session.totalReps || 0),
    averageFormScore: Number(session.averageFormScore || 0),
    averageDepthFlexion: Number(session.averageDepth || 0),
    averageControl: Number(session.averageControl || 85),
    movementConsistency: Number(session.movementConsistency || 85),
    durationSeconds: Number(session.durationSeconds || 0),
    formattedDuration: String(session.formattedDuration || '00:00'),
    painBefore,
    painAfter,
    painDelta,
    painTrend: String(session.painTrend || 'STABLE'),
    repCount: Array.isArray(session.reps) ? session.reps.length : Number(session.totalReps || 0),
    repsSummary: Array.isArray(session.reps)
      ? session.reps.map((r, i) => ({
          rep: r.repIndex || i + 1,
          depth: Math.round(Number(r.peakDepth || 0)),
          duration: Number(r.durationSeconds || 0),
          torsoLean: Math.round(Number(r.torsoLean || 0)),
        }))
      : [],
  };
}

/**
 * Constructs a structured clinical prompt for a single exercise session.
 * @param {Object} session
 * @returns {string} Clean formatted text prompt
 */
export function buildSingleSessionPrompt(session) {
  const data = sanitizeTelemetryPayload(session);

  return `${CLINICAL_SYSTEM_INSTRUCTION}

Generate a concise, standardized Clinical Progress Note (SOAP format) based on the following verified on-device kinematic telemetry:

PATIENT TELEMETRY DATA:
- Protocol: ${data.exerciseName}
- Prescribed Target: 90° Knee Flexion
- Repetitions Completed: ${data.totalReps}
- Active Session Duration: ${data.formattedDuration} (${data.durationSeconds}s)
- Mean Form Quality Score: ${data.averageFormScore}%
- Mean Knee Flexion Depth: ${data.averageDepthFlexion}° (Target: ≤ 90°)
- Movement Control & Tempo Score: ${data.averageControl}%
- Movement Consistency: ${data.movementConsistency}%
- Pre-Exercise Baseline Pain: ${data.painBefore} / 10 (VAS)
- Post-Exercise Discomfort: ${data.painAfter} / 10 (VAS)
- Net Pain Delta: ${data.painDelta > 0 ? `+${data.painDelta}` : data.painDelta} (Trend: ${data.painTrend})

Provide structured sections:
[SUBJECTIVE]
[OBJECTIVE]
[ASSESSMENT]
[PLAN_CONSIDERATIONS]`;
}

/**
 * Constructs a structured clinical prompt for a longitudinal recovery trajectory across multiple sessions.
 * @param {Object} metrics
 * @param {Array<Object>} sessions
 * @returns {string}
 */
export function buildLongitudinalPrompt(metrics, sessions = []) {
  const sessionSnapshots = sessions.slice(-5).map((s, idx) => {
    const clean = sanitizeTelemetryPayload(s);
    return `Session ${idx + 1}: Form ${clean.averageFormScore}%, Depth ${clean.averageDepthFlexion}°, Pain ${clean.painBefore}->${clean.painAfter}`;
  });

  return `${CLINICAL_SYSTEM_INSTRUCTION}

Generate a Longitudinal Rehabilitation Progress Briefing (SOAP format) summarizing the patient's recovery trajectory over ${metrics.totalSessions} sessions:

LONGITUDINAL TELEMETRY SUMMARY:
- Total Sessions Logged: ${metrics.totalSessions}
- Total Repetitions Completed: ${metrics.totalReps}
- Mean Form Quality: ${metrics.averageFormScore}% (Delta from baseline: ${metrics.formScoreDelta > 0 ? `+${metrics.formScoreDelta}` : metrics.formScoreDelta}%)
- Current Peak Knee Flexion: ${metrics.latestDepth}° (ROM Improvement: ${metrics.depthImprovementDelta > 0 ? `+${metrics.depthImprovementDelta}° depth gain` : 'Stable'})
- Prescribed 90° Flexion Target Status: ${metrics.targetFlexionAchieved ? 'Achieved' : 'In Progress'}
- Total Pain Reduction (VAS): ${metrics.totalPainReduction} points net reduction
- Overall Trajectory Status: ${metrics.recoveryStatus}

RECENT SESSIONS:
${sessionSnapshots.join('\n')}

Provide structured sections:
[SUBJECTIVE]
[OBJECTIVE]
[ASSESSMENT]
[PLAN_CONSIDERATIONS]`;
}
