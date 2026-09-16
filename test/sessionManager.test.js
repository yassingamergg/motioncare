import { SessionManager, SESSION_STATUS, PAIN_TREND } from '../src/lib/session/sessionManager.js';

function runTests() {
  console.log('=== RUNNING SESSION MANAGER UNIT TESTS ===\n');
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

  const manager = new SessionManager({ id: 'bodyweight_squat', name: 'Bodyweight Squat' });

  // TEST 1: Initial state
  assert(manager.status === SESSION_STATUS.READY, 'Initial status is READY');
  assert(manager.id.startsWith('sess_'), 'Generates valid session ID');

  // TEST 2: Start session
  manager.start(4);
  assert(manager.status === SESSION_STATUS.ACTIVE, 'Status transitions to ACTIVE');
  assert(manager.painBefore === 4, 'Pre-exercise pain recorded (4/10)');
  assert(manager.startedAt !== null, 'Started timestamp populated');

  // TEST 3: Finish session (prompt pain)
  manager.durationSeconds = 102; // Simulate 102 seconds (01:42)
  manager.finish();
  assert(manager.status === SESSION_STATUS.PAIN_REPORT, 'Status transitions to PAIN_REPORT');

  // TEST 4: Complete session with pain improvement
  const mockReps = [
    { repIndex: 1, maxDepth: 92, totalDuration: 2.5 },
    { repIndex: 2, maxDepth: 88, totalDuration: 2.7 },
  ];
  const mockForm = [
    { overallScore: 88, controlScore: 86 },
    { overallScore: 92, controlScore: 90 },
  ];

  const summary = manager.complete(2, mockReps, mockForm, 94);
  assert(manager.status === SESSION_STATUS.COMPLETED, 'Status transitions to COMPLETED');
  assert(summary.painAfter === 2, 'Post-exercise pain recorded (2/10)');
  assert(summary.painDelta === -2, 'Pain delta calculated (2 - 4 = -2)');
  assert(summary.painTrend === PAIN_TREND.IMPROVED, 'Pain trend classified as IMPROVED');
  assert(summary.totalReps === 2, 'Total reps recorded as 2');
  assert(summary.averageDepth === 90, 'Average depth calculated (90°)');
  assert(summary.averageFormScore === 90, 'Average form score calculated (90%)');
  assert(summary.averageControl === 88, 'Average control score calculated (88%)');
  assert(summary.formattedDuration === '01:42', 'Duration formatted to 01:42');

  // TEST 5: Reset session
  manager.reset();
  assert(manager.status === SESSION_STATUS.READY, 'Reset returns status to READY');
  assert(manager.painBefore === null, 'Reset clears painBefore');

  // TEST 6: Elevated pain detection
  manager.start(2);
  manager.durationSeconds = 60;
  manager.finish();
  const elevatedSummary = manager.complete(6, mockReps, mockForm, 85);
  assert(elevatedSummary.painDelta === 4, 'Pain delta +4');
  assert(elevatedSummary.painTrend === PAIN_TREND.ELEVATED, 'Pain trend classified as ELEVATED');

  console.log(`\nALL ${passed}/${total} SESSION MANAGER TESTS PASSED SUCCESSFULLY!`);
}

runTests();
