import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraFeed } from '../../components/Camera/CameraFeed';
import { SkeletonCanvas } from '../../components/PoseOverlay/SkeletonCanvas';
import { LiveTrackerCard } from '../../components/MetricCard/LiveTrackerCard';
import { RepCounterCard } from '../../components/MetricCard/RepCounterCard';
import { FormScoreCard } from '../../components/MetricCard/FormScoreCard';
import { ClinicalDisclaimer } from '../../components/Common/ClinicalDisclaimer';
import { createPoseDetector, detectPoseInFrame, disposePoseDetector } from '../../lib/pose/poseDetector';
import { formatPoseLandmarks, checkLandmarkVisibility } from '../../lib/pose/poseFormatter';
import { calculateAngle, calculateVerticalAlignment, calculateMidpoint } from '../../lib/calculations/geometry';
import { SquatDetector } from '../../lib/exercises/squatDetector';
import { FormAnalyzer } from '../../lib/exercises/formAnalyzer';
import { SessionManager, SESSION_STATUS } from '../../lib/session/sessionManager';
import { SessionRepository } from '../../lib/supabase/sessionRepository';
import { PainReportModal } from '../../components/Feedback/PainReportModal';
import { SessionSummaryModal } from '../../components/SessionSummary/SessionSummaryModal';
import { VoiceCoach } from '../../lib/audio/voiceCoach';
import { AudioControls } from '../../components/Audio/AudioControls';
import { Eye, EyeOff, Layers, Sliders, CheckCircle, RefreshCw, AlertTriangle, Play, Square, Timer, RotateCcw, Database, Volume2 } from 'lucide-react';

export function PoseSessionView({ onFpsUpdate }) {
  // Model & detector state
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [modelError, setModelError] = useState(null);
  const landmarkerRef = useRef(null);

  // Camera & view controls
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // Real-time telemetry state
  const [trackingState, setTrackingState] = useState('STANDBY'); // 'STANDBY' | 'SEARCHING' | 'TRACKING'
  const [fps, setFps] = useState(0);
  const [jointAngles, setJointAngles] = useState({
    leftKnee: null,
    rightKnee: null,
    torsoLean: null,
    activeDepth: null,
  });
  const [structuredPose, setStructuredPose] = useState(null);

  // DOM element refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastTimestampRef = useRef(-1);
  const frameCountRef = useRef(0);
  const lastFpsCalcTimeRef = useRef(performance.now());
  const lostTrackingCounterRef = useRef(0);

  // Squat Repetition Detector Instance & Snapshot
  const squatDetectorRef = useRef(new SquatDetector());
  const [repSnapshot, setRepSnapshot] = useState(() => squatDetectorRef.current.getStateSnapshot());

  // Form Analyzer Engine Instance & Scoring State
  const formAnalyzerRef = useRef(new FormAnalyzer());
  const [formAnalysis, setFormAnalysis] = useState(null);
  const [liveFeedback, setLiveFeedback] = useState(null);
  const lastEvaluatedRepIndexRef = useRef(0);
  const formAnalysisHistoryRef = useRef([]);

  // Voice Coach Instance & Audio State
  const voiceCoachRef = useRef(new VoiceCoach());
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.9);
  const [audioRate, setAudioRate] = useState(1.05);
  const [enableAudioSfx, setEnableAudioSfx] = useState(true);
  const prevSquatStateRef = useRef('STANDING');

  const handleToggleAudioMute = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      voiceCoachRef.current.setMuted(next);
      return next;
    });
  };

  const handleAudioVolumeChange = (newVol) => {
    setAudioVolume(newVol);
    voiceCoachRef.current.setVolume(newVol);
  };

  const handleAudioRateChange = (newRate) => {
    setAudioRate(newRate);
    voiceCoachRef.current.setRate(newRate);
  };

  const handleToggleAudioSfx = () => {
    setEnableAudioSfx((prev) => {
      const next = !prev;
      voiceCoachRef.current.setEnableSfx(next);
      return next;
    });
  };

  const handleTestVoice = () => {
    voiceCoachRef.current.speak('Testing clinical voice coach. Maintain neutral spine alignment.', 100, true);
  };

  // Session Lifecycle Manager
  const sessionManagerRef = useRef(new SessionManager({ id: 'bodyweight_squat', name: 'Bodyweight Squat' }));
  const [sessionStatus, setSessionStatus] = useState(SESSION_STATUS.READY);
  const [activeDuration, setActiveDuration] = useState(0);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved_supabase' | 'saved_local'
  const [storedSessionsCount, setStoredSessionsCount] = useState(0);
  const [isPrePainModalOpen, setIsPrePainModalOpen] = useState(false);
  const [isPostPainModalOpen, setIsPostPainModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Initialize stored sessions count from vault
  useEffect(() => {
    SessionRepository.getSessionHistory()
      .then((history) => {
        if (history) setStoredSessionsCount(history.length);
      })
      .catch((err) => console.error('[MotionCare] Failed to load session count:', err));
  }, []);

  // Chronometer for active session duration
  useEffect(() => {
    let interval = null;
    if (sessionStatus === SESSION_STATUS.ACTIVE) {
      interval = setInterval(() => {
        if (sessionManagerRef.current.startTimeMs) {
          const secs = Math.max(0, Math.round((performance.now() - sessionManagerRef.current.startTimeMs) / 1000));
          setActiveDuration(secs);
        }
      }, 500);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStatus]);

  // Session Handlers
  const handleInitiateSession = () => {
    setIsCameraActive(true);
    setIsPrePainModalOpen(true);
  };

  const handleStartSession = (painBefore) => {
    sessionManagerRef.current.start(painBefore);
    squatDetectorRef.current.reset();
    formAnalysisHistoryRef.current = [];
    setRepSnapshot(squatDetectorRef.current.getStateSnapshot());
    setFormAnalysis(null);
    setActiveDuration(0);
    setSessionStatus(SESSION_STATUS.ACTIVE);
    setIsPrePainModalOpen(false);
    voiceCoachRef.current.speakSessionStart();
  };

  const handleFinishSession = () => {
    sessionManagerRef.current.finish();
    setSessionStatus(SESSION_STATUS.PAIN_REPORT);
    setIsPostPainModalOpen(true);
  };

  const handleCompleteSession = async (painAfter) => {
    const summary = sessionManagerRef.current.complete(
      painAfter,
      squatDetectorRef.current.completedReps,
      formAnalysisHistoryRef.current,
      repSnapshot?.sessionSummary?.movementConsistency ?? 85
    );
    setSessionSummary(summary);
    setSessionStatus(SESSION_STATUS.COMPLETED);
    setIsPostPainModalOpen(false);
    setIsSummaryModalOpen(true);
    voiceCoachRef.current.speakSessionComplete(summary.totalReps);

    // Persist to dual-mode storage (Supabase cloud & offline vault)
    setSaveStatus('saving');
    try {
      const res = await SessionRepository.saveSession(summary);
      setSaveStatus(res?.destination === 'supabase' ? 'saved_supabase' : 'saved_local');
      const history = await SessionRepository.getSessionHistory();
      if (history) setStoredSessionsCount(history.length);
    } catch (err) {
      console.error('[MotionCare] Failed to persist session:', err);
      setSaveStatus('saved_local');
    }
  };

  const handleStartNewSession = () => {
    sessionManagerRef.current.reset();
    squatDetectorRef.current.reset();
    formAnalysisHistoryRef.current = [];
    setRepSnapshot(squatDetectorRef.current.getStateSnapshot());
    setFormAnalysis(null);
    setSessionSummary(null);
    setSaveStatus('idle');
    setActiveDuration(0);
    setSessionStatus(SESSION_STATUS.READY);
    setIsSummaryModalOpen(false);
  };

  const handleResetReps = useCallback(() => {
    if (squatDetectorRef.current) {
      squatDetectorRef.current.reset();
      setRepSnapshot(squatDetectorRef.current.getStateSnapshot());
    }
    lastEvaluatedRepIndexRef.current = 0;
    formAnalysisHistoryRef.current = [];
    setFormAnalysis(null);
    setLiveFeedback(null);
  }, []);

  // 1. Initialize Pose Landmarker
  useEffect(() => {
    let isMounted = true;

    async function initModel() {
      try {
        setModelStatus('loading');
        setModelError(null);
        const detector = await createPoseDetector({ delegate: 'GPU' });
        if (isMounted) {
          landmarkerRef.current = detector;
          setModelStatus('ready');
        }
      } catch (err) {
        console.error('[MotionCare] Model initialization error:', err);
        if (isMounted) {
          setModelStatus('error');
          setModelError(err.message || 'Failed to initialize pose landmarker.');
        }
      }
    }

    initModel();

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      disposePoseDetector();
    };
  }, []);

  // 2. Real-time Pose Estimation Render Loop
  const processFrame = useCallback(() => {
    if (!isCameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.paused || video.ended || video.readyState < 2) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Sync canvas resolution with actual video stream resolution
    if (canvas && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    const now = performance.now();
    // Ensure monotonically increasing timestamp for MediaPipe VIDEO mode
    if (now <= lastTimestampRef.current) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastTimestampRef.current = now;

    // Detect pose in video frame
    const result = detectPoseInFrame(landmarker, video, now);

    // Calculate FPS
    frameCountRef.current += 1;
    if (now - lastFpsCalcTimeRef.current >= 1000) {
      const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcTimeRef.current));
      setFps(currentFps);
      if (onFpsUpdate) onFpsUpdate(currentFps);
      frameCountRef.current = 0;
      lastFpsCalcTimeRef.current = now;
    }

    if (result && result.landmarks && result.landmarks.length > 0 && result.landmarks[0].length > 0) {
      lostTrackingCounterRef.current = 0;
      setTrackingState('TRACKING');

      const rawLandmarks = result.landmarks[0];
      const worldLandmarks = result.worldLandmarks?.[0] || null;
      const formatted = formatPoseLandmarks(rawLandmarks, worldLandmarks);
      setStructuredPose(formatted);

      // Extract keypoints and compute biomechanical angles
      const kp = formatted.keypoints;

      let lKneeAngle = null;
      let rKneeAngle = null;
      let torsoAngle = null;

      // Left Knee Flexion: Hip -> Knee -> Ankle
      if (
        checkLandmarkVisibility(kp.leftHip, 0.45) &&
        checkLandmarkVisibility(kp.leftKnee, 0.45) &&
        checkLandmarkVisibility(kp.leftAnkle, 0.45)
      ) {
        lKneeAngle = calculateAngle(kp.leftHip, kp.leftKnee, kp.leftAnkle);
      }

      // Right Knee Flexion: Hip -> Knee -> Ankle
      if (
        checkLandmarkVisibility(kp.rightHip, 0.45) &&
        checkLandmarkVisibility(kp.rightKnee, 0.45) &&
        checkLandmarkVisibility(kp.rightAnkle, 0.45)
      ) {
        rKneeAngle = calculateAngle(kp.rightHip, kp.rightKnee, kp.rightAnkle);
      }

      // Torso Alignment: Mid Hip -> Mid Shoulder vs Vertical
      if (
        (checkLandmarkVisibility(kp.leftHip, 0.4) || checkLandmarkVisibility(kp.rightHip, 0.4)) &&
        (checkLandmarkVisibility(kp.leftShoulder, 0.4) || checkLandmarkVisibility(kp.rightShoulder, 0.4))
      ) {
        const hipRef =
          kp.leftHip && kp.rightHip
            ? calculateMidpoint(kp.leftHip, kp.rightHip)
            : kp.leftHip || kp.rightHip;
        const shoulderRef =
          kp.leftShoulder && kp.rightShoulder
            ? calculateMidpoint(kp.leftShoulder, kp.rightShoulder)
            : kp.leftShoulder || kp.rightShoulder;
        torsoAngle = calculateVerticalAlignment(hipRef, shoulderRef);
      }

      // Determine active depth (minimum knee angle reached)
      const validAngles = [lKneeAngle, rKneeAngle].filter((a) => a != null);
      const activeDepth = validAngles.length > 0 ? Math.min(...validAngles) : null;

      const currentAngles = {
        leftKnee: lKneeAngle,
        rightKnee: rKneeAngle,
        torsoLean: torsoAngle,
        activeDepth,
      };

      setJointAngles(currentAngles);

      // Feed kinematics into Squat Repetition Finite State Machine
      if (squatDetectorRef.current) {
        const snap = squatDetectorRef.current.update(now, kp, currentAngles);
        setRepSnapshot(snap);

        // Audio Biofeedback: Chime when bottom depth target is reached
        if (snap.state === 'BOTTOM' && prevSquatStateRef.current !== 'BOTTOM') {
          voiceCoachRef.current.speakTargetDepth();
        }
        prevSquatStateRef.current = snap.state;

        // Live real-time postural guidance during movement
        const liveGuide = formAnalyzerRef.current.evaluateLiveFrame(currentAngles, kp, snap.state);
        setLiveFeedback(liveGuide);

        // Spoken clinical guidance for high-priority form warnings during active session
        if (liveGuide && (liveGuide.severity === 'warning' || liveGuide.severity === 'danger') && sessionStatus === SESSION_STATUS.ACTIVE) {
          voiceCoachRef.current.speakFormFeedback(liveGuide);
        }

        // When a new rep completes, compute full MotionCare Form Score & announce
        if (snap.lastRep && snap.lastRep.repIndex !== lastEvaluatedRepIndexRef.current) {
          lastEvaluatedRepIndexRef.current = snap.lastRep.repIndex;
          voiceCoachRef.current.speakRepCompleted(snap.lastRep.repIndex, 10);
          const analysis = formAnalyzerRef.current.analyzeRepetition(
            snap.lastRep,
            kp,
            snap.sessionSummary?.movementConsistency ?? 90
          );
          setFormAnalysis(analysis);
          formAnalysisHistoryRef.current.push(analysis);
        }
      }
    } else {
      // Tracking lost or user stepped out of frame
      lostTrackingCounterRef.current += 1;
      if (lostTrackingCounterRef.current > 10) {
        setTrackingState(isCameraActive ? 'SEARCHING' : 'STANDBY');
        setStructuredPose(null);
        setJointAngles({
          leftKnee: null,
          rightKnee: null,
          torsoLean: null,
          activeDepth: null,
        });
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [isCameraActive, onFpsUpdate]);

  // Start frame loop when camera is active and model is ready
  const handleStreamReady = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  // Toggle Camera
  const handleToggleCamera = () => {
    setIsCameraActive((prev) => {
      const next = !prev;
      if (!next) {
        setTrackingState('STANDBY');
        setStructuredPose(null);
        setFps(0);
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
      }
      return next;
    });
  };

  // Format seconds to MM:SS string
  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Session Lifecycle Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            sessionStatus === SESSION_STATUS.ACTIVE
              ? 'bg-emerald-400 animate-ping'
              : sessionStatus === SESSION_STATUS.COMPLETED
              ? 'bg-cyan-400'
              : 'bg-slate-600'
          }`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Session Lifecycle
              </span>
              <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                sessionStatus === SESSION_STATUS.ACTIVE
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : sessionStatus === SESSION_STATUS.COMPLETED
                  ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {sessionStatus}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {sessionStatus === SESSION_STATUS.ACTIVE
                ? `Patient Session in progress • Rep target: 10`
                : sessionStatus === SESSION_STATUS.COMPLETED
                ? 'Rehabilitation set recorded & compiled'
                : 'Ready to establish baseline pain & begin tracking'}
            </span>
          </div>
        </div>

        {/* Action Controls & Chronometer */}
        <div className="flex items-center gap-3">
          {/* Vault Persistence Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vault: <strong className="text-slate-200 font-semibold">{storedSessionsCount}</strong> saved</span>
          </div>

          {sessionStatus === SESSION_STATUS.ACTIVE && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-cyan-300 text-sm font-semibold">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span>{formatTimer(activeDuration)}</span>
            </div>
          )}

          {sessionStatus === SESSION_STATUS.READY && (
            <button
              onClick={handleInitiateSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-950/50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Guided Session
            </button>
          )}

          {sessionStatus === SESSION_STATUS.ACTIVE && (
            <button
              onClick={handleFinishSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 font-semibold text-xs transition cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              End & Record Session
            </button>
          )}

          {sessionStatus === SESSION_STATUS.COMPLETED && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSummaryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold text-xs transition cursor-pointer"
              >
                View Summary
              </button>
              <button
                onClick={handleStartNewSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Set
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Model Loading Status Bar */}
      {modelStatus === 'loading' && (
        <div className="bg-cyan-950/40 border border-cyan-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading MediaPipe Pose Landmarker neural model and WASM runtime...</span>
          </div>
          <span className="font-mono text-[11px] text-cyan-400/80">BlazePose FP16</span>
        </div>
      )}

      {modelStatus === 'error' && (
        <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3.5 flex items-center gap-3 text-xs text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-semibold text-rose-200">Kinematic Engine Initialization Error</div>
            <div>{modelError}</div>
          </div>
        </div>
      )}

      {/* Main Grid: Camera & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Top: Camera & Skeleton Viewport (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative">
            <CameraFeed
              videoRef={videoRef}
              isActive={isCameraActive}
              onToggleActive={handleToggleCamera}
              onStreamReady={handleStreamReady}
              isMirrored={isMirrored}
              onToggleMirror={() => setIsMirrored((prev) => !prev)}
            >
              <SkeletonCanvas
                canvasRef={canvasRef}
                landmarks={structuredPose?.raw || null}
                jointAngles={jointAngles}
                isMirrored={isMirrored}
                showSkeleton={showSkeleton}
                showAngles={showAngles}
                squatState={repSnapshot?.state}
              />
            </CameraFeed>

            {/* Over-video quick toggles */}
            {isCameraActive && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                <AudioControls
                  isMuted={isAudioMuted}
                  onToggleMute={handleToggleAudioMute}
                  volume={audioVolume}
                  onVolumeChange={handleAudioVolumeChange}
                  rate={audioRate}
                  onRateChange={handleAudioRateChange}
                  enableSfx={enableAudioSfx}
                  onToggleSfx={handleToggleAudioSfx}
                  onTestVoice={handleTestVoice}
                />

                <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur border border-slate-700/80 rounded-xl p-1 text-xs shadow-lg">
                  <button
                    onClick={() => setShowSkeleton((prev) => !prev)}
                    title="Toggle Skeleton Overlay"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      showSkeleton ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowAngles((prev) => !prev)}
                    title="Toggle Angle Tags"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      showAngles ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {showAngles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick guide under video */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Position your device ~2 meters away with full body visible.</span>
            <button
              onClick={() => setShowDebug((prev) => !prev)}
              className="hover:text-cyan-400 transition flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showDebug ? 'Hide Landmark Debug' : 'Inspect Coordinates'}</span>
            </button>
          </div>

          {/* Debug inspection tray */}
          {showDebug && structuredPose && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono">
              <div className="text-slate-300 font-semibold mb-2 flex items-center justify-between">
                <span>Normalized Joint Coordinates (BlazePose)</span>
                <span className="text-[10px] text-slate-500">X, Y, Z, Visibility</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 max-h-48 overflow-y-auto">
                {Object.entries(structuredPose.keypoints).map(([joint, pt]) => (
                  <div key={joint} className="bg-slate-950 p-1.5 rounded border border-slate-800/80">
                    <span className="text-cyan-300">{joint}: </span>
                    {pt ? (
                      <span>
                        x: {pt.x.toFixed(2)}, y: {pt.y.toFixed(2)}, vis: {(pt.visibility * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-slate-600">null</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right / Bottom: Live Telemetry Cards (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Milestone 2: Repetition Counter & Kinematic State */}
          <RepCounterCard
            repSnapshot={repSnapshot}
            onResetReps={handleResetReps}
          />

          {/* Milestone 3: MotionCare Form Score & Prioritized Guidance */}
          <FormScoreCard
            formAnalysis={formAnalysis}
            liveFeedback={liveFeedback}
            repsCount={repSnapshot?.reps || 0}
          />

          {/* Telemetry & Joint Tracking Health */}
          <LiveTrackerCard
            modelStatus={modelStatus}
            trackingState={trackingState}
            fps={fps}
            jointAngles={jointAngles}
            keypoints={structuredPose?.keypoints}
          />

          {/* Foundation Milestone Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Milestone 8 — Real-Time Voice Coaching & Audio Biofeedback</span>
            </div>
            <p className="leading-relaxed">
              Hands-free physical therapy voice guidance active: Web Speech API prioritized clinical cues (valgus alerts, torso uprightness) and zero-latency Web Audio depth/rep chimes.
            </p>
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Voice Guidance</span>
                <span className="text-cyan-400 font-medium">Prioritized Speech & Chimes</span>
              </div>
              <div>
                <span className="text-slate-500 block">Vault Sessions</span>
                <span className="text-cyan-400 font-medium">{storedSessionsCount} Archived</span>
              </div>
            </div>
          </div>

          {/* Assistive Notice */}
          <ClinicalDisclaimer />
        </div>
      </div>

      {/* Patient Reported Outcome Modals */}
      <PainReportModal
        isOpen={isPrePainModalOpen}
        mode="pre"
        onSubmit={handleStartSession}
        onCancel={() => setIsPrePainModalOpen(false)}
      />

      <PainReportModal
        isOpen={isPostPainModalOpen}
        mode="post"
        initialScore={sessionManagerRef.current.painBefore ?? 0}
        onSubmit={handleCompleteSession}
        onCancel={() => setIsPostPainModalOpen(false)}
      />

      {/* Session Summary Modal */}
      <SessionSummaryModal
        isOpen={isSummaryModalOpen}
        sessionSummary={sessionSummary}
        saveStatus={saveStatus}
        onStartNewSession={handleStartNewSession}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </div>
  );
}
