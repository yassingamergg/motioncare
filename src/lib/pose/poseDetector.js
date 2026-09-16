import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let cachedLandmarker = null;
let cachedVision = null;

/**
 * Initialize MediaPipe PoseLandmarker instance.
 * Attempts fast local WASM + local model assets first, with automatic fallback
 * to CDN and CPU delegate if WebGL/GPU acceleration is restricted.
 *
 * @param {object} [options]
 * @param {'GPU'|'CPU'} [options.delegate='GPU']
 * @returns {Promise<PoseLandmarker>}
 */
export async function createPoseDetector(options = {}) {
  if (cachedLandmarker) {
    return cachedLandmarker;
  }

  const delegate = options.delegate || 'GPU';

  // 1. Resolve WASM assets
  if (!cachedVision) {
    try {
      cachedVision = await FilesetResolver.forVisionTasks('/wasm');
    } catch (wasmLocalErr) {
      console.warn('[MotionCare] Local WASM load failed, using official CDN resolver:', wasmLocalErr);
      cachedVision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
      );
    }
  }

  // 2. Load Model (Local -> CDN fallback)
  const localModelPath = '/models/pose_landmarker_lite.task';
  const cdnModelPath =
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

  const baseConfig = {
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  };

  // Attempt 1: Local Model + requested delegate (GPU preferred)
  try {
    cachedLandmarker = await PoseLandmarker.createFromOptions(cachedVision, {
      ...baseConfig,
      baseOptions: {
        modelAssetPath: localModelPath,
        delegate,
      },
    });
    console.info(`[MotionCare] PoseLandmarker ready (${delegate}, local model)`);
    return cachedLandmarker;
  } catch (err1) {
    console.warn(`[MotionCare] Initialization failed with ${delegate}, trying CPU fallback:`, err1);
  }

  // Attempt 2: Local Model + CPU
  try {
    cachedLandmarker = await PoseLandmarker.createFromOptions(cachedVision, {
      ...baseConfig,
      baseOptions: {
        modelAssetPath: localModelPath,
        delegate: 'CPU',
      },
    });
    console.info('[MotionCare] PoseLandmarker ready (CPU, local model)');
    return cachedLandmarker;
  } catch (err2) {
    console.warn('[MotionCare] Local model CPU initialization failed, trying CDN model:', err2);
  }

  // Attempt 3: CDN Model + CPU fallback
  cachedLandmarker = await PoseLandmarker.createFromOptions(cachedVision, {
    ...baseConfig,
    baseOptions: {
      modelAssetPath: cdnModelPath,
      delegate: 'CPU',
    },
  });
  console.info('[MotionCare] PoseLandmarker ready (CPU, CDN fallback)');
  return cachedLandmarker;
}

/**
 * Execute real-time pose detection on a single video frame.
 *
 * @param {PoseLandmarker} landmarker
 * @param {HTMLVideoElement} video
 * @param {number} timestampMs
 * @returns {import('@mediapipe/tasks-vision').PoseLandmarkerResult|null}
 */
export function detectPoseInFrame(landmarker, video, timestampMs) {
  if (!landmarker || !video || video.readyState < 2 || video.paused) {
    return null;
  }

  try {
    return landmarker.detectForVideo(video, timestampMs);
  } catch (err) {
    console.error('[MotionCare] Error during pose detection:', err);
    return null;
  }
}

/**
 * Disposes the active landmarker instance
 */
export function disposePoseDetector() {
  if (cachedLandmarker) {
    try {
      cachedLandmarker.close();
    } catch (e) {
      console.warn('Error closing pose landmarker:', e);
    }
    cachedLandmarker = null;
  }
}
