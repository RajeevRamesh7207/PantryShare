import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../src/repository.js';
import { ValidationError } from '../src/model.js';
import { makeData, partner, record } from './helpers.js';

const stockOf = (snap, item) => snap.items.find((i) => i.item === item)?.lots.reduce((s, l) => s + l.kg, 0);

test('FR1.2: a conversion factor combines kg and case records into one total', () => {
  const data = makeData({
    partners: [partner('A', 10)],
    inventory: [
      record('R1', 'yogurt', 'dairy', 100, '2026-11-20'),
      record('R2', 'yogurt', 'dairy', 5, '2026-11-20', 'case'),
    ],
  });
  const repo = createRepository(data);
  assert.equal(repo.snapshot().excludedItems.length, 1);
  assert.equal(repo.snapshot().excludedItems[0].item, 'yogurt');
  assert.equal(stockOf(repo.snapshot(), 'yogurt'), undefined, 'item is left out until a factor is set');
  repo.setConversion('yogurt', 'case', 12);
  const snap = repo.snapshot();
  assert.equal(snap.excludedItems.length, 0);
  assert.equal(stockOf(snap, 'yogurt'), 160);
});

test('FR1.2: an item without a factor is left out of the plan and flagged', () => {
  const data = makeData({
    partners: [partner('A', 10)],
    inventory: [record('R1', 'beans', 'dry', 60, '2027-01-01', 'case'), record('R2', 'rice', 'dry', 50, '2027-01-01')],
  });
  const snap = createRepository(data).snapshot();
  assert.deepEqual(snap.items.map((i) => i.item), ['rice']);
  assert.match(snap.excludedItems[0].reason, /no conversion factor/);
  const repo = createRepository(data);
  assert.throws(() => repo.setConversion('beans', 'case', 0), ValidationError);
  assert.throws(() => repo.setConversion('nothing', 'case', 2), /unknown item/);
});

test('FR1.3: a record without an expiry is left out until the coordinator sets one', () => {
  const data = makeData({
    partners: [partner('A', 10)],
    inventory: [record('R1', 'granola', 'dry', 20, null), record('R2', 'granola', 'dry', 30, '2027-01-01')],
  });
  const repo = createRepository(data);
  assert.equal(stockOf(repo.snapshot(), 'granola'), 30);
  assert.equal(repo.snapshot().excludedRecords[0].recordId, 'R1');
  repo.setExpiry('R1', '2027-02-01');
  assert.equal(stockOf(repo.snapshot(), 'granola'), 50);
  assert.equal(repo.snapshot().excludedRecords.length, 0);
  assert.throws(() => repo.setExpiry('R1', 'soon'), /YYYY-MM-DD/);
});

test('FR1.4: a partner with zero or missing households is left out and flagged', () => {
  const data = makeData({
    partners: [partner('A', 10), partner('B', 0), partner('C', undefined)],
    inventory: [record('R1', 'rice', 'dry', 50, '2027-01-01')],
  });
  const snap = createRepository(data).snapshot();
  assert.deepEqual(snap.partners.map((p) => p.id), ['A']);
  assert.deepEqual(snap.excludedPartners.map((p) => p.id), ['B', 'C']);
});

test('D5: stock already expired on the plan date is not stock on hand', () => {
  const data = makeData({
    partners: [partner('A', 10)],
    inventory: [record('R1', 'milk', 'dairy', 40, '2026-11-08'), record('R2', 'milk', 'dairy', 60, '2026-11-09')],
  });
  const snap = createRepository(data).snapshot();
  assert.equal(stockOf(snap, 'milk'), 60);
  assert.equal(snap.expiredLots[0].lotId, 'R1');
});

test('FR5.1: adjustments are validated and can be cleared', () => {
  const repo = createRepository(makeData({ partners: [partner('A', 10)], inventory: [record('R1', 'rice', 'dry', 50, '2027-01-01')] }));
  repo.setAdjustment('A', 'rice', 12);
  assert.equal(repo.snapshot().adjustments['A|rice'], 12);
  assert.throws(() => repo.setAdjustment('Z', 'rice', 1), /unknown or excluded partner/);
  assert.throws(() => repo.setAdjustment('A', 'rice', -1), /kg must be/);
  repo.setAdjustment('A', 'rice', null);
  assert.deepEqual(repo.snapshot().adjustments, {});
});
