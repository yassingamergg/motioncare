import { FormAnalyzer, FEEDBACK_PRIORITY } from '../src/lib/exercises/formAnalyzer.js';

function runTests() {
  console.log('=== RUNNING FORM ANALYZER UNIT TESTS ===\n');
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

  const analyzer = new FormAnalyzer();

  // Clean dummy keypoints with good alignment
  const idealKeypoints = {
    leftHip: { x: 0.40, y: 0.50, visibility: 0.95 },
    rightHip: { x: 0.60, y: 0.50, visibility: 0.95 },
    leftKnee: { x: 0.38, y: 0.70, visibility: 0.95 },
    rightKnee: { x: 0.62, y: 0.70, visibility: 0.95 },
    leftAnkle: { x: 0.37, y: 0.90, visibility: 0.95 },
    rightAnkle: { x: 0.63, y: 0.90, visibility: 0.95 },
  };

  // TEST 1: Ideal Repetition
  {
    const rep = {
      repIndex: 1,
      maxDepth: 93, // Close to target 95°
      descentDuration: 1.6,
      ascentDuration: 1.4,
      totalDuration: 3.0,
      torsoLean: 18, // Upright
    };

    const result = analyzer.analyzeRepetition(rep, idealKeypoints, 95);
    assert(result.depthScore >= 95, `Ideal depth score (${result.depthScore}%)`);
    assert(result.alignmentScore >= 90, `Ideal alignment score (${result.alignmentScore}%)`);
    assert(result.controlScore >= 90, `Ideal control score (${result.controlScore}%)`);
    assert(result.overallScore >= 90, `Overall MotionCare Form Score is high (${result.overallScore}%)`);
    assert(result.prioritizedFeedback.severity === 'success', 'Prioritized feedback is success');
  }

  // TEST 2: Shallow Depth Repetition
  {
    const rep = {
      repIndex: 2,
      maxDepth: 118, // High / shallow
      descentDuration: 1.5,
      ascentDuration: 1.3,
      totalDuration: 2.8,
      torsoLean: 20,
    };

    const result = analyzer.analyzeRepetition(rep, idealKeypoints, 90);
    assert(result.depthScore < 80, `Shallow depth score penalized (${result.depthScore}%)`);
    assert(result.prioritizedFeedback.type === 'depth', 'Feedback identifies shallow depth');
    assert(result.prioritizedFeedback.message.includes('descending slightly lower'), 'Suggests going lower');
  }

  // TEST 3: Excessive Torso Lean
  {
    const rep = {
      repIndex: 3,
      maxDepth: 95,
      descentDuration: 1.5,
      ascentDuration: 1.4,
      totalDuration: 2.9,
      torsoLean: 55, // Excessive forward lean
    };

    const result = analyzer.analyzeRepetition(rep, idealKeypoints, 90);
    assert(result.alignmentScore < 85, `Alignment score penalized for lean (${result.alignmentScore}%)`);
    assert(result.prioritizedFeedback.type === 'torso', 'Identified torso lean issue');
    assert(result.prioritizedFeedback.message.includes('chest lifted'), 'Chest lifted guidance given');
  }

  // TEST 4: Rapid / Uncontrolled Speed
  {
    const rep = {
      repIndex: 4,
      maxDepth: 95,
      descentDuration: 0.5, // Too fast (< 0.8s)
      ascentDuration: 0.6,
      totalDuration: 1.1,
      torsoLean: 20,
    };

    const result = analyzer.analyzeRepetition(rep, idealKeypoints, 90);
    assert(result.controlScore <= 60, `Control score penalized for fast drop (${result.controlScore}%)`);
    assert(result.prioritizedFeedback.type === 'tempo', 'Feedback flags speed');
    assert(result.prioritizedFeedback.message.includes('Slow down'), 'Advises slowing down');
  }

  // TEST 5: Knee Valgus (Inward Collapse)
  {
    // Knees track significantly inside ankles
    const valgusKeypoints = {
      leftHip: { x: 0.40, y: 0.50, visibility: 0.95 },
      rightHip: { x: 0.60, y: 0.50, visibility: 0.95 },
      leftKnee: { x: 0.46, y: 0.70, visibility: 0.95 }, // Caved inward (dist = 0.08)
      rightKnee: { x: 0.54, y: 0.70, visibility: 0.95 },
      leftAnkle: { x: 0.35, y: 0.90, visibility: 0.95 }, // Wide base (dist = 0.30)
      rightAnkle: { x: 0.65, y: 0.90, visibility: 0.95 },
    };

    const rep = {
      repIndex: 5,
      maxDepth: 95,
      descentDuration: 1.5,
      ascentDuration: 1.5,
      totalDuration: 3.0,
      torsoLean: 20,
    };

    const result = analyzer.analyzeRepetition(rep, valgusKeypoints, 90);
    assert(result.alignmentScore < 75, `Alignment penalized for valgus (${result.alignmentScore}%)`);
    assert(result.prioritizedFeedback.type === 'valgus', 'Feedback flags knee alignment');
    assert(result.prioritizedFeedback.severity === 'warning', 'Valgus is warning severity');
  }

  // TEST 6: Priority Resolution (Valgus vs Depth conflict)
  {
    // Both valgus and shallow depth occur in same rep
    const valgusKeypoints = {
      leftHip: { x: 0.40, y: 0.50, visibility: 0.95 },
      rightHip: { x: 0.60, y: 0.50, visibility: 0.95 },
      leftKnee: { x: 0.46, y: 0.70, visibility: 0.95 },
      rightKnee: { x: 0.54, y: 0.70, visibility: 0.95 },
      leftAnkle: { x: 0.35, y: 0.90, visibility: 0.95 },
      rightAnkle: { x: 0.65, y: 0.90, visibility: 0.95 },
    };

    const rep = {
      repIndex: 6,
      maxDepth: 115, // Shallow depth AND Valgus
      descentDuration: 1.5,
      ascentDuration: 1.5,
      totalDuration: 3.0,
      torsoLean: 20,
    };

    const result = analyzer.analyzeRepetition(rep, valgusKeypoints, 90);
    assert(
      result.prioritizedFeedback.type === 'valgus',
      'Knee Valgus takes higher clinical priority over Depth adjustment'
    );
    assert(result.allFeedback.length >= 2, 'All feedback items preserved for clinician inspection');
  }

  console.log(`\nALL ${passed}/${total} FORM ANALYZER TESTS PASSED SUCCESSFULLY!`);
}

runTests();
