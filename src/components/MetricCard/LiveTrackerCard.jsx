import React from 'react';
import { Activity, Compass, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

export function LiveTrackerCard({
  modelStatus,
  trackingState,
  fps,
  jointAngles = {},
  keypoints = null,
}) {
  const isTracking = trackingState === 'TRACKING';

  // Check visibility of lower body key joints
  const isVisible = (point) => point && (point.visibility ?? 1) >= 0.5;

  const keyJointsStatus = [
    { label: 'Hips', active: isVisible(keypoints?.leftHip) || isVisible(keypoints?.rightHip) },
    { label: 'Knees', active: isVisible(keypoints?.leftKnee) || isVisible(keypoints?.rightKnee) },
    { label: 'Ankles', active: isVisible(keypoints?.leftAnkle) || isVisible(keypoints?.rightAnkle) },
    { label: 'Shoulders', active: isVisible(keypoints?.leftShoulder) || isVisible(keypoints?.rightShoulder) },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header with Tracking State */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200 text-sm">Biomechanical Telemetry</h3>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isTracking
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : trackingState === 'SEARCHING'
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {trackingState}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">MediaPipe BlazePose 33-point kinematic solver</p>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold font-mono text-cyan-400">{fps}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">FPS</div>
        </div>
      </div>

      {/* Primary Angle Readouts */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Knee Flexion */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Left Knee Flexion</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {jointAngles.leftKnee != null ? `${jointAngles.leftKnee}°` : '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {jointAngles.leftKnee != null
              ? jointAngles.leftKnee > 150
                ? 'Extension (Standing)'
                : jointAngles.leftKnee < 100
                ? 'Flexion (Deep)'
                : 'Mid-Flexion'
              : 'Joint not localized'}
          </div>
        </div>

        {/* Right Knee Flexion */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Right Knee Flexion</span>
            <Activity className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {jointAngles.rightKnee != null ? `${jointAngles.rightKnee}°` : '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {jointAngles.rightKnee != null
              ? jointAngles.rightKnee > 150
                ? 'Extension (Standing)'
                : jointAngles.rightKnee < 100
                ? 'Flexion (Deep)'
                : 'Mid-Flexion'
              : 'Joint not localized'}
          </div>
        </div>

        {/* Torso Alignment */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Torso Inclination</span>
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {jointAngles.torsoLean != null ? `${jointAngles.torsoLean}°` : '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {jointAngles.torsoLean != null
              ? jointAngles.torsoLean < 25
                ? 'Upright alignment'
                : 'Forward trunk lean'
              : 'Torso plumb pending'}
          </div>
        </div>

        {/* Average Knee ROM */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Depth</span>
            <Eye className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {jointAngles.activeDepth != null ? `${jointAngles.activeDepth}°` : '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Target: ~90° Clinical Squat
          </div>
        </div>
      </div>

      {/* Landmark Visibility Health */}
      <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5">
        <div className="text-xs font-medium text-slate-300 mb-2.5 flex items-center justify-between">
          <span>Kinematic Chain Tracking Health</span>
          <span className="text-[11px] text-slate-500">Min 50% confidence</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {keyJointsStatus.map((j) => (
            <div
              key={j.label}
              className={`p-2 rounded-lg border text-center transition ${
                j.active
                  ? 'bg-slate-900 border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex justify-center mb-1">
                {j.active ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>
              <div className="text-[11px] font-medium">{j.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Model status footer */}
      <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
        <span>Model Engine:</span>
        <span className="font-mono text-slate-300">
          {modelStatus === 'ready'
            ? 'BlazePose Lite (FP16 / WebAssembly)'
            : modelStatus === 'loading'
            ? 'Loading Vision Task...'
            : modelStatus === 'error'
            ? 'Engine Load Failed'
            : 'Standby'}
        </span>
      </div>
    </div>
  );
}
