// Success measures against baselines from the synthetic history (FR6.1, FR6.2).

import { FAIRNESS_BAND_PCT, fairnessOf } from './checks.js';

export const SPOILAGE_REDUCTION = 0.25; // intent: spoilage down at least 25 percent
const TOLERANCE = 1e-9;
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/** A2: the baseline weekly average is the total over the history divided by the number of weeks. */
export function computeBaseline(history) {
  const weeks = history.length;
  if (weeks === 0) return { weeks: 0, spoilagePct: null, targetSpoilagePct: null, avgWeeklyReceivedKg: null, avgWeeklySpoiledKg: null, avgPartnersOutsideBand: null };
  const received = sum(history, (w) => w.receivedKg);
  const spoiled = sum(history, (w) => w.spoiledKg);
  const outside = sum(history, (w) => w.partnerAllocations.filter((a) => fairnessOf(a.allocatedKg, a.fairShareKg).outside).length);
  const spoilagePct = pct(spoiled, received);
  return {
    weeks,
    avgWeeklyReceivedKg: received / weeks,
    avgWeeklySpoiledKg: spoiled / weeks,
    spoilagePct,
    targetSpoilagePct: spoilagePct * (1 - SPOILAGE_REDUCTION),
    avgPartnersOutsideBand: outside / weeks,
  };
}

/**
 * FR6.1: spoiled food as percent of received weight. For a suggested plan, unallocated stock and
 * stock given to a partner whose next pickup is after the stock expires count as spoiled.
 * lots: [{kg, remainderKg}], allocations: [{kg, expiry, pickupDate}], expiredLots: [{kg}].
 */
export function planSpoilage({ lots, allocations, expiredLots }) {
  const receivedKg = sum(lots, (l) => l.kg) + sum(expiredLots, (l) => l.kg);
  const unallocatedKg = sum(lots, (l) => l.remainderKg);
  const lateKg = sum(allocations.filter((a) => a.pickupDate > a.expiry), (a) => a.kg);
  const expiredKg = sum(expiredLots, (l) => l.kg);
  const spoiledKg = unallocatedKg + lateKg + expiredKg;
  return { receivedKg, spoiledKg, unallocatedKg, lateKg, expiredKg, spoilagePct: pct(spoiledKg, receivedKg) };
}

export function meetsSpoilageTarget(spoilagePct, baseline) {
  if (baseline.targetSpoilagePct === null) return null;
  return spoilagePct <= baseline.targetSpoilagePct + TOLERANCE;
}

/** Weekly comparison: every history week and the planned week against the baseline. */
export function weeklyComparison(history, baseline, current) {
  const row = (weekStart, spoilagePct, kind) => ({
    weekStart, kind, spoilagePct,
    changeVsBaselinePct: baseline.spoilagePct ? ((spoilagePct - baseline.spoilagePct) / baseline.spoilagePct) * 100 : null,
    meetsTarget: meetsSpoilageTarget(spoilagePct, baseline),
  });
  return [
    ...history.map((w) => row(w.weekStart, pct(w.spoiledKg, w.receivedKg), 'history')),
    row(current.weekStart, current.spoilagePct, 'plan'),
  ];
}

/** FR6.2: partners outside the fairness band. Pass means none. */
export function fairnessMeasure(partnerFairness, baseline) {
  const outsideIds = partnerFairness.filter((p) => p.outside).map((p) => p.id);
  return {
    bandPct: FAIRNESS_BAND_PCT,
    outsideCount: outsideIds.length,
    outsideIds,
    baselineAvgOutside: baseline.avgPartnersOutsideBand,
    pass: outsideIds.length === 0,
  };
}

export function buildMeasures({ planDate, snapshotHistory, lots, allocations, expiredLots, partnerFairness }) {
  const baseline = computeBaseline(snapshotHistory);
  const spoilage = planSpoilage({ lots, allocations, expiredLots });
  return {
    baseline,
    spoilage: { ...spoilage, targetPct: baseline.targetSpoilagePct, pass: meetsSpoilageTarget(spoilage.spoilagePct, baseline) },
    fairness: fairnessMeasure(partnerFairness, baseline),
    weekly: weeklyComparison(snapshotHistory, baseline, { weekStart: planDate, spoilagePct: spoilage.spoilagePct }),
  };
}
