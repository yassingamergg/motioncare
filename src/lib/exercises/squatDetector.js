/**
 * MotionCare Squat Repetition Detector & Kinematic Engine
 *
 * Implements a finite state machine (FSM):
 *   STANDING -> DESCENDING -> BOTTOM -> ASCENDING -> STANDING (Rep Counted)
 *
 * Employs hysteresis thresholds, temporal validation, and signal smoothing
 * to eliminate false positives and prevent double-counting.
 */

export const SQUAT_STATES = {
  STANDING: 'STANDING',
  DESCENDING: 'DESCENDING',
  BOTTOM: 'BOTTOM',
  ASCENDING: 'ASCENDING',
};

export class SquatDetector {
  constructor(config = {}) {
    this.config = {
      // Biomechanical Angle Thresholds (in degrees)
      standingKneeAngle: 155,       // Above this is considered standing
      descendingThreshold: 140,     // Drop below this initiates descent
      targetDepthAngle: 100,        // Reaching this or lower triggers BOTTOM phase (clinical target ~90-100°)
      deepThreshold: 75,            // Very deep flexion warning threshold
      ascendingThreshold: 115,      // Rising above this transitions to ascent
      
      // Temporal Bounds (in milliseconds)
      minRepDurationMs: 1000,       // Faster than 1.0s is rejected as jitter/glitch
      maxRepDurationMs: 8000,       // Slower than 8.0s triggers timeout reset
      minBottomHoldMs: 100,         // Minimum stabilization duration at bottom

      // Exponential moving average smoothing factor
      smoothingAlpha: 0.65,

      ...config,
    };

    this.reset();
  }

  /**
   * Reset detector state and clear history
   */
  reset() {
    this.state = SQUAT_STATES.STANDING;
    this.reps = 0;
    this.completedReps = [];

    // Active repetition tracking state
    this.repStartTime = null;
    this.bottomStartTime = null;
    this.ascentStartTime = null;
    this.lowestKneeAngle = 180;
    this.peakHipAngle = 180;
    this.peakTorsoLean = 0;

    // Smoothed values
    this.smoothedKneeAngle = null;
    this.smoothedHipAngle = null;

    // Live feedback flags
    this.currentFeedback = 'Stand upright to begin';
    this.lastRepMetrics = null;
  }

  /**
   * Exponential moving average filter
   */
  smooth(previous, current) {
    if (previous === null || previous === undefined) return current;
    return this.config.smoothingAlpha * current + (1 - this.config.smoothingAlpha) * previous;
  }

  /**
   * Process a single video frame telemetry
   *
   * @param {number} timestampMs - Frame timestamp in ms (performance.now())
   * @param {object} keypoints - Structured keypoints from poseFormatter
   * @param {object} jointAngles - Pre-computed angles: { leftKnee, rightKnee, torsoLean, ... }
   * @returns {object} Current repetition state, metrics, and live feedback
   */
  update(timestampMs, keypoints, jointAngles = {}) {
    const { leftKnee, rightKnee, torsoLean } = jointAngles;

    // Determine primary working knee angle (use average if both visible, or whichever is available)
    let rawKneeAngle = null;
    if (leftKnee != null && rightKnee != null) {
      rawKneeAngle = (leftKnee + rightKnee) / 2;
    } else if (leftKnee != null) {
      rawKneeAngle = leftKnee;
    } else if (rightKnee != null) {
      rawKneeAngle = rightKnee;
    }

    if (rawKneeAngle == null) {
      return this.getStateSnapshot();
    }

    // Apply smoothing filter to eliminate camera jitter
    this.smoothedKneeAngle = this.smooth(this.smoothedKneeAngle, rawKneeAngle);
    const kneeAngle = Math.round(this.smoothedKneeAngle * 10) / 10;

    // Track torso lean
    const currentTorsoLean = torsoLean ?? 0;

    // State Machine Transitions
    switch (this.state) {
      case SQUAT_STATES.STANDING: {
        this.currentFeedback = 'Ready. Lower into squat';

        // Check for initiation of descent
        if (kneeAngle <= this.config.descendingThreshold) {
          this.state = SQUAT_STATES.DESCENDING;
          this.repStartTime = timestampMs;
          this.lowestKneeAngle = kneeAngle;
          this.peakTorsoLean = currentTorsoLean;
          this.currentFeedback = 'Descending... Control the movement';
        }
        break;
      }

      case SQUAT_STATES.DESCENDING: {
        // Track lowest angle reached
        if (kneeAngle < this.lowestKneeAngle) {
          this.lowestKneeAngle = kneeAngle;
        }
        if (currentTorsoLean > this.peakTorsoLean) {
          this.peakTorsoLean = currentTorsoLean;
        }

        // Timeout check: if stalled in descending too long, reset to standing
        if (timestampMs - this.repStartTime > this.config.maxRepDurationMs) {
          this.state = SQUAT_STATES.STANDING;
          this.repStartTime = null;
          this.currentFeedback = 'Movement timeout. Stand upright';
          break;
        }

        // Aborted rep check: patient stood back up without reaching depth
        if (kneeAngle >= this.config.standingKneeAngle) {
          this.state = SQUAT_STATES.STANDING;
          this.repStartTime = null;
          this.currentFeedback = 'Incomplete rep. Try to reach target depth';
          break;
        }

        // Check if reached target depth (BOTTOM)
        if (kneeAngle <= this.config.targetDepthAngle) {
          this.state = SQUAT_STATES.BOTTOM;
          this.bottomStartTime = timestampMs;
          this.currentFeedback = 'Target depth reached. Push through heels to stand';
        }
        break;
      }

      case SQUAT_STATES.BOTTOM: {
        // Continue tracking peak depth in bottom zone
        if (kneeAngle < this.lowestKneeAngle) {
          this.lowestKneeAngle = kneeAngle;
        }
        if (currentTorsoLean > this.peakTorsoLean) {
          this.peakTorsoLean = currentTorsoLean;
        }

        // Timeout check
        if (timestampMs - this.repStartTime > this.config.maxRepDurationMs) {
          this.state = SQUAT_STATES.STANDING;
          this.repStartTime = null;
          this.currentFeedback = 'Movement timeout. Resetting';
          break;
        }

        // Transition to ASCENDING when angle rises above ascent threshold
        const timeAtBottom = timestampMs - this.bottomStartTime;
        if (kneeAngle >= this.config.ascendingThreshold && timeAtBottom >= this.config.minBottomHoldMs) {
          this.state = SQUAT_STATES.ASCENDING;
          this.ascentStartTime = timestampMs;
          this.currentFeedback = 'Ascending... Stand fully upright';
        }
        break;
      }

      case SQUAT_STATES.ASCENDING: {
        // Timeout check
        if (timestampMs - this.repStartTime > this.config.maxRepDurationMs) {
          this.state = SQUAT_STATES.STANDING;
          this.repStartTime = null;
          this.currentFeedback = 'Movement timeout. Stand upright';
          break;
        }

        // Completed Repetition: Knee angle returned to standing position
        if (kneeAngle >= this.config.standingKneeAngle) {
          const totalDurationMs = timestampMs - this.repStartTime;

          // Temporal validation: ensure rep wasn't an instantaneous glitch
          if (totalDurationMs >= this.config.minRepDurationMs) {
            const descentDuration = Math.round((this.bottomStartTime - this.repStartTime) / 100) / 10;
            const ascentDuration = Math.round((timestampMs - (this.ascentStartTime || this.bottomStartTime)) / 100) / 10;
            const totalDuration = Math.round(totalDurationMs / 100) / 10;

            this.reps += 1;

            const repRecord = {
              repIndex: this.reps,
              maxDepth: Math.round(this.lowestKneeAngle * 10) / 10,
              targetDepth: this.config.targetDepthAngle,
              descentDuration: Math.max(0.1, descentDuration),
              ascentDuration: Math.max(0.1, ascentDuration),
              totalDuration: Math.max(0.2, totalDuration),
              torsoLean: Math.round(this.peakTorsoLean * 10) / 10,
              timestamp: new Date().toISOString(),
            };

            this.completedReps.push(repRecord);
            this.lastRepMetrics = repRecord;
            this.currentFeedback = `Rep ${this.reps} completed! Depth: ${repRecord.maxDepth}°`;
          } else {
            this.currentFeedback = 'Movement too rapid. Perform with steady control';
          }

          // Return to STANDING state ready for next rep
          this.state = SQUAT_STATES.STANDING;
          this.repStartTime = null;
          this.bottomStartTime = null;
          this.ascentStartTime = null;
          this.lowestKneeAngle = 180;
          this.peakTorsoLean = 0;
        }
        break;
      }

      default:
        this.state = SQUAT_STATES.STANDING;
    }

    return this.getStateSnapshot();
  }

  /**
   * Get current state snapshot and telemetry
   */
  getStateSnapshot() {
    const currentAngle = this.smoothedKneeAngle != null ? Math.round(this.smoothedKneeAngle * 10) / 10 : null;

    // Calculate percentage progress to target depth (0% at standing, 100% at target depth)
    let depthProgress = 0;
    if (currentAngle != null) {
      const standing = this.config.standingKneeAngle;
      const target = this.config.targetDepthAngle;
      depthProgress = Math.max(0, Math.min(100, Math.round(((standing - currentAngle) / (standing - target)) * 100)));
    }

    return {
      state: this.state,
      reps: this.reps,
      currentAngle,
      lowestKneeAngle: this.lowestKneeAngle !== 180 ? Math.round(this.lowestKneeAngle * 10) / 10 : null,
      depthProgress,
      feedback: this.currentFeedback,
      lastRep: this.lastRepMetrics,
      completedReps: this.completedReps,
      sessionSummary: this.calculateSessionSummary(),
    };
  }

  /**
   * Calculate cumulative session kinematic metrics
   */
  calculateSessionSummary() {
    if (this.completedReps.length === 0) {
      return {
        totalReps: 0,
        averageDepth: null,
        averageDuration: null,
        movementConsistency: null,
      };
    }

    const depths = this.completedReps.map((r) => r.maxDepth);
    const durations = this.completedReps.map((r) => r.totalDuration);

    const avgDepth = Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10;
    const avgDuration = Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;

    // Calculate standard deviation of depth across reps
    const depthVariance =
      depths.reduce((acc, val) => acc + Math.pow(val - avgDepth, 2), 0) / depths.length;
    const depthStdDev = Math.sqrt(depthVariance);

    // Consistency score (0 - 100): High consistency if depth std deviation < 5°
    // 0 std dev = 100%, 15° std dev = 50%
    const consistencyScore = Math.max(
      40,
      Math.min(100, Math.round(100 - (depthStdDev / 15) * 50))
    );

    return {
      totalReps: this.completedReps.length,
      averageDepth: avgDepth,
      averageDuration: avgDuration,
      movementConsistency: consistencyScore,
    };
  }
}
