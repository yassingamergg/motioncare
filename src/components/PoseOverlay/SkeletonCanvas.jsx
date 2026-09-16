import React, { useEffect } from 'react';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '../../lib/pose/poseLandmarks';

export function SkeletonCanvas({
  canvasRef,
  landmarks,
  jointAngles = {},
  isMirrored = false,
  showSkeleton = true,
  showAngles = true,
  squatState = null,
}) {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showSkeleton || !landmarks || landmarks.length === 0) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate mapping helper respecting horizontal mirror
    const toCanvasCoords = (pt) => {
      if (!pt) return null;
      const x = isMirrored ? (1 - pt.x) * width : pt.x * width;
      const y = pt.y * height;
      return { x, y, visibility: pt.visibility ?? 1.0 };
    };

    // 1. Draw Connection Lines (Bones)
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
      const p1 = landmarks[startIndex];
      const p2 = landmarks[endIndex];

      if (!p1 || !p2) continue;

      const vis1 = p1.visibility ?? 1.0;
      const vis2 = p2.visibility ?? 1.0;

      // Only draw if both points have adequate visibility
      if (vis1 < 0.4 || vis2 < 0.4) continue;

      const c1 = toCanvasCoords(p1);
      const c2 = toCanvasCoords(p2);

      // Determine segment styling
      const isLowerLimb =
        (startIndex >= 23 && startIndex <= 32) || (endIndex >= 23 && endIndex <= 32);
      const isTorso =
        (startIndex === 11 && endIndex === 12) ||
        (startIndex === 11 && endIndex === 23) ||
        (startIndex === 12 && endIndex === 24) ||
        (startIndex === 23 && endIndex === 24);

      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);

      if (isLowerLimb) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)'; // Cyan for lower rehab limb
      } else if (isTorso) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // Emerald for torso core
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)'; // Muted slate for peripheral
      }

      ctx.stroke();
    }

    // 2. Draw Keypoints / Joint Nodes
    const clinicalIndices = new Set([
      POSE_LANDMARKS.LEFT_SHOULDER,
      POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW,
      POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST,
      POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_ANKLE,
    ]);

    landmarks.forEach((lm, idx) => {
      const vis = lm.visibility ?? 1.0;
      if (vis < 0.35) return;

      const pt = toCanvasCoords(lm);
      const isClinical = clinicalIndices.has(idx);
      const isKnee = idx === POSE_LANDMARKS.LEFT_KNEE || idx === POSE_LANDMARKS.RIGHT_KNEE;
      const isHip = idx === POSE_LANDMARKS.LEFT_HIP || idx === POSE_LANDMARKS.RIGHT_HIP;
      const isAtBottom = isKnee && squatState === 'BOTTOM';

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isAtBottom ? 8 : isKnee || isHip ? 6 : isClinical ? 4.5 : 2.5, 0, 2 * Math.PI);

      if (isAtBottom) {
        ctx.fillStyle = '#10b981'; // Vibrant emerald when target depth reached
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 16;
      } else if (isKnee || isHip) {
        ctx.fillStyle = '#06b6d4'; // Bright cyan
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
      } else if (isClinical) {
        ctx.fillStyle = '#10b981'; // Emerald
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 5;
      } else {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    });

    // 3. Draw Angle Callouts at Knees
    if (showAngles && (jointAngles.leftKnee != null || jointAngles.rightKnee != null)) {
      const drawAngleTag = (landmarkIdx, angleVal, label) => {
        if (angleVal == null) return;
        const lm = landmarks[landmarkIdx];
        if (!lm || (lm.visibility ?? 1.0) < 0.4) return;

        const pt = toCanvasCoords(lm);
        const tagText = `${angleVal}°`;

        ctx.font = '600 12px ui-monospace, monospace';
        const metrics = ctx.measureText(tagText);
        const padding = 5;
        const boxWidth = metrics.width + padding * 2;
        const boxHeight = 18;

        const boxX = pt.x + 12;
        const boxY = pt.y - boxHeight / 2;

        // Background pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(tagText, boxX + padding, boxY + 13);
      };

      if (jointAngles.leftKnee != null) {
        drawAngleTag(POSE_LANDMARKS.LEFT_KNEE, jointAngles.leftKnee, 'L Knee');
      }
      if (jointAngles.rightKnee != null) {
        drawAngleTag(POSE_LANDMARKS.RIGHT_KNEE, jointAngles.rightKnee, 'R Knee');
      }
    }
  }, [canvasRef, landmarks, jointAngles, isMirrored, showSkeleton, showAngles, squatState]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
