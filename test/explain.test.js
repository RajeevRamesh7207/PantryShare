import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../src/repository.js';
import { buildPlan } from '../src/allocate.js';
import { makeData, partner, record, planFor, line } from './helpers.js';

test('FR4.1 and NFR2: every allocation line names need, storage, expiry and pickup', () => {
  const plan = buildPlan(createRepository().snapshot());
  let count = 0;
  for (const p of plan.partners) {
    for (const l of p.lines) {
      count += 1;
      assert.match(l.explanation, /Need:/, `${p.id} ${l.item}`);
      assert.match(l.explanation, /Storage:/, `${p.id} ${l.item}`);
      assert.match(l.explanation, /Expiry:/, `${p.id} ${l.item}`);
      assert.match(l.explanation, /Pickup:/, `${p.id} ${l.item}`);
    }
  }
  assert.ok(count >= 60 * 10, `checked ${count} lines`);
});

test('FR4.1: a line with no quantity explains why', () => {
  const plan = planFor(makeData({
    partners: [partner('A', 100, { storage: { refrigeratorKg: 0 } }), partner('B', 100, { pickupDay: 4 })],
    inventory: [record('R1', 'milk', 'dairy', 100, '2026-11-11')],
  }));
  assert.match(line(plan, 'A', 'milk').explanation, /no refrigeration/);
  assert.match(line(plan, 'B', 'milk').explanation, /after all milk expires/);
});

test('FR4.2: requests and notes are shown beside the suggestion without changing it', () => {
  const base = makeData({ partners: [partner('A', 100), partner('B', 100)], inventory: [record('R1', 'rice', 'dry', 200, '2027-06-01')] });
  const withRequest = planFor({ ...base, requests: [{ partnerId: 'A', item: 'rice', kg: 500, note: 'Hosting a meal' }] });
  const l = line(withRequest, 'A', 'rice');
  assert.equal(l.requestedKg, 500);
  assert.equal(l.note, 'Hosting a meal');
  assert.match(l.explanation, /Requested 500 kg \("Hosting a meal"\)/);
  assert.equal(l.kg, line(planFor(base), 'A', 'rice').kg);
});

test('FR5: an adjusted line says the coordinator changed it', () => {
  const plan = planFor(
    makeData({ partners: [partner('A', 100)], inventory: [record('R1', 'rice', 'dry', 200, '2027-06-01')] }),
    (repo) => repo.setAdjustment('A', 'rice', 40),
  );
  assert.match(line(plan, 'A', 'rice').explanation, /Coordinator adjusted this to 40 kg/);
});
