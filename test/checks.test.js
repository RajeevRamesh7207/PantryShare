import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expiryFlags, fairnessOf, nutritionFlags, missedPickupIds } from '../src/checks.js';
import { makeData, partner, record, planFor } from './helpers.js';

test('FR3.1: unallocated stock within 3 days of expiry is flagged, 4 days is not', () => {
  const lot = (daysToExpiry, remainderKg) => ({ item: 'milk', lotId: 'R1', expiry: '2026-11-12', daysToExpiry, remainderKg });
  assert.equal(expiryFlags([lot(3, 10)]).length, 1);
  assert.equal(expiryFlags([lot(4, 10)]).length, 0);
  assert.equal(expiryFlags([lot(1, 0)]).length, 0, 'fully allocated stock is not flagged');
});

test('FR3.1: a large short-dated donation that cannot be fully placed is flagged in the plan', () => {
  const plan = planFor(makeData({
    partners: [partner('A', 100, { pickupDay: 1 }), partner('B', 100, { pickupDay: 4 })],
    inventory: [record('R1', 'yogurt', 'dairy', 2000, '2026-11-11')],
  }));
  const flag = plan.flags.find((f) => f.type === 'expiry');
  assert.equal(flag.item, 'yogurt');
  assert.equal(flag.daysToExpiry, 2);
  assert.ok(Math.abs(flag.kg - 1000) < 1e-6, 'half the donation is left');
});

test('FR3.2: 25 percent from fair share is flagged, exactly 20 percent is not', () => {
  assert.equal(fairnessOf(125, 100).outside, true);
  assert.equal(fairnessOf(75, 100).outside, true);
  assert.equal(fairnessOf(120, 100).outside, false);
  assert.equal(fairnessOf(80, 100).outside, false);
  assert.equal(fairnessOf(0, 0).outside, false, 'no fair share means nothing to compare');

  const base = makeData({ partners: [partner('A', 100), partner('B', 100)], inventory: [record('R1', 'rice', 'dry', 200, '2027-06-01')] });
  const flaggedAt = (kg) => planFor(base, (repo) => repo.setAdjustment('A', 'rice', kg)).partners.find((p) => p.id === 'A').flags.some((f) => f.type === 'fairness');
  assert.equal(flaggedAt(125), true);
  assert.equal(flaggedAt(120), false);
});

test('FR3.3: a partner that missed last week is flagged and its allocation is unchanged', () => {
  const base = makeData({
    partners: [partner('A', 100), partner('B', 100)],
    inventory: [record('R1', 'rice', 'dry', 200, '2027-06-01')],
  });
  const missed = planFor({ ...base, pickups: [{ partnerId: 'A', weekStart: '2026-11-02', collected: false }] });
  const fine = planFor({ ...base, pickups: [{ partnerId: 'A', weekStart: '2026-11-02', collected: true }] });
  assert.ok(missed.partners[0].flags.some((f) => f.type === 'missed-pickup'));
  assert.ok(!fine.partners[0].flags.some((f) => f.type === 'missed-pickup'));
  assert.equal(missed.partners[0].totalKg, fine.partners[0].totalKg);
  assert.deepEqual([...missedPickupIds([{ partnerId: 'A', weekStart: '2026-10-26', collected: false }], '2026-11-09')], [], 'only last week counts');
});

test('FR3.4: a category more than 10 points below target is flagged, exactly 10 is not', () => {
  const targets = { produce: 25, dairy: 30, meat: 15, dry: 30 };
  const flagged = nutritionFlags({ produce: 25, dairy: 19, meat: 15, dry: 41 }, targets);
  assert.deepEqual(flagged.map((f) => f.category), ['dairy']);
  assert.equal(nutritionFlags({ produce: 25, dairy: 20, meat: 15, dry: 40 }, targets).length, 0);
  assert.deepEqual(nutritionFlags({ produce: 0, dairy: 0, meat: 0, dry: 0 }, targets), []);
});
