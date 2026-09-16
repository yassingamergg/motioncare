/**
 * MotionCare Biomechanical Geometry Engine
 * Independent mathematical calculation utilities for joint kinematics,
 * posture alignment, and range of motion.
 */

/**
 * Calculates the interior angle (in degrees) formed at vertex B between points A and C.
 * For example: calculateAngle(hip, knee, ankle) calculates knee flexion/extension.
 *
 * @param {{x: number, y: number, z?: number}} a - First point (e.g. Hip)
 * @param {{x: number, y: number, z?: number}} b - Vertex point (e.g. Knee)
 * @param {{x: number, y: number, z?: number}} c - Third point (e.g. Ankle)
 * @param {boolean} [use3D=false] - Whether to include Z coordinate in calculation
 * @returns {number|null} Angle in degrees [0, 180] or null if invalid inputs
 */
export function calculateAngle(a, b, c, use3D = false) {
  if (!a || !b || !c) return null;

  const v1 = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: use3D && a.z !== undefined && b.z !== undefined ? a.z - b.z : 0,
  };

  const v2 = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: use3D && c.z !== undefined && b.z !== undefined ? c.z - b.z : 0,
  };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return null;

  // Clamp cosine to [-1, 1] to prevent NaN from floating point precision issues
  const cosine = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleRad = Math.acos(cosine);
  const angleDeg = (angleRad * 180) / Math.PI;

  return Math.round(angleDeg * 10) / 10;
}

/**
 * Calculate Euclidean distance between two landmark points
 *
 * @param {{x: number, y: number, z?: number}} a
 * @param {{x: number, y: number, z?: number}} b
 * @param {boolean} [use3D=false]
 * @returns {number|null}
 */
export function calculateDistance(a, b, use3D = false) {
  if (!a || !b) return null;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = use3D && a.z !== undefined && b.z !== undefined ? a.z - b.z : 0;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate midpoint between two landmarks (e.g. center of hips or shoulders)
 *
 * @param {{x: number, y: number, z?: number}} a
 * @param {{x: number, y: number, z?: number}} b
 * @returns {{x: number, y: number, z: number}|null}
 */
export function calculateMidpoint(a, b) {
  if (!a || !b) return null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  };
}

/**
 * Calculates torso angle relative to true vertical (plumb line).
 * In image space, Y increases downwards.
 * A vector from hip to shoulder points upwards (negative dy).
 * Deviation from true vertical (dx = 0, dy = -1) gives torso lean angle.
 *
 * @param {{x: number, y: number}} hip
 * @param {{x: number, y: number}} shoulder
 * @returns {number|null} Deviation in degrees from vertical (0 = perfectly upright)
 */
export function calculateVerticalAlignment(hip, shoulder) {
  if (!hip || !shoulder) return null;
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y; // Negative if shoulder is above hip
  // Angle relative to straight up (dx=0, dy < 0)
  const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
  return Math.round(((angleRad * 180) / Math.PI) * 10) / 10;
}

/**
 * Calculates horizontal tilt (e.g. pelvic tilt or shoulder tilt)
 *
 * @param {{x: number, y: number}} leftPoint
 * @param {{x: number, y: number}} rightPoint
 * @returns {number|null} Angle in degrees (0 = level horizontal)
 */
export function calculateHorizontalTilt(leftPoint, rightPoint) {
  if (!leftPoint || !rightPoint) return null;
  const dx = rightPoint.x - leftPoint.x;
  const dy = rightPoint.y - leftPoint.y;
  const angleRad = Math.atan2(dy, dx);
  return Math.round(((angleRad * 180) / Math.PI) * 10) / 10;
}

/**
 * Calculates Range of Motion (ROM) metrics from an array of angle measurements
 *
 * @param {number[]} values
 * @returns {{min: number, max: number, rom: number, average: number}|null}
 */
export function calculateRangeOfMotion(values) {
  if (!values || values.length === 0) return null;
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  const average = Math.round((sum / valid.length) * 10) / 10;
  const rom = Math.round((max - min) * 10) / 10;

  return { min, max, rom, average };
}

/**
 * Calculates movement velocity (change in normalized position per second)
 *
 * @param {{x: number, y: number}} p1 - Previous position
 * @param {{x: number, y: number}} p2 - Current position
 * @param {number} timeDeltaSec - Elapsed time in seconds
 * @returns {number} Speed in normalized units/sec
 */
export function calculateMovementSpeed(p1, p2, timeDeltaSec) {
  if (!p1 || !p2 || timeDeltaSec <= 0) return 0;
  const dist = calculateDistance(p1, p2);
  return dist / timeDeltaSec;
}

/**
 * Exponential moving average (EMA) smoothing for landmark jitter reduction
 *
 * @param {{x: number, y: number, z?: number}} prev - Previous smoothed point
 * @param {{x: number, y: number, z?: number}} curr - Raw incoming point
 * @param {number} [alpha=0.6] - Weight for new value (0 to 1). Lower = smoother, higher = more responsive.
 * @returns {{x: number, y: number, z: number}}
 */
export function smoothPoint(prev, curr, alpha = 0.6) {
  if (!prev) return curr;
  if (!curr) return prev;
  return {
    x: alpha * curr.x + (1 - alpha) * prev.x,
    y: alpha * curr.y + (1 - alpha) * prev.y,
    z: alpha * (curr.z ?? 0) + (1 - alpha) * (prev.z ?? 0),
    visibility: curr.visibility,
  };
}
