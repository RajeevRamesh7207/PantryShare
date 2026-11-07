// Small hand-built data sets for tests (shared helper, not a test file).
import { createRepository } from '../src/repository.js';
import { buildPlan } from '../src/allocate.js';

export function makeData(over = {}) {
  return {
    planDate: '2026-11-09',
    partners: [],
    inventory: [],
    requests: [],
    pickups: [],
    history: [],
    targets: { produce: 25, dairy: 30, meat: 15, dry: 30 },
    conversions: {},
    ...over,
  };
}

export function partner(id, households, o = {}) {
  return {
    id,
    name: o.name ?? `Pantry ${id}`,
    households,
    storage: { refrigeratorKg: 500, freezerKg: 500, ...o.storage },
    pickupDay: o.pickupDay ?? 1,
  };
}

export function record(id, item, category, quantity, expiry, unit = 'kg') {
  return { id, item, category, unit, quantity, expiry };
}

export function planFor(data, setup) {
  const repo = createRepository(data);
  if (setup) setup(repo);
  return buildPlan(repo.snapshot());
}

export const line = (plan, partnerId, item) =>
  plan.partners.find((p) => p.id === partnerId).lines.find((l) => l.item === item);
