// Expiry, fairness, missed-pickup and nutrition flags. Thresholds are fixed by the requirements.

import { CATEGORIES, addDays } from './model.js';

export const EXPIRY_WINDOW_DAYS = 3; // FR3.1
export const FAIRNESS_BAND_PCT = 20; // FR3.2
export const NUTRITION_GAP_POINTS = 10; // FR3.4
const TOLERANCE = 1e-9;

/** FR3.1: stock within 3 days of expiry (today counts) that is not yet allocated. */
export function expiryFlags(lots, minUnallocatedKg = 1e-6) {
  return lots
    .filter((l) => l.remainderKg > minUnallocatedKg && l.daysToExpiry <= EXPIRY_WINDOW_DAYS)
    .map((l) => ({
      type: 'expiry', severity: 'warn', scope: 'item', item: l.item, lotId: l.lotId, kg: l.remainderKg,
      expiry: l.expiry, daysToExpiry: l.daysToExpiry,
      message: `${l.item} (lot ${l.lotId}) expires ${l.expiry}, in ${l.daysToExpiry} day(s), and ${round1(l.remainderKg)} kg is not allocated`,
    }));
}

/** FR3.2 and D2: compare a partner's total on its eligible items with the sum of its fair shares of them. */
export function fairnessOf(allocatedKg, fairKg) {
  if (!(fairKg > TOLERANCE)) return { allocatedKg, fairKg, deviationPct: null, outside: false };
  const deviationPct = ((allocatedKg - fairKg) / fairKg) * 100;
  return { allocatedKg, fairKg, deviationPct, outside: Math.abs(deviationPct) > FAIRNESS_BAND_PCT + TOLERANCE };
}

/** FR3.3: a partner whose pickup record for the previous week says it did not collect. */
export function missedPickupIds(pickups, planDate) {
  const lastWeek = addDays(planDate, -7);
  return new Set(pickups.filter((p) => p.weekStart === lastWeek && p.collected === false).map((p) => p.partnerId));
}

/** FR3.4: flag a category more than 10 percentage points below its target share. */
export function nutritionFlags(categoryKg, targets) {
  const total = CATEGORIES.reduce((s, c) => s + (categoryKg[c] ?? 0), 0);
  if (!(total > TOLERANCE)) return [];
  const flags = [];
  for (const category of CATEGORIES) {
    const sharePct = ((categoryKg[category] ?? 0) / total) * 100;
    if (targets[category] - sharePct > NUTRITION_GAP_POINTS + TOLERANCE) {
      flags.push({ category, sharePct, targetPct: targets[category] });
    }
  }
  return flags;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
