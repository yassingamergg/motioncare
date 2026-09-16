/**
 * MotionCare Session Lifecycle & Data Aggregation Engine
 *
 * Lifecycle:
 *   READY -> ACTIVE -> PAIN_REPORT -> COMPLETED
 */

export const SESSION_STATUS = {
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAIN_REPORT: 'PAIN_REPORT',
  COMPLETED: 'COMPLETED',
};

export const PAIN_TREND = {
  IMPROVED: 'IMPROVED',     // Pain decreased post-exercise
  STABLE: 'STABLE',         // Pain unchanged
  ELEVATED: 'ELEVATED',     // Pain increased post-exercise
};

export class SessionManager {
  constructor(exercise = { id: 'bodyweight_squat', name: 'Bodyweight Squat' }) {
    this.exercise = exercise;
    this.reset();
  }

  reset() {
    this.status = SESSION_STATUS.READY;
    this.id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.startedAt = null;
    this.completedAt = null;
    this.startTimeMs = null;
    this.durationSeconds = 0;
    this.painBefore = null;
    this.painAfter = null;
    this.painDelta = null;
    this.painTrend = null;
    this.summary = null;
  }

  /**
   * Start an active rehabilitation session
   *
   * @param {number} painBefore - Patient reported baseline pain (0 - 10)
   */
  start(painBefore = 0) {
    this.status = SESSION_STATUS.ACTIVE;
    this.painBefore = Math.max(0, Math.min(10, Math.round(painBefore)));
    this.startedAt = new Date().toISOString();
    this.startTimeMs = performance.now();
  }

  /**
   * Transition to post-exercise pain report
   */
  finish() {
    if (this.status === SESSION_STATUS.ACTIVE) {
      this.status = SESSION_STATUS.PAIN_REPORT;
      if (this.startTimeMs && this.durationSeconds === 0) {
        this.durationSeconds = Math.max(1, Math.round((performance.now() - this.startTimeMs) / 1000));
      }
    }
  }

  /**
   * Complete the session with post-exercise pain and aggregate metrics
   *
   * @param {number} painAfter - Patient reported post-exercise pain (0 - 10)
   * @param {Array<object>} completedReps - Array of completed rep records
   * @param {Array<object>} [formAnalysisList=[]] - Rep-by-rep form evaluations
   * @param {number} [movementConsistency=85] - Consistency score
   * @returns {object} Final compiled session summary object
   */
  complete(painAfter = 0, completedReps = [], formAnalysisList = [], movementConsistency = 85) {
    this.status = SESSION_STATUS.COMPLETED;
    this.completedAt = new Date().toISOString();
    this.painAfter = Math.max(0, Math.min(10, Math.round(painAfter)));

    // Calculate Pain Delta
    this.painDelta = this.painAfter - (this.painBefore ?? 0);
    if (this.painDelta < 0) {
      this.painTrend = PAIN_TREND.IMPROVED;
    } else if (this.painDelta === 0) {
      this.painTrend = PAIN_TREND.STABLE;
    } else {
      this.painTrend = PAIN_TREND.ELEVATED;
    }

    // Aggregate kinematic metrics
    const totalReps = completedReps.length;
    let averageDepth = null;
    let averageDuration = null;
    let averageFormScore = 85;
    let averageControl = 85;

    if (totalReps > 0) {
      const depths = completedReps.map((r) => r.maxDepth);
      const durations = completedReps.map((r) => r.totalDuration);
      averageDepth = Math.round((depths.reduce((a, b) => a + b, 0) / totalReps) * 10) / 10;
      averageDuration = Math.round((durations.reduce((a, b) => a + b, 0) / totalReps) * 10) / 10;

      if (formAnalysisList && formAnalysisList.length > 0) {
        const formScores = formAnalysisList.map((f) => f.overallScore);
        const controlScores = formAnalysisList.map((f) => f.controlScore);
        averageFormScore = Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length);
        averageControl = Math.round(controlScores.reduce((a, b) => a + b, 0) / controlScores.length);
      }
    }

    this.summary = {
      id: this.id,
      exerciseId: this.exercise.id,
      exerciseName: this.exercise.name,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      durationSeconds: this.durationSeconds,
      formattedDuration: this.formatDuration(this.durationSeconds),
      painBefore: this.painBefore,
      painAfter: this.painAfter,
      painDelta: this.painDelta,
      painTrend: this.painTrend,
      totalReps,
      averageDepth,
      averageDuration,
      averageFormScore,
      averageControl,
      movementConsistency: Math.round(movementConsistency),
      reps: completedReps,
    };

    return this.summary;
  }

  /**
   * Format seconds to MM:SS string
   */
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
