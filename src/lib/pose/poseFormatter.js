import { POSE_LANDMARKS } from './poseLandmarks.js';

/**
 * Format raw MediaPipe landmarks array into a clean, structured object
 * with named clinical joints.
 *
 * @param {Array<{x: number, y: number, z: number, visibility?: number}>} rawLandmarks
 * @param {Array<{x: number, y: number, z: number, visibility?: number}>} [worldLandmarks]
 * @returns {object|null}
 */
export function formatPoseLandmarks(rawLandmarks, worldLandmarks = null) {
  if (!rawLandmarks || rawLandmarks.length === 0) {
    return null;
  }

  const getPoint = (idx) => {
    const lm = rawLandmarks[idx];
    if (!lm) return null;
    return {
      x: lm.x,
      y: lm.y,
      z: lm.z ?? 0,
      visibility: lm.visibility ?? 1.0,
    };
  };

  const getWorldPoint = (idx) => {
    if (!worldLandmarks || !worldLandmarks[idx]) return null;
    const wlm = worldLandmarks[idx];
    return {
      x: wlm.x,
      y: wlm.y,
      z: wlm.z,
      visibility: wlm.visibility ?? 1.0,
    };
  };

  return {
    raw: rawLandmarks,
    world: worldLandmarks,
    keypoints: {
      nose: getPoint(POSE_LANDMARKS.NOSE),
      leftEye: getPoint(POSE_LANDMARKS.LEFT_EYE),
      rightEye: getPoint(POSE_LANDMARKS.RIGHT_EYE),
      leftEar: getPoint(POSE_LANDMARKS.LEFT_EAR),
      rightEar: getPoint(POSE_LANDMARKS.RIGHT_EAR),
      leftShoulder: getPoint(POSE_LANDMARKS.LEFT_SHOULDER),
      rightShoulder: getPoint(POSE_LANDMARKS.RIGHT_SHOULDER),
      leftElbow: getPoint(POSE_LANDMARKS.LEFT_ELBOW),
      rightElbow: getPoint(POSE_LANDMARKS.RIGHT_ELBOW),
      leftWrist: getPoint(POSE_LANDMARKS.LEFT_WRIST),
      rightWrist: getPoint(POSE_LANDMARKS.RIGHT_WRIST),
      leftHip: getPoint(POSE_LANDMARKS.LEFT_HIP),
      rightHip: getPoint(POSE_LANDMARKS.RIGHT_HIP),
      leftKnee: getPoint(POSE_LANDMARKS.LEFT_KNEE),
      rightKnee: getPoint(POSE_LANDMARKS.RIGHT_KNEE),
      leftAnkle: getPoint(POSE_LANDMARKS.LEFT_ANKLE),
      rightAnkle: getPoint(POSE_LANDMARKS.RIGHT_ANKLE),
      leftHeel: getPoint(POSE_LANDMARKS.LEFT_HEEL),
      rightHeel: getPoint(POSE_LANDMARKS.RIGHT_HEEL),
      leftFootIndex: getPoint(POSE_LANDMARKS.LEFT_FOOT_INDEX),
      rightFootIndex: getPoint(POSE_LANDMARKS.RIGHT_FOOT_INDEX),
    },
    worldKeypoints: worldLandmarks
      ? {
          leftShoulder: getWorldPoint(POSE_LANDMARKS.LEFT_SHOULDER),
          rightShoulder: getWorldPoint(POSE_LANDMARKS.RIGHT_SHOULDER),
          leftElbow: getWorldPoint(POSE_LANDMARKS.LEFT_ELBOW),
          rightElbow: getWorldPoint(POSE_LANDMARKS.RIGHT_ELBOW),
          leftWrist: getWorldPoint(POSE_LANDMARKS.LEFT_WRIST),
          rightWrist: getWorldPoint(POSE_LANDMARKS.RIGHT_WRIST),
          leftHip: getWorldPoint(POSE_LANDMARKS.LEFT_HIP),
          rightHip: getWorldPoint(POSE_LANDMARKS.RIGHT_HIP),
          leftKnee: getWorldPoint(POSE_LANDMARKS.LEFT_KNEE),
          rightKnee: getWorldPoint(POSE_LANDMARKS.RIGHT_KNEE),
          leftAnkle: getWorldPoint(POSE_LANDMARKS.LEFT_ANKLE),
          rightAnkle: getWorldPoint(POSE_LANDMARKS.RIGHT_ANKLE),
        }
      : null,
  };
}

/**
 * Check if the critical points for squat or general exercise are visible
 */
export function checkLandmarkVisibility(landmark, minVisibility = 0.5) {
  if (!landmark) return false;
  return (landmark.visibility ?? 1.0) >= minVisibility;
}

/**
 * Check if full body (hips, knees, ankles) is visible for lower-body rehab
 */
export function isLowerBodyTracked(keypoints, minVis = 0.4) {
  if (!keypoints) return false;
  const { leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle } = keypoints;
  const leftLeg = checkLandmarkVisibility(leftHip, minVis) &&
                  checkLandmarkVisibility(leftKnee, minVis) &&
                  checkLandmarkVisibility(leftAnkle, minVis);
  const rightLeg = checkLandmarkVisibility(rightHip, minVis) &&
                   checkLandmarkVisibility(rightKnee, minVis) &&
                   checkLandmarkVisibility(rightAnkle, minVis);
  return leftLeg || rightLeg;
}
