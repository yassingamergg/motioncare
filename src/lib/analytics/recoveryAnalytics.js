/**
 * MotionCare AI — Recovery Analytics Engine
 * Milestone 6: Longitudinal Biomechanical & Clinical Trend Computations
 *
 * Conservative medical notice: Assistive data analysis for physiotherapist review.
 * Does not make clinical diagnoses.
 */

import { PAIN_TREND } from '../session/sessionManager.js';

/**
 * Calculates high-level clinical recovery indicators across a series of sessions.
 * @param {Array<Object>} sessions - Chronologically ordered or unordered sessions
 * @returns {Object} Longitudinal summary metrics
 */
export function calculateLongitudinalMetrics(sessions = []) {
  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      totalReps: 0,
      totalDurationSeconds: 0,
      formattedTotalDuration: '00:00',
      averageFormScore: 0,
      latestFormScore: 0,
      formScoreDelta: 0,
      averageDepth: 0,
      latestDepth: 0,
      depthImprovementDelta: 0, // Positive means improved flexion toward target
      targetFlexionAchieved: false,
      averagePainDelta: 0,
      totalPainReduction: 0,
      recoveryStatus: 'INSUFFICIENT_DATA',
      recoveryMessage: 'Complete your first rehabilitation session to start generating recovery data.',
    };
  }

  // Sort sessions chronologically by startedAt or completedAt ascending
  const sorted = [...sessions].sort((a, b) => {
    const timeA = new Date(a.startedAt || a.completedAt || 0).getTime();
    const timeB = new Date(b.startedAt || b.completedAt || 0).getTime();
    return timeA - timeB;
  });

  const totalSessions = sorted.length;
  const firstSession = sorted[0];
  const latestSession = sorted[sorted.length - 1];

  let totalReps = 0;
  let totalDuration = 0;
  let sumFormScore = 0;
  let sumDepth = 0;
  let sumPainDelta = 0;

  sorted.forEach((s) => {
    totalReps += Number(s.totalReps || 0);
    totalDuration += Number(s.durationSeconds || 0);
    sumFormScore += Number(s.averageFormScore || 0);
    sumDepth += Number(s.averageDepth || 0);
    sumPainDelta += Number(s.painDelta ?? ((s.painAfter ?? 0) - (s.painBefore ?? 0)));
  });

  const averageFormScore = Math.round(sumFormScore / totalSessions);
  const averageDepth = Math.round((sumDepth / totalSessions) * 10) / 10;
  const averagePainDelta = Math.round((sumPainDelta / totalSessions) * 10) / 10;

  const latestFormScore = Number(latestSession.averageFormScore || 0);
  const initialFormScore = Number(firstSession.averageFormScore || 0);
  const formScoreDelta = latestFormScore - initialFormScore;

  const latestDepth = Number(latestSession.averageDepth || 0);
  const initialDepth = Number(firstSession.averageDepth || 0);
  // For squat depth (knee flexion angle), a lower angle (closer to 90°) represents greater range of motion.
  // Depth improvement is positive if the patient squats lower.
  const depthImprovementDelta = Math.round((initialDepth - latestDepth) * 10) / 10;
  const targetFlexionAchieved = latestDepth > 0 && latestDepth <= 90;

  // Pain reduction: initial pre-pain minus latest post-pain
  const totalPainReduction = (firstSession.painBefore ?? 0) - (latestSession.painAfter ?? 0);

  // Assess recovery trajectory
  let recoveryStatus = 'CONSISTENT';
  let recoveryMessage = 'Maintaining stable kinematics and steady adherence.';

  if (totalSessions >= 2) {
    if (formScoreDelta >= 10 && (depthImprovementDelta >= 5 || targetFlexionAchieved) && averagePainDelta <= 0) {
      recoveryStatus = 'PROGRESSING_WELL';
      recoveryMessage = 'Demonstrating significant improvement in squat depth and postural control without pain exacerbation.';
    } else if (averagePainDelta > 1.5) {
      recoveryStatus = 'ELEVATED_PAIN';
      recoveryMessage = 'Post-exercise discomfort shows elevation across recent sets. Clinician review advised.';
    } else if (formScoreDelta >= 5) {
      recoveryStatus = 'STEADY_PROGRESS';
      recoveryMessage = 'Gradual positive trajectory in movement consistency and range of motion.';
    }
  }

  // Format total duration
  const mins = Math.floor(totalDuration / 60);
  const secs = totalDuration % 60;
  const formattedTotalDuration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return {
    totalSessions,
    totalReps,
    totalDurationSeconds: totalDuration,
    formattedTotalDuration,
    averageFormScore,
    latestFormScore,
    formScoreDelta,
    averageDepth,
    latestDepth,
    depthImprovementDelta,
    targetFlexionAchieved,
    averagePainDelta,
    totalPainReduction,
    recoveryStatus,
    recoveryMessage,
  };
}

/**
 * Transforms session entities into clean data points ready for Recharts visualizations.
 * @param {Array<Object>} sessions
 * @returns {Object} Chart-ready series arrays
 */
export function formatTrendDataForCharts(sessions = []) {
  if (!sessions || sessions.length === 0) {
    return {
      formTrendData: [],
      romTrendData: [],
      painTrendData: [],
    };
  }

  const sorted = [...sessions].sort((a, b) => {
    const timeA = new Date(a.startedAt || a.completedAt || 0).getTime();
    const timeB = new Date(b.startedAt || b.completedAt || 0).getTime();
    return timeA - timeB;
  });

  const formTrendData = [];
  const romTrendData = [];
  const painTrendData = [];

  sorted.forEach((session, index) => {
    const sessionNum = index + 1;
    const dateObj = new Date(session.startedAt || session.completedAt || Date.now());
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const formScore = Number(session.averageFormScore || 0);
    const depth = Number(session.averageDepth || 0);
    const painBefore = Number(session.painBefore ?? 0);
    const painAfter = Number(session.painAfter ?? 0);
    const painDelta = Number(session.painDelta ?? (painAfter - painBefore));

    // Form score trend point
    formTrendData.push({
      sessionIndex: sessionNum,
      name: `S${sessionNum}`,
      fullLabel: `Session ${sessionNum} (${formattedDate})`,
      date: formattedDate,
      formScore,
      targetScore: 85,
      controlScore: Number(session.averageControl || Math.min(100, Math.round(formScore * 0.95))),
    });

    // ROM (flexion depth) trend point
    romTrendData.push({
      sessionIndex: sessionNum,
      name: `S${sessionNum}`,
      fullLabel: `Session ${sessionNum} (${formattedDate})`,
      date: formattedDate,
      depth,
      targetDepth: 90,
      isTargetMet: depth > 0 && depth <= 90,
    });

    // Pain trajectory trend point
    painTrendData.push({
      sessionIndex: sessionNum,
      name: `S${sessionNum}`,
      fullLabel: `Session ${sessionNum} (${formattedDate})`,
      date: formattedDate,
      painBefore,
      painAfter,
      painDelta,
      trend:
        painDelta < 0
          ? PAIN_TREND.IMPROVED
          : painDelta > 0
          ? PAIN_TREND.ELEVATED
          : PAIN_TREND.STABLE,
    });
  });

  return {
    formTrendData,
    romTrendData,
    painTrendData,
  };
}

/**
 * Generates a realistic 10-session longitudinal cohort dataset.
 * Simulates a patient recovering from a knee condition over 3 weeks.
 * Displays gradual depth progression from 118° to 89°, form score rising from 68 to 95,
 * and pre-exercise pain dropping from 6 to 1.
 * @returns {Array<Object>} 10 realistic clinical session records
 */
export function getSampleRecoverySessions() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleProgression = [
    { daysAgo: 21, reps: 6, form: 68, depth: 118, control: 65, pBefore: 6, pAfter: 6, dur: 75 },
    { daysAgo: 19, reps: 8, form: 71, depth: 115, control: 70, pBefore: 6, pAfter: 5, dur: 85 },
    { daysAgo: 16, reps: 8, form: 75, depth: 111, control: 74, pBefore: 5, pAfter: 5, dur: 90 },
    { daysAgo: 14, reps: 10, form: 79, depth: 106, control: 78, pBefore: 5, pAfter: 4, dur: 105 },
    { daysAgo: 11, reps: 10, form: 83, depth: 102, control: 82, pBefore: 4, pAfter: 4, dur: 110 },
    { daysAgo: 9, reps: 10, form: 86, depth: 98, control: 85, pBefore: 4, pAfter: 3, dur: 115 },
    { daysAgo: 7, reps: 12, form: 89, depth: 95, control: 88, pBefore: 3, pAfter: 3, dur: 125 },
    { daysAgo: 5, reps: 12, form: 91, depth: 92, control: 90, pBefore: 3, pAfter: 2, dur: 130 },
    { daysAgo: 3, reps: 12, form: 93, depth: 90, control: 92, pBefore: 2, pAfter: 2, dur: 135 },
    { daysAgo: 1, reps: 12, form: 95, depth: 89, control: 94, pBefore: 2, pAfter: 1, dur: 140 },
  ];

  return sampleProgression.map((item, index) => {
    const startedAtTime = new Date(now - item.daysAgo * dayMs).toISOString();
    const completedAtTime = new Date(now - item.daysAgo * dayMs + item.dur * 1000).toISOString();
    const painDelta = item.pAfter - item.pBefore;

    const repsDetail = Array.from({ length: item.reps }, (_, rIdx) => ({
      repIndex: rIdx + 1,
      peakDepth: Math.round(item.depth + (Math.random() * 4 - 2)),
      durationSeconds: Math.round((item.dur / item.reps) * 10) / 10,
      descentDurationSeconds: 1.4,
      ascentDurationSeconds: 1.2,
      torsoLean: Math.max(10, Math.round(35 - index * 2)),
    }));

    return {
      id: `sample-session-${index + 1}`,
      patientId: 'patient_sample_knee_01',
      exerciseId: 'bodyweight_squat',
      exerciseName: 'Bodyweight Squat',
      startedAt: startedAtTime,
      completedAt: completedAtTime,
      durationSeconds: item.dur,
      formattedDuration: `${String(Math.floor(item.dur / 60)).padStart(2, '0')}:${String(item.dur % 60).padStart(2, '0')}`,
      totalReps: item.reps,
      averageFormScore: item.form,
      averageDepth: item.depth,
      averageControl: item.control,
      movementConsistency: Math.min(98, 75 + index * 2),
      painBefore: item.pBefore,
      painAfter: item.pAfter,
      painDelta,
      painTrend: painDelta < 0 ? PAIN_TREND.IMPROVED : painDelta > 0 ? PAIN_TREND.ELEVATED : PAIN_TREND.STABLE,
      reps: repsDetail,
      isSampleCohort: true,
    };
  });
}
