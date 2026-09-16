/**
 * MotionCare Rule-Based Form Analysis & Form Score Engine
 *
 * Evaluates repetitions against biomechanical criteria:
 * 1. Squat Depth (flexion vs clinical target)
 * 2. Knee Alignment / Valgus (inward tracking relative to foot)
 * 3. Torso Alignment (trunk verticality)
 * 4. Movement Control & Tempo (descent velocity and smoothness)
 *
 * Generates a prioritized assistive feedback message and computes
 * the composite non-clinical "MotionCare Form Score".
 */

export const FEEDBACK_PRIORITY = {
  VALGUS: 100,      // Highest priority: joint strain / injury risk
  TORSO: 80,        // Excessive spinal load / forward lean
  TEMPO: 60,        // Speed / uncontrolled descent
  DEPTH: 40,        // Range of motion adjustment
  POSITIVE: 10,     // Encouraging reinforcement
};

export class FormAnalyzer {
  constructor(config = {}) {
    this.config = {
      targetDepth: 95,          // Ideal clinical squat knee angle
      depthTolerance: 10,       // +/- acceptable range (85° - 105°)
      maxAcceptableDepth: 75,   // Below this is considered deep squat
      minAcceptableDepth: 110,  // Above this is considered high/shallow

      maxTorsoLean: 38,         // Optimal torso lean angle in degrees
      excessiveTorsoLean: 48,   // Above this triggers posture warning

      minDescentTime: 1.1,      // Controlled descent in seconds
      fastDescentWarning: 0.8,  // Faster than 0.8s triggers speed warning

      valgusThreshold: 0.045,   // Normalized X-axis deviation indicating inward knee collapse

      // Weights for overall Form Score
      weights: {
        depth: 0.35,
        alignment: 0.25,
        control: 0.20,
        consistency: 0.20,
      },

      ...config,
    };
  }

  /**
   * Evaluates knee valgus (inward knee collapse) from keypoints
   *
   * In 2D normalized coordinates:
   * Left leg: hip.x < knee.x < ankle.x (facing camera, or mirrored)
   * Valgus occurs when knees track closer together than ankles.
   *
   * @param {object} keypoints - Structured keypoints
   * @returns {{ hasValgus: boolean, deviation: number, score: number }}
   */
  evaluateKneeAlignment(keypoints) {
    if (!keypoints) {
      return { hasValgus: false, deviation: 0, score: 90 };
    }

    const { leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle } = keypoints;

    let totalScore = 100;
    let maxDeviation = 0;
    let hasValgus = false;

    // Check if lower body points are visible
    const isVisible = (pt) => pt && (pt.visibility ?? 1) >= 0.4;

    if (isVisible(leftHip) && isVisible(leftKnee) && isVisible(leftAnkle) &&
        isVisible(rightHip) && isVisible(rightKnee) && isVisible(rightAnkle)) {
      
      const hipDist = Math.abs(rightHip.x - leftHip.x);
      const kneeDist = Math.abs(rightKnee.x - leftKnee.x);
      const ankleDist = Math.abs(rightAnkle.x - leftAnkle.x);

      // Knee distance significantly smaller than ankle distance indicates knees caving inward
      if (ankleDist > 0.05) {
        const kneeToAnkleRatio = kneeDist / ankleDist;
        if (kneeToAnkleRatio < 0.72) {
          hasValgus = true;
          maxDeviation = Math.round((0.72 - kneeToAnkleRatio) * 100) / 100;
          totalScore = Math.max(40, Math.round(100 - maxDeviation * 250));
        } else {
          totalScore = Math.min(100, Math.round(85 + (kneeToAnkleRatio >= 0.85 ? 15 : 5)));
        }
      }
    }

    return {
      hasValgus,
      deviation: maxDeviation,
      score: totalScore,
    };
  }

  /**
   * Evaluates a completed repetition and produces sub-scores & prioritized feedback
   *
   * @param {object} repRecord - Repetition data from SquatDetector
   * @param {object} [keypoints] - Keypoints at bottom or completion
   * @param {number} [sessionConsistency=90] - Consistency score from detector
   * @returns {object} Full analysis with MotionCare Form Score and prioritized feedback
   */
  analyzeRepetition(repRecord, keypoints = null, sessionConsistency = 90) {
    const feedbackItems = [];

    // 1. Evaluate Depth Score
    const actualDepth = repRecord.maxDepth;
    const target = this.config.targetDepth;
    const depthDiff = Math.abs(actualDepth - target);

    let depthScore = 100;
    if (depthDiff > this.config.depthTolerance) {
      const excess = depthDiff - this.config.depthTolerance;
      depthScore = Math.max(30, Math.round(100 - excess * 2.5));
    }

    if (actualDepth > this.config.minAcceptableDepth) {
      feedbackItems.push({
        type: 'depth',
        priority: FEEDBACK_PRIORITY.DEPTH,
        severity: 'warning',
        message: 'Try descending slightly lower to reach target 90° depth.',
      });
    } else if (actualDepth < this.config.maxAcceptableDepth) {
      feedbackItems.push({
        type: 'depth',
        priority: FEEDBACK_PRIORITY.DEPTH - 5,
        severity: 'info',
        message: 'Deep squat achieved. Maintain control and joint comfort.',
      });
    } else {
      feedbackItems.push({
        type: 'depth',
        priority: FEEDBACK_PRIORITY.POSITIVE,
        severity: 'success',
        message: 'Optimal squat depth achieved.',
      });
    }

    // 2. Evaluate Alignment (Knee Valgus & Torso)
    const alignmentResult = this.evaluateKneeAlignment(keypoints);
    let alignmentScore = alignmentResult.score;

    if (alignmentResult.hasValgus) {
      feedbackItems.push({
        type: 'valgus',
        priority: FEEDBACK_PRIORITY.VALGUS,
        severity: 'warning',
        message: 'Keep your knees aligned with your feet (avoid letting knees cave inward).',
      });
    }

    // Evaluate Torso Posture
    const torsoLean = repRecord.torsoLean ?? 0;
    let torsoScore = 100;
    if (torsoLean > this.config.excessiveTorsoLean) {
      const excessLean = torsoLean - this.config.maxTorsoLean;
      torsoScore = Math.max(35, Math.round(100 - excessLean * 2.8));
      feedbackItems.push({
        type: 'torso',
        priority: FEEDBACK_PRIORITY.TORSO,
        severity: 'warning',
        message: 'Keep your chest lifted and back more upright.',
      });
    } else if (torsoLean > this.config.maxTorsoLean) {
      const excessLean = torsoLean - this.config.maxTorsoLean;
      torsoScore = Math.max(75, Math.round(100 - excessLean * 2.0));
    }

    // Alignment is average of knee tracking and torso posture
    alignmentScore = Math.round((alignmentScore * 0.6 + torsoScore * 0.4));

    // 3. Evaluate Movement Tempo & Control
    const descentTime = repRecord.descentDuration ?? 1.5;
    let controlScore = 100;

    if (descentTime < this.config.fastDescentWarning) {
      controlScore = Math.max(40, Math.round((descentTime / this.config.minDescentTime) * 80));
      feedbackItems.push({
        type: 'tempo',
        priority: FEEDBACK_PRIORITY.TEMPO,
        severity: 'warning',
        message: 'Slow down and control the downward movement.',
      });
    } else if (descentTime < this.config.minDescentTime) {
      controlScore = 85;
    } else {
      controlScore = 95;
    }

    // 4. Movement Consistency
    const consistencyScore = Math.max(40, Math.min(100, Math.round(sessionConsistency)));

    // 5. Compute Composite MotionCare Form Score
    const { weights } = this.config;
    const overallScore = Math.round(
      depthScore * weights.depth +
      alignmentScore * weights.alignment +
      controlScore * weights.control +
      consistencyScore * weights.consistency
    );

    // 6. Select Top-Priority Feedback (avoid cognitive overload)
    feedbackItems.sort((a, b) => b.priority - a.priority);
    const prioritizedFeedback = feedbackItems[0] || {
      type: 'good',
      priority: FEEDBACK_PRIORITY.POSITIVE,
      severity: 'success',
      message: 'Good movement control and posture.',
    };

    return {
      repIndex: repRecord.repIndex,
      depthScore,
      alignmentScore,
      controlScore,
      consistencyScore,
      overallScore,
      prioritizedFeedback,
      allFeedback: feedbackItems,
      metrics: {
        maxDepth: actualDepth,
        torsoLean,
        descentDuration: descentTime,
        ascentDuration: repRecord.ascentDuration,
        totalDuration: repRecord.totalDuration,
      },
    };
  }

  /**
   * Generates live real-time assistive guidance during an active repetition
   *
   * @param {object} jointAngles - Live angles { leftKnee, rightKnee, torsoLean }
   * @param {object} keypoints - Live keypoints
   * @param {string} currentState - SQUAT_STATES (DESCENDING, BOTTOM, etc.)
   * @returns {{ severity: 'info'|'warning'|'success', message: string }}
   */
  evaluateLiveFrame(jointAngles, keypoints, currentState) {
    if (currentState === 'DESCENDING') {
      const torso = jointAngles?.torsoLean;
      if (torso != null && torso > this.config.excessiveTorsoLean) {
        return {
          severity: 'warning',
          message: 'Chest up — avoid leaning too far forward.',
        };
      }

      const alignment = this.evaluateKneeAlignment(keypoints);
      if (alignment.hasValgus) {
        return {
          severity: 'warning',
          message: 'Keep knees outward and tracking over toes.',
        };
      }

      return {
        severity: 'info',
        message: 'Descending with control toward 90°...',
      };
    }

    if (currentState === 'BOTTOM') {
      return {
        severity: 'success',
        message: 'Target depth reached! Push through heels.',
      };
    }

    if (currentState === 'ASCENDING') {
      return {
        severity: 'info',
        message: 'Ascending steadily. Stand tall.',
      };
    }

    return {
      severity: 'info',
      message: 'Stand upright and begin squat when ready.',
    };
  }
}
