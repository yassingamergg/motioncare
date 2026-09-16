import { SquatDetector, SQUAT_STATES } from '../src/lib/exercises/squatDetector.js';

function runTests() {
  console.log('=== RUNNING SQUAT DETECTOR UNIT TESTS ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      process.exit(1);
    }
  }

  // Helper to simulate smooth continuous frame feeds
  function feedTrajectory(detector, startAngle, endAngle, steps, startTime, durationMs, torsoLean = 10) {
    let t = startTime;
    const dt = durationMs / steps;
    for (let i = 1; i <= steps; i++) {
      const angle = startAngle + ((endAngle - startAngle) * i) / steps;
      t += dt;
      detector.update(t, {}, { leftKnee: angle, rightKnee: angle, torsoLean });
    }
    return t;
  }

  // TEST 1: Initial state
  {
    const detector = new SquatDetector();
    const snap = detector.getStateSnapshot();
    assert(snap.state === SQUAT_STATES.STANDING, 'Initial state should be STANDING');
    assert(snap.reps === 0, 'Initial reps should be 0');
    assert(snap.completedReps.length === 0, 'Initial completed reps array should be empty');
  }

  // TEST 2: Valid Full Squat Cycle
  {
    const detector = new SquatDetector();
    let time = 1000;

    // 1. Standing posture (165°)
    time = feedTrajectory(detector, 165, 165, 5, time, 200, 5);
    assert(detector.state === SQUAT_STATES.STANDING, 'Step 1: Patient standing at 165°');

    // 2. Descend smoothly to 125° (initiates descent)
    time = feedTrajectory(detector, 165, 125, 6, time, 400, 15);
    assert(detector.state === SQUAT_STATES.DESCENDING, 'Step 2: Smooth descent to 125° -> DESCENDING');

    // 3. Reach bottom depth (90°)
    time = feedTrajectory(detector, 125, 90, 6, time, 400, 20);
    assert(detector.state === SQUAT_STATES.BOTTOM, 'Step 3: Knee reaches 90° -> BOTTOM');

    // 4. Hold at bottom
    time = feedTrajectory(detector, 90, 88, 3, time, 150, 20);
    assert(detector.state === SQUAT_STATES.BOTTOM, 'Step 4: Sustained at 88° -> still BOTTOM');

    // 5. Ascend smoothly to 135°
    time = feedTrajectory(detector, 88, 135, 6, time, 400, 15);
    assert(detector.state === SQUAT_STATES.ASCENDING, 'Step 5: Rises to 135° -> ASCENDING');

    // 6. Return fully to standing (165°)
    time = feedTrajectory(detector, 135, 165, 6, time, 400, 5);
    const snap = detector.getStateSnapshot();
    assert(detector.state === SQUAT_STATES.STANDING, 'Step 6: Knee returns to 165° -> STANDING');
    assert(snap.reps === 1, 'Rep count should increment to 1');
    assert(snap.lastRep !== null, 'Last rep record should be populated');
    assert(snap.lastRep.maxDepth <= 95, `Peak depth captured correctly (${snap.lastRep.maxDepth}°)`);
    assert(snap.lastRep.totalDuration >= 1.2, `Rep duration tracked (${snap.lastRep.totalDuration}s)`);
  }

  // TEST 3: Shallow Squat Rejection (Incomplete depth)
  {
    const detector = new SquatDetector();
    let time = 1000;

    time = feedTrajectory(detector, 165, 165, 5, time, 200);
    time = feedTrajectory(detector, 165, 115, 6, time, 400); // Descends only to 115°
    assert(detector.state === SQUAT_STATES.DESCENDING, 'Shallow descent is DESCENDING');
    time = feedTrajectory(detector, 115, 165, 6, time, 400); // Stands back up without reaching bottom

    const snap = detector.getStateSnapshot();
    assert(snap.state === SQUAT_STATES.STANDING, 'Shallow rep returns to STANDING');
    assert(snap.reps === 0, 'Shallow rep (115°) should NOT be counted as a valid rep');
  }

  // TEST 4: Glitch / Rapid Twitch Rejection
  {
    const detector = new SquatDetector();
    let time = 1000;

    // A sudden 200ms glitch
    time = feedTrajectory(detector, 165, 88, 3, time, 100);
    time = feedTrajectory(detector, 88, 165, 3, time, 100);

    const snap = detector.getStateSnapshot();
    assert(snap.reps === 0, 'Instantaneous glitch (<1.0s) should NOT increment rep count');
  }

  // TEST 5: Multiple Reps & Session Summary Consistency
  {
    const detector = new SquatDetector();
    let time = 1000;

    const performRep = (targetDepth) => {
      time = feedTrajectory(detector, 165, 165, 3, time, 150);
      time = feedTrajectory(detector, 165, 125, 5, time, 350);
      time = feedTrajectory(detector, 125, targetDepth, 5, time, 350);
      time = feedTrajectory(detector, targetDepth, targetDepth, 3, time, 150);
      time = feedTrajectory(detector, targetDepth, 130, 5, time, 350);
      time = feedTrajectory(detector, 130, 165, 5, time, 350);
    };

    performRep(90);
    time += 300;
    performRep(92);
    time += 300;
    performRep(89);

    const finalSnap = detector.getStateSnapshot();
    assert(finalSnap.reps === 3, 'All 3 completed reps counted');
    assert(finalSnap.sessionSummary.totalReps === 3, 'Summary records 3 reps');
    assert(finalSnap.sessionSummary.averageDepth >= 88 && finalSnap.sessionSummary.averageDepth <= 94, `Average depth calculated (${finalSnap.sessionSummary.averageDepth}°)`);
    assert(finalSnap.sessionSummary.movementConsistency >= 85, `High movement consistency (${finalSnap.sessionSummary.movementConsistency}%)`);
  }

  console.log(`\nALL ${passed}/${total} UNIT TESTS PASSED SUCCESSFULLY!`);
}

runTests();
