import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSampleData } from '../src/sample-data.js';
import {
  validateDataset, validatePartner, validateInventoryRecord, ValidationError, PERSONAL_FIELDS, CATEGORIES,
} from '../src/model.js';

test('FR1.1: sample data has 60 partners and inventory with the required fields', () => {
  const data = validateDataset(buildSampleData());
  assert.equal(data.partners.length, 60);
  for (const p of data.partners) {
    assert.ok(p.id && p.name);
    assert.ok(Number.isInteger(p.households) && p.households > 0);
    assert.ok(p.storage && 'refrigeratorKg' in p.storage && 'freezerKg' in p.storage);
    assert.ok(p.pickupDay >= 1 && p.pickupDay <= 5);
  }
  assert.ok(data.inventory.length >= 12);
  for (const r of data.inventory) {
    assert.ok(r.item && r.unit && CATEGORIES.includes(r.category));
    assert.ok(r.quantity > 0);
  }
  assert.ok(new Set(data.inventory.map((r) => r.unit)).size >= 3, 'several units');
});

test('NFR1: sample data has no personal client fields, and personal fields are rejected', () => {
  const text = JSON.stringify(buildSampleData());
  for (const field of PERSONAL_FIELDS) assert.ok(!text.includes(`"${field}"`), `found ${field}`);
  const partner = buildSampleData().partners[0];
  assert.throws(() => validatePartner({ ...partner, clientName: 'Someone' }), ValidationError);
});

test('invalid records are rejected with a clear error', () => {
  const partner = buildSampleData().partners[0];
  assert.throws(() => validatePartner({ ...partner, pickupDay: 9 }), /pickupDay/);
  assert.throws(() => validatePartner({ ...partner, households: -4 }), /households/);
  const record = buildSampleData().inventory[0];
  assert.throws(() => validateInventoryRecord({ ...record, category: 'candy' }), /category/);
  assert.throws(() => validateInventoryRecord({ ...record, expiry: '11/11/2026' }), /expiry/);
  const data = buildSampleData();
  data.partners.push({ ...data.partners[0] });
  assert.throws(() => validateDataset(data), /duplicate partner/);
});

test('NFR4: the same seed gives identical data', () => {
  assert.deepEqual(buildSampleData(), buildSampleData());
});
