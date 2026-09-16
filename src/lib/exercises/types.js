/**
 * MotionCare Exercise Architecture
 * Defines standard exercise schema, target joint configuration,
 * and biomechanical form constraints.
 */

export const SQUAT_EXERCISE = {
  id: 'bodyweight_squat',
  name: 'Bodyweight Squat',
  category: 'Lower Extremity Rehabilitation',
  description: 'Functional lower-body rehabilitation movement targeting knee flexion, quadriceps, and hip stability.',
  targetJoints: [
    { id: 'leftKnee', name: 'Left Knee Flexion', vertex: 'leftKnee', a: 'leftHip', c: 'leftAnkle' },
    { id: 'rightKnee', name: 'Right Knee Flexion', vertex: 'rightKnee', a: 'rightHip', c: 'rightAnkle' },
    { id: 'leftHip', name: 'Left Hip Flexion', vertex: 'leftHip', a: 'leftShoulder', c: 'leftKnee' },
    { id: 'rightHip', name: 'Right Hip Flexion', vertex: 'rightHip', a: 'rightShoulder', c: 'rightKnee' },
  ],
  targetRange: {
    standingKneeAngle: 165, // Degrees near extension
    inflectionThreshold: 140, // Trigger descending
    targetSquatDepth: 95,   // Configurable clinical target angle
    deepThreshold: 80,      // Max recommended depth
  },
  repDetection: {
    startState: 'STANDING',
    states: ['STANDING', 'DESCENDING', 'BOTTOM', 'ASCENDING', 'COMPLETED'],
    minRepDurationMs: 1200,
    maxRepDurationMs: 6000,
  },
  formRules: [
    {
      id: 'depth_check',
      label: 'Squat Depth',
      tolerance: 15,
      weight: 0.35,
    },
    {
      id: 'knee_valgus',
      label: 'Knee Alignment',
      tolerance: 0.08,
      weight: 0.25,
    },
    {
      id: 'torso_lean',
      label: 'Torso Uprightness',
      maxLeanDeg: 45,
      weight: 0.20,
    },
    {
      id: 'tempo_control',
      label: 'Movement Control',
      minDuration: 1.5,
      weight: 0.20,
    },
  ],
};

export const SUPPORTED_EXERCISES = [SQUAT_EXERCISE];
