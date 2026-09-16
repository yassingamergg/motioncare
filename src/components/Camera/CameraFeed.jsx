import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, AlertTriangle, Video, FlipHorizontal } from 'lucide-react';

export function CameraFeed({
  videoRef,
  isActive,
  onToggleActive,
  onStreamReady,
  isMirrored,
  onToggleMirror,
  children,
}) {
  const [permissionState, setPermissionState] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'denied' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const streamRef = useRef(null);
  const activeDeviceIdRef = useRef('');
  const onStreamReadyRef = useRef(onStreamReady);

  useEffect(() => {
    onStreamReadyRef.current = onStreamReady;
  }, [onStreamReady]);

  // Enumerate available video inputs without triggering camera restarts
  const enumerateDevices = useCallback(async (currentStream) => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      if (videoInputs.length > 0) {
        let activeId = activeDeviceIdRef.current;
        if (!activeId && currentStream) {
          const track = currentStream.getVideoTracks()[0];
          activeId = track?.getSettings?.()?.deviceId;
        }
        if (!activeId) {
          activeId = videoInputs[0].deviceId;
        }
        activeDeviceIdRef.current = activeId;
        setSelectedDeviceId((prev) => prev || activeId);
      }
    } catch (e) {
      console.warn('Unable to enumerate media devices:', e);
    }
  }, []);

  // Stop video stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    activeDeviceIdRef.current = '';
    setPermissionState('idle');
  }, [videoRef]);

  // Start video stream
  const startCamera = useCallback(async (targetDeviceId) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('error');
      setErrorMessage('Camera access is not supported by your browser environment.');
      return;
    }

    setPermissionState('requesting');
    setErrorMessage(null);

    // Stop existing tracks cleanly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const deviceIdToUse = targetDeviceId || activeDeviceIdRef.current || selectedDeviceId;
      const constraints = {
        audio: false,
        video: {
          deviceId: deviceIdToUse ? { ideal: deviceIdToUse } : undefined,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: deviceIdToUse ? undefined : 'user',
          frameRate: { ideal: 30, max: 60 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const actualDeviceId = track?.getSettings?.()?.deviceId || deviceIdToUse || '';
      activeDeviceIdRef.current = actualDeviceId;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        let isReadyHandled = false;
        const markStreamReady = async () => {
          if (isReadyHandled) return;
          isReadyHandled = true;

          try {
            await video.play();
          } catch (playErr) {
            console.warn('Camera video.play() warning:', playErr);
          }

          setPermissionState('granted');
          if (onStreamReadyRef.current) {
            onStreamReadyRef.current(video);
          }
        };

        // Attach listeners for metadata and playback readiness
        video.onloadedmetadata = () => markStreamReady();
        video.oncanplay = () => markStreamReady();
        video.onloadeddata = () => markStreamReady();

        // If metadata is already loaded or stream is already ready
        if (video.readyState >= 1) {
          markStreamReady();
        }

        // Safety fallback timeout: ensure transition out of requesting state
        setTimeout(() => {
          if (!isReadyHandled && stream.active) {
            markStreamReady();
          }
        }, 1200);
      }

      await enumerateDevices(stream);
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Camera permission was denied. Please grant camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('error');
        setErrorMessage('No camera device was detected on your system.');
      } else {
        setPermissionState('error');
        setErrorMessage(`Camera error: ${err.message || 'Unable to access video stream'}`);
      }
    }
  }, [enumerateDevices, selectedDeviceId, videoRef]);

  // Handle manual device change from dropdown
  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    if (isActive && newDeviceId !== activeDeviceIdRef.current) {
      startCamera(newDeviceId);
    }
  };

  // Manage camera state based on isActive prop
  useEffect(() => {
    if (isActive) {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex flex-col">
      {/* Video Viewport with overlay children */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* HTML5 Video Element - kept in layout to ensure browser decodes stream and triggers events */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-contain ${
            isMirrored ? 'scale-x-[-1]' : ''
          } ${permissionState === 'granted' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Pose Canvas & Overlay Children */}
        {permissionState === 'granted' && children}

        {/* Non-granted states overlay */}
        {permissionState !== 'granted' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
            {/* Idle State */}
            {permissionState === 'idle' && !isActive && (
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-1">Optical Capture Ready</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Enable your camera to begin local real-time biomechanical skeleton tracking.
                </p>
                <button
                  onClick={onToggleActive}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-cyan-950/50 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  Start Camera
                </button>
              </div>
            )}

            {/* Requesting State */}
            {permissionState === 'requesting' && (
              <div className="text-center p-8">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-200 mb-1">Initializing Video Feed</h3>
                <p className="text-xs text-slate-400">Requesting sensor permissions...</p>
              </div>
            )}

            {/* Permission Denied State */}
            {permissionState === 'denied' && (
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-amber-950/50 border border-amber-800/80 flex items-center justify-center mx-auto mb-4 text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-amber-200 mb-2">Camera Permission Required</h3>
                <p className="text-sm text-slate-400 mb-6">{errorMessage}</p>
                <button
                  onClick={() => startCamera(selectedDeviceId)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Permission
                </button>
              </div>
            )}

            {/* Generic Error State */}
            {permissionState === 'error' && (
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-800 flex items-center justify-center mx-auto mb-4 text-rose-400">
                  <CameraOff className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-rose-200 mb-2">Capture Device Error</h3>
                <p className="text-sm text-slate-400 mb-6">{errorMessage}</p>
                <button
                  onClick={() => startCamera(selectedDeviceId)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Toolbar */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Device selection */}
        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              disabled={!isActive}
              className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 text-xs disabled:opacity-50"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onToggleMirror}
            title="Mirror Video Feed"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
              isMirrored
                ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>{isMirrored ? 'Mirrored' : 'Normal'}</span>
          </button>
        </div>

        {/* Right: Master Camera switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              isActive
                ? 'bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900/80'
                : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold'
            }`}
          >
            {isActive ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                Stop Feed
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                Start Feed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
