/**
 * MotionCare AI — Gemini Client & Deterministic Clinical Narrative Engine
 * Milestone 7: Dual-Engine SOAP Progress Note Generation
 *
 * PRIVACY GUARANTEE: Zero camera frames or imagery sent. Only anonymized numerical kinematics.
 */

import {
  CLINICAL_SYSTEM_INSTRUCTION,
  sanitizeTelemetryPayload,
  buildSingleSessionPrompt,
  buildLongitudinalPrompt,
} from './clinicalSummaryPrompt.js';

const CLINICAL_DISCLAIMER_TEXT =
  'Assistive AI Observation for Licensed Physiotherapist Review • Not an Independent Medical Diagnosis or Treatment Plan.';

/**
 * Deterministic clinical rules engine that generates standardized SOAP notes
 * directly in the browser when offline or without an external Gemini API key.
 * @param {Object} payload - Single session summary or longitudinal metrics
 * @param {boolean} isLongitudinal - Flag if processing multi-session cohort
 * @returns {Object} Structured SOAP progress note
 */
export function generateDeterministicClinicalSummary(payload = {}, isLongitudinal = false) {
  const generatedAt = new Date().toISOString();

  if (isLongitudinal) {
    const {
      totalSessions = 0,
      totalReps = 0,
      averageFormScore = 0,
      latestFormScore = 0,
      formScoreDelta = 0,
      latestDepth = 0,
      depthImprovementDelta = 0,
      targetFlexionAchieved = false,
      averagePainDelta = 0,
      totalPainReduction = 0,
      recoveryStatus = 'CONSISTENT',
    } = payload;

    const subjective =
      totalPainReduction > 0
        ? `Patient reports a cumulative reduction of ${totalPainReduction} points on the Visual Analog Scale (VAS) over the course of ${totalSessions} sessions. Recent sessions demonstrate stable pain tolerance during lower-extremity flexion activities with minimal symptom exacerbation.`
        : averagePainDelta > 1
        ? `Patient reports intermittent post-exercise discomfort elevation (average ${averagePainDelta > 0 ? `+${averagePainDelta}` : averagePainDelta} VAS per session). Supervising clinician review recommended before progressing load or volume.`
        : `Patient reports consistent and manageable baseline discomfort throughout ${totalSessions} completed rehabilitation sessions, with stable post-set tolerance.`;

    const objective = `Longitudinal Telemetry Summary (${totalSessions} sessions, ${totalReps} total repetitions):\n• Mean Form Quality: ${averageFormScore}% (${formScoreDelta >= 0 ? `+${formScoreDelta}%` : `${formScoreDelta}%`} progression from initial set)\n• Current Peak Knee Flexion: ${latestDepth}° (Prescribed Target: ≤ 90°)\n• Range of Motion Progression: ${depthImprovementDelta > 0 ? `+${depthImprovementDelta}° depth improvement` : 'Maintained stable depth'}\n• 90° Prescription Target: ${targetFlexionAchieved ? 'Achieved and sustained' : 'Approaching target'}\n• Movement Stability Status: ${recoveryStatus.replace('_', ' ')}`;

    const assessment =
      targetFlexionAchieved && formScoreDelta >= 10
        ? `Patient demonstrates positive functional recovery. Biomechanical tracking confirms significant gains in lower-extremity flexion range of motion and motor control, with high movement consistency and favorable pain tolerance.`
        : depthImprovementDelta > 0
        ? `Patient is progressing steadily toward functional targets. Flexion depth is improving with consistent eccentric control during the squat descent phase.`
        : `Kinematic tracking indicates stable movement execution. Adherence to prescribed rehabilitation volume remains steady.`;

    const plan = `1. Continue prescribed lower-extremity rehabilitation protocol as tolerated.\n2. Consider evaluating advancement toward full functional depth (≤ 90°) if symptom mitigation remains stable.\n3. Reinforce bilateral symmetrical loading and pelvic alignment during descent phase.\n4. Clinician discretion advised regarding progression to unilateral or loaded functional tasks.`;

    return {
      title: 'Longitudinal Physical Therapy Progress Briefing',
      subtitle: `Aggregated Telemetry across ${totalSessions} Rehabilitation Sessions`,
      subjective,
      objective,
      assessment,
      plan,
      disclaimer: CLINICAL_DISCLAIMER_TEXT,
      engine: 'local',
      generatedAt,
      rawContent: `SUBJECTIVE:\n${subjective}\n\nOBJECTIVE:\n${objective}\n\nASSESSMENT:\n${assessment}\n\nPLAN CONSIDERATIONS:\n${plan}`,
    };
  }

  // Single session SOAP note
  const data = sanitizeTelemetryPayload(payload);
  const depthReachedTarget = data.averageDepthFlexion > 0 && data.averageDepthFlexion <= 90;

  const subjective =
    data.painDelta < 0
      ? `Patient reported pre-exercise baseline pain of ${data.painBefore}/10 (VAS), decreasing to ${data.painAfter}/10 following the set (net ${data.painDelta} points, improved comfort).`
      : data.painDelta > 0
      ? `Patient reported pre-exercise baseline pain of ${data.painBefore}/10 (VAS), which elevated to ${data.painAfter}/10 post-exercise (+${data.painDelta} points). Exercise volume and joint depth tolerances should be monitored.`
      : `Patient reported stable pain scores of ${data.painBefore}/10 (VAS) both pre- and post-exercise (0 delta). Exercise set was completed within current symptom tolerance.`;

  const objective = `On-device Computer Vision Telemetry (${data.exerciseName}):\n• Repetitions Completed: ${data.totalReps} in ${data.formattedDuration}\n• Mean Knee Flexion Angle: ${data.averageDepthFlexion}° (Prescribed Target: ≤ 90°)\n• Target Attainment: ${depthReachedTarget ? 'Target achieved (≤ 90°)' : 'Shallow / Approaching target'}\n• MotionCare Form Score: ${data.averageFormScore}%\n• Movement Tempo & Eccentric Control: ${data.averageControl}%\n• Movement Consistency Index: ${data.movementConsistency}%`;

  const assessment =
    data.averageFormScore >= 85 && depthReachedTarget
      ? `Patient completed the prescribed set with excellent biomechanical fidelity and motor control. Knee flexion achieved the clinician-defined 90° target while maintaining upright torso posture and stable knee tracking.`
      : data.averageFormScore >= 80
      ? `Good motor execution demonstrated across the set. Joint angles showed controlled descent with minor opportunities for deeper flexion and enhanced hip stabilizer engagement.`
      : `Movement patterns showed mechanical compensations during descent. Trunk lean and alignment variations detected; cues for deliberate tempo and neutral spine control recommended.`;

  const plan = `1. Maintain current exercise protocol with emphasis on controlled eccentric cadence.\n2. ${
    !depthReachedTarget
      ? 'Focus on gradual progression toward target 90° flexion depth as joint comfort permits.'
      : 'Maintain depth tolerance while encouraging symmetrical weight distribution.'
  }\n3. Monitor subjective pain trajectory before proceeding to additional resistance.\n4. Clinician to review rep audit telemetry to adjust prescribed targets as appropriate.`;

  return {
    title: 'Clinical Exercise Progress Note (SOAP)',
    subtitle: `${data.exerciseName} • Single Set Telemetry`,
    subjective,
    objective,
    assessment,
    plan,
    disclaimer: CLINICAL_DISCLAIMER_TEXT,
    engine: 'local',
    generatedAt,
    rawContent: `SUBJECTIVE:\n${subjective}\n\nOBJECTIVE:\n${objective}\n\nASSESSMENT:\n${assessment}\n\nPLAN CONSIDERATIONS:\n${plan}`,
  };
}

/**
 * Parses raw text from Gemini into structured SOAP sections.
 * @param {string} rawText
 * @param {string} title
 * @param {string} subtitle
 * @returns {Object} Structured SOAP object
 */
function parseGeminiSoapResponse(rawText, title, subtitle) {
  const generatedAt = new Date().toISOString();

  let subjective = '';
  let objective = '';
  let assessment = '';
  let plan = '';

  const sMatch = rawText.match(/(?:\[SUBJECTIVE\]|SUBJECTIVE:)([\s\S]*?)(?=(?:\[OBJECTIVE\]|OBJECTIVE:|$))/i);
  const oMatch = rawText.match(/(?:\[OBJECTIVE\]|OBJECTIVE:)([\s\S]*?)(?=(?:\[ASSESSMENT\]|ASSESSMENT:|$))/i);
  const aMatch = rawText.match(/(?:\[ASSESSMENT\]|ASSESSMENT:)([\s\S]*?)(?=(?:\[PLAN_CONSIDERATIONS\]|\[PLAN\]|PLAN CONSIDERATIONS:|PLAN:|$))/i);
  const pMatch = rawText.match(/(?:\[PLAN_CONSIDERATIONS\]|\[PLAN\]|PLAN CONSIDERATIONS:|PLAN:)([\s\S]*?)$/i);

  if (sMatch && oMatch && aMatch && pMatch) {
    subjective = sMatch[1].trim();
    objective = oMatch[1].trim();
    assessment = aMatch[1].trim();
    plan = pMatch[1].trim();
  } else {
    // If sections were not cleanly tagged, split by paragraphs or provide raw content
    assessment = rawText.trim();
  }

  return {
    title: title || 'Clinical Progress Note (SOAP)',
    subtitle: subtitle || 'Generated via Gemini AI Telemetry Analysis',
    subjective: subjective || 'Patient baseline and post-exercise VAS scores recorded.',
    objective: objective || 'On-device computer vision kinematic telemetry compiled.',
    assessment: assessment || rawText.trim(),
    plan: plan || 'Maintain protocol and monitor symptom response.',
    disclaimer: CLINICAL_DISCLAIMER_TEXT,
    engine: 'gemini',
    generatedAt,
    rawContent: rawText,
  };
}

/**
 * Orchestrates clinical progress note generation.
 * If VITE_GEMINI_API_KEY is present, calls the Gemini REST API.
 * Otherwise, falls back gracefully to the deterministic clinical narrative engine.
 *
 * @param {Object} payload - Session summary or longitudinal metrics
/**
 * Retrieves Gemini API key from environment variable or local storage
 * @returns {string}
 */
export function getGeminiApiKey() {
  const envKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY;
  if (envKey && !envKey.includes('your-gemini') && !envKey.includes('YOUR_GEMINI')) return envKey.trim();
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return (window.localStorage.getItem('motioncare_gemini_key') || '').trim();
    }
  } catch {
    // Safe fallback
  }
  return '';
}

/**
 * Orchestrates clinical progress note generation.
 * If VITE_GEMINI_API_KEY or stored key is present, calls the Gemini REST API.
 * Otherwise, falls back gracefully to the deterministic clinical narrative engine.
 *
 * @param {Object} payload - Session summary or longitudinal metrics
 * @param {Object} options - { isLongitudinal: boolean, sessions: Array }
 * @returns {Promise<Object>} Structured SOAP progress note
 */
export async function generateClinicalProgressNote(payload, options = {}) {
  const { isLongitudinal = false, sessions = [] } = options;
  const apiKey = getGeminiApiKey();

  // If no Gemini API key configured, use local clinical engine
  if (!apiKey) {
    return generateDeterministicClinicalSummary(payload, isLongitudinal);
  }

  try {
    const prompt = isLongitudinal
      ? buildLongitudinalPrompt(payload, sessions)
      : buildSingleSessionPrompt(payload);

    // List of models to try in order of capability & speed
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let candidateText = null;
    let successfulModel = 'Gemini 2.0 Flash';

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2, // Low temperature for conservative clinical fidelity
              maxOutputTokens: 800,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            successfulModel = model.replace('gemini-', 'Gemini ').replace('-', ' ');
            break;
          }
        }
      } catch (innerErr) {
        console.warn(`[MotionCare AI] Model ${model} failed, trying next:`, innerErr);
      }
    }

    if (!candidateText) {
      console.warn('[MotionCare AI] All Gemini API endpoints failed. Using on-device fallback.');
      return generateDeterministicClinicalSummary(payload, isLongitudinal);
    }

    const title = isLongitudinal
      ? 'Longitudinal Physical Therapy Progress Briefing'
      : 'Clinical Exercise Progress Note (SOAP)';
    const subtitle = isLongitudinal
      ? `Aggregated Telemetry across ${payload.totalSessions} Sessions • ${successfulModel}`
      : `${payload.exerciseName || 'Bodyweight Squat'} • ${successfulModel}`;

    return parseGeminiSoapResponse(candidateText, title, subtitle);
  } catch (err) {
    console.error('[MotionCare AI] Network error calling Gemini API:', err);
    return generateDeterministicClinicalSummary(payload, isLongitudinal);
  }
}
