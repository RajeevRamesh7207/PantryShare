import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distribute } from '../src/allocate.js';
import { makeData, partner, record, planFor, line } from './helpers.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} expected ${b}, got ${a}`);

test('distribute shares by weight and never exceeds a cap', () => {
  const out = distribute(100, [{ id: 'a', weight: 1, cap: 10 }, { id: 'b', weight: 1, cap: 100 }]);
  near(out.get('a'), 10);
  near(out.get('b'), 90);
});

test('FR2.3: soonest-expiring stock goes first, only up to each fair share', () => {
  const data = makeData({
    partners: [partner('A', 100), partner('B', 100)],
    inventory: [record('R1', 'yogurt', 'dairy', 100, '2026-11-11'), record('R2', 'yogurt', 'dairy', 300, '2026-11-30')],
  });
  const plan = planFor(data);
  for (const id of ['A', 'B']) {
    const l = line(plan, id, 'yogurt');
    near(l.fairKg, 200, 'fair share');
    near(l.kg, 200, 'allocated');
    assert.deepEqual(l.lots.map((x) => x.lotId), ['R1', 'R2']);
    near(l.lots[0].kg, 50, 'soonest lot first');
  }
  near(plan.items[0].unallocatedKg, 0);
});

test('FR2.4: no perishables for a partner without storage; its share is left unallocated and flagged', () => {
  const data = makeData({
    partners: [partner('A', 100, { storage: { refrigeratorKg: 0 } }), partner('B', 100)],
    inventory: [record('R1', 'milk', 'dairy', 200, '2026-12-01'), record('R2', 'rice', 'dry', 200, '2027-06-01')],
  });
  const plan = planFor(data);
  assert.equal(line(plan, 'A', 'milk').kg, 0);
  assert.equal(line(plan, 'A', 'milk').block, 'storage');
  near(line(plan, 'B', 'milk').kg, 100, 'B gets only its fair share');
  near(line(plan, 'A', 'rice').kg, 100, 'dry goods need no storage');
  const surplus = plan.flags.find((f) => f.type === 'surplus');
  assert.equal(surplus.item, 'milk');
  near(surplus.kg, 100);
});

test('FR2.8: a perishable lot is not given to a partner whose pickup is on or after its expiry', () => {
  const data = makeData({
    partners: [partner('A', 100, { pickupDay: 4 }), partner('B', 100, { pickupDay: 1 }), partner('C', 100, { pickupDay: 3 })],
    inventory: [record('R1', 'yogurt', 'dairy', 100, '2026-11-11')], // Wednesday
  });
  const plan = planFor(data);
  assert.equal(line(plan, 'A', 'yogurt').kg, 0, 'Thursday pickup');
  assert.equal(line(plan, 'A', 'yogurt').block, 'pickup');
  assert.equal(line(plan, 'C', 'yogurt').kg, 0, 'pickup on the expiry day is not after it');
  near(line(plan, 'B', 'yogurt').kg, 100 / 3, 'Monday pickup');
});

test('FR2.6 and D4: requests above stock still share by need, and the shortfall is shown', () => {
  const inventory = [record('R1', 'rice', 'dry', 400, '2027-06-01')];
  const partners = [partner('A', 100), partner('B', 300)];
  const requests = [{ partnerId: 'A', item: 'rice', kg: 500, note: 'big event' }, { partnerId: 'B', item: 'rice', kg: 500 }];
  const withRequests = planFor(makeData({ partners, inventory, requests }));
  const without = planFor(makeData({ partners, inventory }));
  near(line(withRequests, 'A', 'rice').kg, 100);
  near(line(withRequests, 'B', 'rice').kg, 300);
  assert.equal(line(withRequests, 'A', 'rice').kg, line(without, 'A', 'rice').kg, 'requests do not change quantities');
  near(line(withRequests, 'A', 'rice').shortfallKg, 400);
  near(line(withRequests, 'B', 'rice').shortfallKg, 200);
  assert.ok(withRequests.flags.some((f) => f.type === 'requests-exceed-stock'));
});

test('FR2.2: need is households served, so a partner with more households gets proportionally more', () => {
  const plan = planFor(makeData({
    partners: [partner('A', 100), partner('B', 200)],
    inventory: [record('R1', 'rice', 'dry', 300, '2027-06-01')],
  }));
  near(line(plan, 'B', 'rice').kg / line(plan, 'A', 'rice').kg, 2);
});

test('FR1.2 with FR2: mixed units combine into one stock that is fully allocated', () => {
  const plan = planFor(
    makeData({
      partners: [partner('A', 100), partner('B', 100)],
      inventory: [record('R1', 'apples', 'produce', 100, '2026-11-25'), record('R2', 'apples', 'produce', 5, '2026-11-25', 'crate')],
    }),
    (repo) => repo.setConversion('apples', 'crate', 20),
  );
  near(plan.items[0].stockKg, 200);
  near(plan.items[0].allocatedKg, 200);
});
