import test from 'node:test';
import assert from 'node:assert';
import {
  calculateLongitudinalMetrics,
  formatTrendDataForCharts,
  getSampleRecoverySessions,
} from '../src/lib/analytics/recoveryAnalytics.js';

test('Recovery Analytics Engine Unit Tests', async (t) => {
  await t.test('handles empty session arrays safely', () => {
    const metrics = calculateLongitudinalMetrics([]);
    assert.strictEqual(metrics.totalSessions, 0);
    assert.strictEqual(metrics.totalReps, 0);
    assert.strictEqual(metrics.averageFormScore, 0);
    assert.strictEqual(metrics.recoveryStatus, 'INSUFFICIENT_DATA');

    const charts = formatTrendDataForCharts([]);
    assert.strictEqual(charts.formTrendData.length, 0);
    assert.strictEqual(charts.romTrendData.length, 0);
    assert.strictEqual(charts.painTrendData.length, 0);
  });

  await t.test('calculates accurate aggregate metrics for multi-session data', () => {
    const mockSessions = [
      {
        id: 's1',
        startedAt: '2026-03-01T10:00:00Z',
        completedAt: '2026-03-01T10:02:00Z',
        durationSeconds: 120,
        totalReps: 10,
        averageFormScore: 80,
        averageDepth: 105,
        painBefore: 4,
        painAfter: 4,
      },
      {
        id: 's2',
        startedAt: '2026-03-03T10:00:00Z',
        completedAt: '2026-03-03T10:02:00Z',
        durationSeconds: 120,
        totalReps: 10,
        averageFormScore: 92,
        averageDepth: 88,
        painBefore: 3,
        painAfter: 2,
      },
    ];

    const metrics = calculateLongitudinalMetrics(mockSessions);
    assert.strictEqual(metrics.totalSessions, 2);
    assert.strictEqual(metrics.totalReps, 20);
    assert.strictEqual(metrics.averageFormScore, 86); // (80 + 92) / 2
    assert.strictEqual(metrics.latestFormScore, 92);
    assert.strictEqual(metrics.formScoreDelta, 12); // 92 - 80
    assert.strictEqual(metrics.depthImprovementDelta, 17); // 105 - 88 (17 degrees lower)
    assert.strictEqual(metrics.targetFlexionAchieved, true); // 88 <= 90
    assert.strictEqual(metrics.recoveryStatus, 'PROGRESSING_WELL');
  });

  await t.test('detects elevated pain trajectory', () => {
    const mockElevated = [
      {
        id: 's1',
        startedAt: '2026-03-01T10:00:00Z',
        totalReps: 10,
        averageFormScore: 75,
        averageDepth: 100,
        painBefore: 2,
        painAfter: 5, // +3
      },
      {
        id: 's2',
        startedAt: '2026-03-03T10:00:00Z',
        totalReps: 10,
        averageFormScore: 75,
        averageDepth: 100,
        painBefore: 3,
        painAfter: 6, // +3
      },
    ];

    const metrics = calculateLongitudinalMetrics(mockElevated);
    assert.strictEqual(metrics.recoveryStatus, 'ELEVATED_PAIN');
  });

  await t.test('formats data structures cleanly for Recharts', () => {
    const mockSessions = [
      {
        id: 's1',
        startedAt: '2026-03-01T10:00:00Z',
        averageFormScore: 82,
        averageDepth: 96,
        painBefore: 4,
        painAfter: 3,
      },
      {
        id: 's2',
        startedAt: '2026-03-02T10:00:00Z',
        averageFormScore: 88,
        averageDepth: 89,
        painBefore: 3,
        painAfter: 2,
      },
    ];

    const charts = formatTrendDataForCharts(mockSessions);
    assert.strictEqual(charts.formTrendData.length, 2);
    assert.strictEqual(charts.formTrendData[0].formScore, 82);
    assert.strictEqual(charts.formTrendData[1].targetScore, 85);

    assert.strictEqual(charts.romTrendData.length, 2);
    assert.strictEqual(charts.romTrendData[0].depth, 96);
    assert.strictEqual(charts.romTrendData[0].isTargetMet, false);
    assert.strictEqual(charts.romTrendData[1].depth, 89);
    assert.strictEqual(charts.romTrendData[1].isTargetMet, true);

    assert.strictEqual(charts.painTrendData.length, 2);
    assert.strictEqual(charts.painTrendData[0].painBefore, 4);
    assert.strictEqual(charts.painTrendData[0].painAfter, 3);
    assert.strictEqual(charts.painTrendData[0].painDelta, -1);
    assert.strictEqual(charts.painTrendData[0].trend, 'IMPROVED');
  });

  await t.test('generates sample clinical recovery cohort accurately', () => {
    const sample = getSampleRecoverySessions();
    assert.strictEqual(sample.length, 10);

    const first = sample[0];
    const last = sample[sample.length - 1];

    assert.strictEqual(first.averageDepth, 118);
    assert.strictEqual(last.averageDepth, 89);
    assert.ok(last.averageFormScore > first.averageFormScore);
    assert.ok(last.painBefore < first.painBefore);

    const metrics = calculateLongitudinalMetrics(sample);
    assert.strictEqual(metrics.totalSessions, 10);
    assert.ok(metrics.totalReps > 90);
    assert.strictEqual(metrics.targetFlexionAchieved, true);
    assert.strictEqual(metrics.recoveryStatus, 'PROGRESSING_WELL');
  });
});
