import { exerciseRegistry } from '../../src/lib/exercises/exerciseRegistry.js';
const point = (x, y) => ({ x, y, visibility: 0.99 });
const vector = (p, angle, length = 0.17) => point(p.x + Math.cos(angle * Math.PI / 180) * length, p.y + Math.sin(angle * Math.PI / 180) * length);

// Geometric, deterministic image-space landmarks; no random or fabricated engine output.
export function landmarks(id, progress = 0, rightProgress = progress) {
  const all = {};
  for (const [side, value] of [['left', progress], ['right', rightProgress]]) {
    let shoulder = point(0.45, 0.22), hip = point(0.45, 0.42), knee, ankle, elbow, wrist;
    if (id === 'squat') { knee = vector(hip, 90 - value / 2); ankle = vector(knee, 90 + value / 2); }
    else if (id === 'sit-to-stand') { knee = vector(hip, value); ankle = vector(knee, 90); }
    else if (id === 'knee-extension') { knee = vector(hip, 0); ankle = vector(knee, 90 - value); }
    else if (id === 'straight-leg-raise' || id === 'heel-slide') {
      shoulder = point(0.15, 0.65); hip = point(0.35, 0.65);
      knee = vector(hip, id === 'heel-slide' ? -value / 2 : -value);
      ankle = vector(knee, id === 'heel-slide' ? value / 2 : -value);
    } else if (id === 'glute-bridge') {
      shoulder = point(0.2, 0.65); hip = vector(shoulder, -value * 0.5, 0.2);
      knee = vector(hip, -value * 0.5 - (70 - value)); ankle = vector(knee, -value * 0.5 - (70 - value) + 90);

    // ── New exercises ────────────────────────────────────────────────────────

    } else if (id === 'hip-hinge') {
      // Torso leans forward: shoulder swings forward around hip. Progress = torsoAngle.
      // knees near straight (170°). At rest shoulder is above hip (angle=270=up).
      shoulder = point(0.45, 0.22); hip = point(0.45, 0.42);
      shoulder = vector(hip, 270 + value, 0.2); // swing shoulder forward
      knee = vector(hip, 90, 0.17); ankle = vector(knee, 90, 0.17);

    } else if (id === 'hip-abduction') {
      // Side-lying. Shoulder→Hip→Knee. At rest knee straight down from hip (90° = down).
      // hipAngle = shoulder→hip→knee. shoulder at left, hip to its right.
      // At rest knee is straight down: shoulder(0.15,0.65) → hip(0.35,0.65) → knee down.
      // hipAngle at rest ≈ 90° → progress = 180 - 90 = 90 — still wrong for the measurement.
      // Fix: use the angle directly. progress = 180 - hipAngle.
      // At rest in lying position, leg is horizontal alongside body:
      // shoulder(0.15,0.65), hip(0.35,0.65), knee should be at(0.35+0.17, 0.65) = same height → hipAngle=180 → progress=0.
      shoulder = point(0.15, 0.65); hip = point(0.35, 0.65);
      // At rest knee directly in line with shoulder and hip (angle 0° from hip→right = angle 180° which is to the right).
      // As leg lifts (abducts), knee moves upward → angle from 0° (right) increases toward -90° (up).
      knee = vector(hip, -value, 0.17); ankle = vector(knee, -value, 0.17);
      // hipAngle = shoulder→hip→knee; shoulder is at 180° from hip, knee is at -value.
      // We override measurement to: elevation = hipAngle - 90 (to get 0 at rest and positive when lifted).

    } else if (id === 'terminal-knee-extension') {
      // Seated: knee starts bent (~90°), extends toward 165°+.
      // kneeAngle = hip→knee→ankle. progress = kneeAngle - 90.
      // At rest knee=90° (ankle hangs straight down from knee).
      knee = vector(hip, 0, 0.17); ankle = vector(knee, 90 - value, 0.17);

    } else if (id === 'standing-hip-flexion') {
      // Standing upright. At rest hipAngle≈180° → progress=0. As leg raises, hipAngle decreases.
      // Progress = 180 - hipAngle. knee goes from straight down (90°) to forward (-value°).
      // At rest: knee directly below hip (90°), shoulder above hip (270°).
      // hipAngle = shoulder(270°)→hip→knee(90°) = 180° → progress = 0.
      knee = vector(hip, 90 - value, 0.17); ankle = vector(knee, 90 - value * 0.5, 0.17);

    } else if (id === 'tricep-extension') {
      // Overhead tricep. elbow directly above shoulder. Forearm starts folded back (behind head).
      // At rest elbowAngle ≈ 90° (forearm perpendicular to upper arm).
      // As extended, forearm straightens upward → elbowAngle → 180°. Progress = elbowAngle - 90.
      shoulder = point(0.45, 0.35); hip = point(0.45, 0.55);
      elbow = vector(shoulder, 270, 0.14); // elbow above shoulder
      wrist = vector(elbow, 180 + value, 0.14);
      knee = vector(hip, 90, 0.17); ankle = vector(knee, 90, 0.17);

    } else if (id === 'ankle-dorsiflexion') {
      // Standing. Heel raised by value → heelElevation negative → dorsiflexion = -heelElevation.
      knee = vector(hip, 90, 0.17); ankle = vector(knee, 90, 0.17);

    } else if (id === 'dead-bug') {
      // Supine. At rest hip=90° (thigh vertical). Leg lowers → hipAngle increases. Progress = hipAngle - 90.
      shoulder = point(0.15, 0.65); hip = point(0.35, 0.65);
      // shoulder→hip→knee. At rest knee is at -90° (straight up). As leg lowers, knee comes forward.
      knee = vector(hip, -90 + value, 0.17); ankle = vector(knee, -90 + value, 0.17);

    } else if (id === 'hip-external-rotation') {
      // Side-lying clam. At rest hipAngle=90°. As knee rises, hipAngle drops. Progress = 90 - hipAngle.
      // shoulder→hip→knee. shoulder at left, hip to right. At rest knee is straight up (-90°).
      // As clam opens, knee rotates further back (angle decreases from -90).
      shoulder = point(0.15, 0.65); hip = point(0.35, 0.65);
      knee = vector(hip, -90 - value * 1.0, 0.17); ankle = vector(knee, 180, 0.17);

    } else { knee = vector(hip, 90); ankle = vector(knee, 90); }

    // Elbow & wrist (don't overwrite if already set for tricep-extension)
    if (id.startsWith('shoulder-')) {
      elbow = vector(shoulder, 90 - value, 0.14); wrist = vector(elbow, 90 - value, 0.14);
    } else if (id !== 'tricep-extension' || !elbow) {
      elbow = vector(shoulder, 90, 0.14); wrist = vector(elbow, 90 - (id === 'bicep-curl' ? value : 0), 0.14);
    }

    // Heel and footIndex (dorsiflexion lifts footIndex angle relative to ankle)
    const heelLift = id === 'calf-raise' ? -value * 0.17 : 0;
    const heel = point(ankle.x - 0.02, ankle.y + 0.025 + heelLift);
    const footIndex = id === 'ankle-dorsiflexion'
      ? vector(ankle, -value, 0.07)
      : point(ankle.x + 0.05, ankle.y + 0.025);
    for (const [name, p] of Object.entries({ shoulder, hip, knee, ankle, elbow, wrist, heel, footIndex })) all[side + name[0].toUpperCase() + name.slice(1)] = p;
  }
  return all;
}

export function runFrames(engine, values, start = 0, step = 50) {
  let time = start;
  const snapshots = [];
  for (const value of values) { snapshots.push(engine.update(time, typeof value === 'object' ? value : landmarks(engine.config.id, value))); time += step; }
  return { time, snapshots };
}
export const still = (value, count = 20) => Array(count).fill(value);
export const ramp = (from, to, count = 24) => Array.from({ length: count }, (_, i) => from + (to - from) * (i + 1) / count);
export function cycle(id, peak = exerciseRegistry[id].target + (id === 'calf-raise' ? 0.02 : 5)) {
  return [...still(0), ...ramp(0, peak), ...still(peak, 8), ...ramp(peak, 0), ...still(0)];
}
