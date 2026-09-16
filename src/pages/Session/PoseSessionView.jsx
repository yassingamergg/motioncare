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
import { AICoachConversationModal } from '../../components/AI/AICoachConversationModal';
import { VoiceCoach } from '../../lib/audio/voiceCoach';
import { AudioControls } from '../../components/Audio/AudioControls';
import { analyzeLiveCameraFrame, askAICoachConversation } from '../../lib/ai/geminiClient';
import { Eye, EyeOff, Layers, Sliders, CheckCircle, RefreshCw, AlertTriangle, Play, Square, Timer, RotateCcw, Database, Volume2, Sparkles, Bot, X, MessageSquare, Mic, MicOff } from 'lucide-react';

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
  const [audioPitch, setAudioPitch] = useState(1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [enableAudioSfx, setEnableAudioSfx] = useState(true);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
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

  const handleAudioPitchChange = (newPitch) => {
    setAudioPitch(newPitch);
    voiceCoachRef.current.setPitch(newPitch);
  };

  const handleVoiceChange = (uri) => {
    setSelectedVoiceURI(uri);
    voiceCoachRef.current.setVoiceURI(uri);
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

  // Live Multimodal AI Visual Form Inspection State
  const [aiVisionFeedback, setAiVisionFeedback] = useState(null);
  const [isScanningVision, setIsScanningVision] = useState(false);
  const [autoScanVision, setAutoScanVision] = useState(false);

  const handleScanFormWithAI = useCallback(async () => {
    if (isScanningVision || !isCameraActive) return;
    setIsScanningVision(true);
    try {
      const source = canvasRef.current || videoRef.current;
      const res = await analyzeLiveCameraFrame(source, jointAngles, {
        reps: repSnapshot?.reps || 0,
        squatState: repSnapshot?.state || 'ACTIVE',
        exerciseName: 'Bodyweight Squat',
      });
      if (res && res.tip) {
        setAiVisionFeedback({
          tip: res.tip,
          source: res.source,
          timestamp: Date.now(),
        });
        voiceCoachRef.current.speak(res.tip, 90, true);
      }
    } catch (err) {
      console.error('[MotionCare AI] Live vision scan error:', err);
    } finally {
      setIsScanningVision(false);
    }
  }, [isScanningVision, isCameraActive, jointAngles, repSnapshot]);

  // Periodic Auto-Coach Visual Form Audits (when enabled during active session)
  useEffect(() => {
    let interval = null;
    if (autoScanVision && sessionStatus === SESSION_STATUS.ACTIVE && isCameraActive && trackingState === 'TRACKING') {
      interval = setInterval(() => {
        handleScanFormWithAI();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoScanVision, sessionStatus, isCameraActive, trackingState, handleScanFormWithAI]);

  // Continuous Ambient Hands-Free Voice Listener (Patient talks mid-exercise without touching screen)
  const [isHandsFreeVoiceActive, setIsHandsFreeVoiceActive] = useState(true);
  const [ambientVoiceStatus, setAmbientVoiceStatus] = useState('idle'); // 'idle' | 'listening' | 'hearing' | 'processing' | 'speaking'
  const [ambientSpeechTranscript, setAmbientSpeechTranscript] = useState('');
  const [liveCoachResponseHUD, setLiveCoachResponseHUD] = useState(null); // { query, reply, timestamp }
  const speechRecognizerRef = useRef(null);
  const ambientProcessingLockRef = useRef(false);
  const conversationHistoryRef = useRef([]);
  const speechBufferRef = useRef('');
  const silenceDebounceTimerRef = useRef(null);

  // Keep telemetry snapshot in a ref to prevent tearing down the speech recognizer on every 30fps animation frame
  const latestTelemetryRef = useRef({});
  useEffect(() => {
    latestTelemetryRef.current = {
      jointAngles,
      repSnapshot,
      formAnalysis,
      sessionStatus,
    };
  }, [jointAngles, repSnapshot, formAnalysis, sessionStatus]);

  // Execute conversational query with AI Coach
  const handleProcessAmbientQuery = useCallback(async (spokenText) => {
    const query = (spokenText || '').trim();
    if (!query || query.length < 3 || ambientProcessingLockRef.current) return;

    ambientProcessingLockRef.current = true;
    setAmbientVoiceStatus('processing');
    setAmbientSpeechTranscript(query);

    try {
      const reply = await askAICoachConversation(
        query,
        conversationHistoryRef.current,
        latestTelemetryRef.current,
        canvasRef.current || videoRef.current
      );

      conversationHistoryRef.current.push({ role: 'user', text: query });
      conversationHistoryRef.current.push({ role: 'model', text: reply });

      setLiveCoachResponseHUD({
        query,
        reply,
        timestamp: Date.now(),
      });

      setAmbientVoiceStatus('speaking');
      voiceCoachRef.current.speak(reply, 100, true, () => {
        setAmbientVoiceStatus('listening');
      });
    } catch (err) {
      console.error('[HandsFreeVoice] Error processing ambient speech:', err);
      setAmbientVoiceStatus('listening');
    } finally {
      setTimeout(() => {
        ambientProcessingLockRef.current = false;
        speechBufferRef.current = '';
        setAmbientSpeechTranscript('');
        if (!voiceCoachRef.current.isSpeakingActive()) {
          setAmbientVoiceStatus('listening');
        }
      }, 2000);
    }
  }, []);

  // Main ambient speech recognition listener lifecycle
  useEffect(() => {
    if (typeof window === 'undefined' || !isCameraActive || !isHandsFreeVoiceActive) {
      if (silenceDebounceTimerRef.current) {
        clearTimeout(silenceDebounceTimerRef.current);
      }
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.abort();
        } catch {}
      }
      setAmbientVoiceStatus('idle');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[HandsFreeVoice] Web SpeechRecognition API is not supported in this browser environment.');
      return;
    }

    let isDisposed = false;
    let recognizer = null;

    const startListeningSession = () => {
      if (isDisposed) return;
      try {
        recognizer = new SpeechRecognition();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = 'en-US';

        recognizer.onstart = () => {
          if (!isDisposed && !ambientProcessingLockRef.current) {
            setAmbientVoiceStatus('listening');
          }
        };

        recognizer.onresult = (event) => {
          // If voice coach is actively speaking, drop mic inputs to prevent acoustic echo loops
          if (voiceCoachRef.current.isSpeakingActive()) {
            return;
          }
          if (ambientProcessingLockRef.current) {
            return;
          }

          let combinedTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            combinedTranscript += event.results[i][0].transcript;
          }

          const currentText = combinedTranscript.trim();
          if (currentText) {
            speechBufferRef.current = currentText;
            setAmbientSpeechTranscript(currentText);
            setAmbientVoiceStatus('hearing');

            if (silenceDebounceTimerRef.current) {
              clearTimeout(silenceDebounceTimerRef.current);
            }

            // After 1.3s of conversational pause, auto-commit the query to the AI coach
            silenceDebounceTimerRef.current = setTimeout(() => {
              if (speechBufferRef.current.trim().length >= 3) {
                handleProcessAmbientQuery(speechBufferRef.current);
              }
            }, 1300);
          }
        };

        recognizer.onerror = (e) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.warn('[HandsFreeVoice] Recognizer error:', e.error);
          }
        };

        recognizer.onend = () => {
          if (isDisposed) return;
          // Restart recognition loop if still active
          if (!ambientProcessingLockRef.current && !voiceCoachRef.current.isSpeakingActive()) {
            setTimeout(() => {
              if (!isDisposed) {
                startListeningSession();
              }
            }, 250);
          }
        };

        recognizer.start();
        speechRecognizerRef.current = recognizer;
      } catch (err) {
        console.warn('[HandsFreeVoice] Recognizer start failed:', err);
      }
    };

    startListeningSession();

    return () => {
      isDisposed = true;
      if (silenceDebounceTimerRef.current) {
        clearTimeout(silenceDebounceTimerRef.current);
      }
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.abort();
        } catch {}
      }
    };
  }, [isCameraActive, isHandsFreeVoiceActive, handleProcessAmbientQuery]);

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
  const hasAnnouncedCameraReadyRef = useRef(false);
  const handleStreamReady = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    animFrameIdRef.current = requestAnimationFrame(processFrame);
    if (!hasAnnouncedCameraReadyRef.current) {
      hasAnnouncedCameraReadyRef.current = true;
      voiceCoachRef.current.speakCameraReady();
    }
  }, [processFrame]);

  // Toggle Camera
  const handleToggleCamera = () => {
    setIsCameraActive((prev) => {
      const next = !prev;
      if (!next) {
        setTrackingState('STANDBY');
        setStructuredPose(null);
        setFps(0);
        hasAnnouncedCameraReadyRef.current = false;
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

            {/* Over-video quick toggles & AI Vision Form Audit */}
            {isCameraActive && (
              <>
                {/* Top-Left: Minimal Talk to AI Badge on Video */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                  <button
                    onClick={() => setIsConversationModalOpen(true)}
                    title="Open 2-Way Voice Conversation with AI Coach"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-cyan-500/80 text-cyan-300 font-bold text-xs shadow-xl backdrop-blur cursor-pointer transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current text-cyan-400" />
                    <span>Talk to AI Coach</span>
                  </button>

                  {isHandsFreeVoiceActive && (
                    <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-emerald-500/60 text-[11px] text-emerald-300 backdrop-blur font-medium">
                      <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                      <span>Mic Active</span>
                    </div>
                  )}
                </div>

                {/* Top-Right: Audio & View Controls */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                  <AudioControls
                    isMuted={isAudioMuted}
                    onToggleMute={handleToggleAudioMute}
                    volume={audioVolume}
                    onVolumeChange={handleAudioVolumeChange}
                    rate={audioRate}
                    onRateChange={handleAudioRateChange}
                    pitch={audioPitch}
                    onPitchChange={handleAudioPitchChange}
                    selectedVoiceURI={selectedVoiceURI}
                    onVoiceChange={handleVoiceChange}
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

                {/* Live Speech Recognition Transcript Pill (When patient is speaking) */}
                {ambientSpeechTranscript && (
                  <div className="absolute top-16 left-3 right-3 sm:right-auto z-20 bg-slate-950/95 border border-cyan-500/80 rounded-xl px-3.5 py-2 text-xs text-cyan-300 shadow-2xl flex items-center gap-2.5 animate-fadeIn backdrop-blur">
                    <Mic className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      Hearing: <strong className="text-white">&ldquo;{ambientSpeechTranscript}&rdquo;</strong>
                    </span>
                  </div>
                )}

                {ambientVoiceStatus === 'processing' && !liveCoachResponseHUD && (
                  <div className="absolute top-16 left-3 right-3 sm:right-auto z-20 bg-slate-950/95 border border-purple-500/80 rounded-xl px-3.5 py-2 text-xs text-purple-300 shadow-2xl flex items-center gap-2.5 animate-pulse backdrop-blur">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                    <span>Thinking & analyzing your form...</span>
                  </div>
                )}

                {/* Live Conversational Coach Response HUD (Bottom of Camera) */}
                {liveCoachResponseHUD && (
                  <div className="absolute bottom-4 left-3 right-3 z-30 bg-slate-950/95 backdrop-blur-md border border-cyan-500/70 rounded-2xl p-3.5 shadow-2xl animate-fadeIn flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-slate-950 font-bold shrink-0 mt-0.5 shadow-md">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-300 text-[11px] uppercase tracking-wide">
                            AI Coach Spoken Reply
                          </span>
                          <span className="text-[10px] text-slate-400 italic">
                            &ldquo;{liveCoachResponseHUD.query}&rdquo;
                          </span>
                        </div>
                        <p className="text-white text-xs sm:text-sm font-medium leading-relaxed">
                          {liveCoachResponseHUD.reply}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => voiceCoachRef.current.speak(liveCoachResponseHUD.reply, 100, true)}
                        title="Replay Voice"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLiveCoachResponseHUD(null)}
                        title="Dismiss"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Overlay: AI Vision Live Coaching Pill (if separate vision scan) */}
                {!liveCoachResponseHUD && aiVisionFeedback && (
                  <div className="absolute bottom-4 left-3 right-3 z-20 bg-slate-950/90 backdrop-blur-md border border-purple-500/50 rounded-2xl p-3 shadow-2xl animate-fadeIn flex items-start justify-between gap-3 text-xs text-purple-200">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-700 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                            AI Visual Biomechanics Coach
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-mono">
                            {aiVisionFeedback.source === 'cloud_vision' ? 'Cloud Vision AI' : 'Kinematic Engine'}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed font-medium">
                          {aiVisionFeedback.tip}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={handleScanFormWithAI}
                        disabled={isScanningVision}
                        title="Re-scan Form"
                        className="p-1 rounded-lg hover:bg-slate-800 text-purple-300 transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScanningVision ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => setAiVisionFeedback(null)}
                        title="Dismiss"
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dedicated Clean AI Action Toolbar (Below Video) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsConversationModalOpen(true)}
                title="Open 2-Way Voice & Chat Conversation with AI Coach"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50 cursor-pointer transition"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Talk to AI Coach</span>
              </button>

              <button
                onClick={() => setIsHandsFreeVoiceActive((prev) => !prev)}
                title="Toggle Hands-Free Ambient Voice Listening"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isHandsFreeVoiceActive
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-sm'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isHandsFreeVoiceActive ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Hands-Free Mic: ON</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hands-Free Mic: OFF</span>
                  </>
                )}
              </button>

              <button
                onClick={handleScanFormWithAI}
                disabled={isScanningVision || !isCameraActive}
                title="Ask AI Vision to inspect your live body form & posture"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-600 text-purple-200 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-300 ${isScanningVision ? 'animate-spin' : ''}`} />
                <span>{isScanningVision ? 'Scanning...' : 'Scan Form with AI'}</span>
              </button>

              <button
                onClick={() => setAutoScanVision((prev) => !prev)}
                title="Toggle Periodic AI Visual Form Audits"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  autoScanVision
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Auto-Coach: {autoScanVision ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowDebug((prev) => !prev)}
              className="text-xs text-slate-400 hover:text-cyan-400 transition flex items-center gap-1 cursor-pointer px-2 py-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showDebug ? 'Hide Debug' : 'Inspect Joints'}</span>
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

      {/* 2-Way Conversational Physical Therapy AI Coach Modal */}
      <AICoachConversationModal
        isOpen={isConversationModalOpen}
        onClose={() => setIsConversationModalOpen(false)}
        voiceCoach={voiceCoachRef.current}
        telemetry={{
          jointAngles,
          repSnapshot,
          formAnalysis,
          sessionStatus,
        }}
        mediaElement={canvasRef.current || videoRef.current}
      />
    </div>
  );
}
