import { jointMetrics } from './biomechanics.js';
import { calculateAngle } from '../calculations/geometry.js';

const result = (progress, primary, metrics, recognized = true) => ({ progress, primary, metrics, recognized });
const upright = m => m.torsoAngle != null && m.torsoAngle < 65;
const floor = m => m.torsoAngle != null && m.torsoAngle > 40;

// Each strategy describes an observable movement, not automatic medical exercise selection.
export const measurementStrategies = {
  squat(points) {
    const m = jointMetrics(points);
    return result(180 - m.kneeAngle, m.kneeAngle, { ...m, squatDepth: 180 - m.kneeAngle }, m.kneeAngle != null && upright(m));
  },
  sitToStand(points) {
    const m = jointMetrics(points);
    return result(m.kneeAngle - 90, m.kneeAngle, m, m.kneeAngle != null && upright(m) && m.hipAngle >= 45);
  },
  straightLegRaise(points) {
    const m = jointMetrics(points);
    const elevation = 180 - m.hipAngle;
    return result(elevation, elevation, { ...m, legElevation: elevation }, m.hipAngle != null && floor(m));
  },
  kneeExtension(points) {
    const m = jointMetrics(points);
    return result(m.kneeAngle - 90, m.kneeAngle, { ...m, lowerLegAngle: m.kneeAngle, extensionROM: m.kneeAngle - 90 },
      m.kneeAngle != null && upright(m) && m.hipAngle >= 55 && m.hipAngle <= 125);
  },
  heelSlide(points) {
    const m = jointMetrics(points);
    return result(180 - m.kneeAngle, m.kneeAngle, { ...m, flexionROM: 180 - m.kneeAngle }, m.kneeAngle != null && floor(m));
  },
  calfRaise(points) {
    const m = jointMetrics(points);
    return result(m.heelElevation, m.heelElevation, { ...m, balanceOffset: m.torsoAngle }, m.heelElevation != null && upright(m) && m.kneeAngle >= 135);
  },
  shoulderFlexion(points) {
    const m = jointMetrics(points);
    return result(m.shoulderAngle, m.shoulderAngle, { ...m, armElevation: m.shoulderAngle }, m.shoulderAngle != null && upright(m));
  },
  shoulderAbduction(points) {
    const m = jointMetrics(points);
    const pathOffset = m.torsoLength > 0 ? Math.abs(points.wrist.x - points.shoulder.x) / m.torsoLength : null;
    return result(m.shoulderAngle, m.shoulderAngle, { ...m, armElevation: m.shoulderAngle, pathOffset }, m.shoulderAngle != null && upright(m));
  },
  bicepCurl(points) {
    const m = jointMetrics(points);
    return result(180 - m.elbowAngle, m.elbowAngle, { ...m, elbowFlexion: 180 - m.elbowAngle }, m.elbowAngle != null);
  },
  gluteBridge(points) {
    const m = jointMetrics(points);
    return result(m.hipAngle - 110, m.hipAngle, { ...m, shoulderHipAlignment: m.hipAngle },
      m.hipAngle != null && floor(m) && m.kneeAngle >= 45 && m.kneeAngle <= 135);
  },

  // --- New exercises ---

  // Hip hinge / Romanian deadlift: torso lean measures hip flexion depth
  hipHinge(points) {
    const m = jointMetrics(points);
    const hingeDepth = m.torsoAngle ?? 0;
    return result(hingeDepth, hingeDepth, { ...m, hingeDepth }, m.kneeAngle != null && m.kneeAngle >= 140 && m.hipAngle != null);
  },

  // Hip abduction side-lying: use the hip angle departure from baseline (180° = leg alongside body)
  hipAbduction(points) {
    const m = jointMetrics(points);
    // In side-lying, shoulder→hip→knee. At rest knee is in line with shoulder→hip (hipAngle≈180).
    // As leg lifts upward, hipAngle decreases. elevation = 180 - hipAngle.
    const elevation = m.hipAngle != null ? Math.max(0, 180 - m.hipAngle) : null;
    return result(elevation, elevation, { ...m, legElevation: elevation }, m.hipAngle != null && floor(m));
  },

  // Terminal knee extension: last degrees of extension. At rest = straight (high kneeAngle), extending = stays high.
  // Track from a bent-knee start. Progress = kneeAngle - 90 (degrees above 90°)
  terminalKneeExtension(points) {
    const m = jointMetrics(points);
    const extensionROM = m.kneeAngle != null ? Math.max(0, m.kneeAngle - 90) : null;
    return result(extensionROM, m.kneeAngle, { ...m, extensionROM },
      m.kneeAngle != null && m.hipAngle != null && m.hipAngle >= 50);
  },

  // Standing hip flexion: raising the leg forward. Progress = how far the leg is raised (hip angle drops from 180°).
  standingHipFlexion(points) {
    const m = jointMetrics(points);
    // At rest hip is fully extended (~180°). As leg raises, angle decreases.
    const flexion = m.hipAngle != null ? Math.max(0, 180 - m.hipAngle) : null;
    return result(flexion, flexion, { ...m, hipFlexion: flexion }, m.hipAngle != null && upright(m) && m.kneeAngle != null);
  },

  // Tricep extension: elbow straightening from bent. Progress = how straight the elbow is above baseline.
  // elbowAngle at rest ~90° (bent), at top ~160°+. Progress = elbowAngle - 90.
  tricepExtension(points) {
    const m = jointMetrics(points);
    const elbowExtension = m.elbowAngle != null ? Math.max(0, m.elbowAngle - 90) : null;
    return result(elbowExtension, m.elbowAngle, { ...m, elbowExtension }, m.elbowAngle != null);
  },

  // Ankle dorsiflexion: toes pulled up toward shin while standing.
  ankleDorsiflexion(points) {
    const m = jointMetrics(points);
    const ankleAngle = calculateAngle(points.knee, points.ankle, points.footIndex);
    const dorsiflexionROM = ankleAngle != null ? Math.max(0, 90 - ankleAngle) : null;
    return result(dorsiflexionROM, dorsiflexionROM, { ...m, ankleAngle, dorsiflexionROM }, ankleAngle != null && upright(m) && m.kneeAngle >= 140);
  },

  // Dead bug: lying supine, leg lowers from 90° toward floor.
  // Progress = how far the leg has lowered from vertical (hip extends past 90°).
  deadBug(points) {
    const m = jointMetrics(points);
    // In supine, the hip starts at ~90° (thigh vertical). As leg lowers, hipAngle increases toward 180°.
    const legLower = m.hipAngle != null ? Math.max(0, m.hipAngle - 90) : null;
    return result(legLower, legLower, { ...m, legLower }, m.hipAngle != null && floor(m));
  },

  // Side-lying hip external rotation (clam): uses ankle lateral displacement from hip as rotation proxy.
  // As the top knee rotates outward, the ankle moves away from the hip laterally.
  hipExternalRotation(points) {
    const m = jointMetrics(points);
    // Use hipAngle change: in clam position, as the top knee rises, the hip-to-knee angle increases.
    // At rest knees are stacked (hipAngle ~90°). As knee lifts, effective angle changes.
    const rotation = m.kneeAngle != null && m.hipAngle != null ? Math.max(0, 90 - m.hipAngle) : null;
    return result(rotation, rotation, { ...m, rotationROM: rotation }, m.kneeAngle != null && floor(m) && m.kneeAngle >= 60 && m.kneeAngle <= 135);
  },
};
