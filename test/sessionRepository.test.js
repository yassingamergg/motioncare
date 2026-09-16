import { SessionRepository } from '../src/lib/supabase/sessionRepository.js';

function runTests() {
  console.log('=== RUNNING SESSION REPOSITORY TESTS ===\n');
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

  // Setup mock localStorage in node environment
  const mockStorage = {};
  global.window = {
    localStorage: {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => { mockStorage[key] = val; },
      removeItem: (key) => { delete mockStorage[key]; },
    },
  };

  // TEST 1: Storage Mode detection
  const mode = SessionRepository.getStorageMode();
  assert(mode === 'local' || mode === 'supabase', `Detected storage mode (${mode})`);

  // TEST 2: Reject invalid payload
  SessionRepository.saveSession({}).then((res) => {
    assert(res.success === false, 'Rejects payload without ID');
  });

  // TEST 3: Save valid session to local vault
  const mockSession = {
    id: 'sess_test_123',
    exerciseId: 'bodyweight_squat',
    exerciseName: 'Bodyweight Squat',
    startedAt: '2026-09-16T18:00:00.000Z',
    completedAt: '2026-09-16T18:02:15.000Z',
    durationSeconds: 135,
    painBefore: 4,
    painAfter: 2,
    painDelta: -2,
    totalReps: 10,
    averageDepth: 91.5,
    averageFormScore: 88,
    averageControl: 90,
    movementConsistency: 92,
    reps: [{ repIndex: 1, maxDepth: 90 }],
  };

  SessionRepository.saveSession(mockSession).then((saveRes) => {
    assert(saveRes.success === true, 'Successfully saved session');

    // TEST 4: Retrieve session history
    SessionRepository.getSessionHistory(10).then((history) => {
      assert(history.length === 1, 'History contains 1 record');
      assert(history[0].id === 'sess_test_123', 'Record ID matches');
      assert(history[0].totalReps === 10, 'Total reps preserved');
      assert(history[0].painDelta === -2, 'Pain delta preserved');
      assert(history[0].averageFormScore === 88, 'Form score preserved');

      // TEST 5: Clear history
      SessionRepository.clearLocalHistory();
      SessionRepository.getSessionHistory().then((clearedHistory) => {
        assert(clearedHistory.length === 0, 'History cleared successfully');
        console.log(`\nALL ${passed}/${total} SESSION REPOSITORY TESTS PASSED!`);
      });
    });
  });
}

runTests();
