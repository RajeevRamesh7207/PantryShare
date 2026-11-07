import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBaseline, planSpoilage, meetsSpoilageTarget, weeklyComparison, fairnessMeasure } from '../src/measures.js';
import { createRepository } from '../src/repository.js';
import { buildPlan } from '../src/allocate.js';

const week = (weekStart, receivedKg, spoiledKg, partnerAllocations = []) => ({ weekStart, receivedKg, spoiledKg, partnerAllocations });

test('FR6.1: baseline is the history total over the number of weeks, and the target is 25 percent lower', () => {
  const baseline = computeBaseline([week('2026-10-26', 1000, 100), week('2026-11-02', 1000, 140)]);
  assert.equal(baseline.weeks, 2);
  assert.equal(baseline.avgWeeklySpoiledKg, 120);
  assert.equal(baseline.spoilagePct, 12);
  assert.ok(Math.abs(baseline.targetSpoilagePct - 9) < 1e-9);
  assert.equal(computeBaseline([]).spoilagePct, null, 'no history means no baseline');
});

test('FR6.1: unallocated, late and already-expired stock count as spoiled', () => {
  const s = planSpoilage({
    lots: [{ kg: 100, remainderKg: 10 }, { kg: 100, remainderKg: 0 }],
    allocations: [{ kg: 5, expiry: '2026-11-10', pickupDate: '2026-11-12' }, { kg: 50, expiry: '2026-11-20', pickupDate: '2026-11-12' }],
    expiredLots: [{ kg: 20 }],
  });
  assert.equal(s.receivedKg, 220);
  assert.equal(s.spoiledKg, 35);
  assert.ok(Math.abs(s.spoilagePct - (35 / 220) * 100) < 1e-9);
});

test('FR6.1: weekly comparison passes at the target and fails just above it', () => {
  const baseline = computeBaseline([week('2026-11-02', 1000, 120)]);
  assert.equal(meetsSpoilageTarget(9, baseline), true);
  assert.equal(meetsSpoilageTarget(9.1, baseline), false);
  const rows = weeklyComparison([week('2026-11-02', 1000, 120)], baseline, { weekStart: '2026-11-09', spoilagePct: 8 });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].meetsTarget, false);
  assert.equal(rows[1].meetsTarget, true);
  assert.ok(rows[1].changeVsBaselinePct < -25);
});

test('FR6.2: fairness passes only when no partner is outside the band', () => {
  const baseline = computeBaseline([]);
  assert.equal(fairnessMeasure([{ id: 'A', outside: false }], baseline).pass, true);
  const failing = fairnessMeasure([{ id: 'A', outside: false }, { id: 'B', outside: true }], baseline);
  assert.equal(failing.pass, false);
  assert.deepEqual(failing.outsideIds, ['B']);
});

test('NFR4 and FR6: the same data gives the same plan, and the sample plan meets both targets', () => {
  const first = buildPlan(createRepository().snapshot());
  const second = buildPlan(createRepository().snapshot());
  assert.deepEqual(first, second);
  assert.equal(first.measures.spoilage.pass, true, `spoilage ${first.measures.spoilage.spoilagePct} vs target ${first.measures.spoilage.targetPct}`);
  assert.equal(first.measures.fairness.pass, true, `outside: ${first.measures.fairness.outsideIds}`);
});
