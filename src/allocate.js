// Allocation engine and plan builder.
//
// Rules (requirements FR2, decisions D1 to D6 in the plan):
//  - need is households served; a partner's fair share of an item is its share of total households
//    applied to that item's stock on hand (D1)
//  - stock is given soonest-expiring first, only up to each partner's fair share
//  - dairy needs refrigeration and meat needs a freezer; a perishable lot is never given to a partner
//    whose next pickup is on or after the lot's expiry date
//  - whatever cannot be given stays unallocated and flagged for the coordinator
//  - requests are never an input to quantities

import { PERISHABLE_STORAGE, CATEGORIES, isPerishable, addDays, daysBetween, weekdayName } from './model.js';
import { expiryFlags, fairnessOf, missedPickupIds, nutritionFlags } from './checks.js';
import { buildMeasures } from './measures.js';
import { explainLine } from './explain.js';

const EPS = 1e-9;
const FLAG_MIN_KG = 1e-6;
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const r1 = (n) => Math.round(n * 10) / 10;

/** Water-filling: share `amount` among parties in proportion to weight, never above each party's cap. */
export function distribute(amount, parties) {
  const out = new Map(parties.map((p) => [p.id, 0]));
  let active = parties.filter((p) => p.cap > EPS && p.weight > 0);
  let left = amount;
  while (active.length > 0 && left > EPS) {
    const weight = sum(active, (p) => p.weight);
    const capped = active.filter((p) => (left * p.weight) / weight >= p.cap - out.get(p.id) - EPS);
    if (capped.length === 0) {
      for (const p of active) out.set(p.id, out.get(p.id) + (left * p.weight) / weight);
      left = 0;
      break;
    }
    for (const p of capped) {
      left -= p.cap - out.get(p.id);
      out.set(p.id, p.cap);
    }
    active = active.filter((p) => !capped.includes(p));
  }
  return out;
}

function storageKg(partner, category) {
  const key = PERISHABLE_STORAGE[category];
  return key ? partner.storage[key] : Infinity;
}

function lotBlock(partner, category, lot, pickupDate) {
  if (isPerishable(category)) {
    if (!(storageKg(partner, category) > 0)) return 'storage';
    if (!(lot.expiry > pickupDate)) return 'pickup';
  }
  return null;
}

function itemBlock(partner, item, pickupDate) {
  if (item.lots.length === 0) return 'no-stock';
  if (isPerishable(item.category) && !(storageKg(partner, item.category) > 0)) return 'storage';
  return item.lots.some((l) => !lotBlock(partner, item.category, l, pickupDate)) ? null : 'pickup';
}

/** The suggestion itself: quantity per partner and item, with the lots it came from. */
export function suggest(snapshot) {
  const { planDate, partners, items } = snapshot;
  const totalHouseholds = sum(partners, (p) => p.households);
  const ctxs = partners.map((partner) => ({ partner, pickupDate: addDays(planDate, partner.pickupDay - 1) }));
  const recs = new Map();
  const remainders = new Map();

  for (const item of items) {
    const stockKg = sum(item.lots, (l) => l.kg);
    const remaining = new Map(ctxs.map((c) => [c.partner.id, (c.partner.households / totalHouseholds) * stockKg]));
    for (const c of ctxs) {
      recs.set(`${c.partner.id}|${item.item}`, {
        fairKg: remaining.get(c.partner.id), kg: 0, lots: [], block: itemBlock(c.partner, item, c.pickupDate),
      });
    }
    for (const lot of item.lots) {
      const parties = ctxs
        .filter((c) => !lotBlock(c.partner, item.category, lot, c.pickupDate))
        .map((c) => ({ id: c.partner.id, weight: c.partner.households, cap: Math.max(0, remaining.get(c.partner.id)) }));
      let used = 0;
      for (const [id, amount] of distribute(lot.kg, parties)) {
        if (amount <= EPS) continue;
        const rec = recs.get(`${id}|${item.item}`);
        rec.kg += amount;
        rec.lots.push({ lotId: lot.lotId, kg: amount, expiry: lot.expiry });
        remaining.set(id, remaining.get(id) - amount);
        used += amount;
      }
      remainders.set(lot.lotId, Math.max(0, lot.kg - used));
    }
  }
  return { recs, remainders, ctxs, totalHouseholds };
}

/** Lot remainders after the coordinator's adjustments: extra quantity is taken soonest-first, released quantity returns soonest-first. */
function finalRemainders(lots, suggested, delta) {
  const rem = lots.map((l) => suggested.get(l.lotId));
  let left = Math.abs(delta);
  if (delta > EPS) {
    rem.forEach((r, i) => { const take = Math.min(r, left); rem[i] -= take; left -= take; });
  } else if (delta < -EPS) {
    lots.forEach((l, i) => { const give = Math.min(l.kg - rem[i], left); rem[i] += give; left -= give; });
  }
  return rem;
}

function storageWarnings(partner, line, categoryKg, itemLots, pickupDate) {
  const warnings = [];
  if (!isPerishable(line.category) || line.kg <= EPS) return warnings;
  const capacity = storageKg(partner, line.category);
  const kind = line.category === 'dairy' ? 'refrigeration' : 'a freezer';
  if (!(capacity > 0)) {
    warnings.push({ type: 'storage', message: `${partner.name} has no ${line.category === 'dairy' ? 'refrigeration' : 'freezer'} for ${line.item}` });
  } else if (categoryKg[line.category] > capacity + EPS) {
    warnings.push({ type: 'storage', message: `${r1(categoryKg[line.category])} kg of ${line.category} is more than the ${r1(capacity)} kg ${kind} at ${partner.name}` });
  }
  if (itemLots.length > 0 && itemLots.every((l) => !(l.expiry > pickupDate))) {
    warnings.push({ type: 'pickup', message: `${line.item} expires before ${partner.name}'s pickup on ${pickupDate}` });
  }
  return warnings;
}

export function buildPlan(snapshot) {
  const { planDate, items, targets, adjustments } = snapshot;
  const { recs, remainders, ctxs, totalHouseholds } = suggest(snapshot);
  const missed = missedPickupIds(snapshot.pickups, planDate);
  const itemByName = new Map(items.map((i) => [i.item, i]));
  const stockOf = new Map(items.map((i) => [i.item, sum(i.lots, (l) => l.kg)]));

  const requests = new Map();
  for (const q of snapshot.requests) {
    const key = `${q.partnerId}|${q.item}`;
    const cur = requests.get(key) ?? { kg: 0, notes: [] };
    cur.kg += q.kg;
    if (q.note) cur.notes.push(q.note);
    requests.set(key, cur);
  }

  const totals = new Map(items.map((i) => [i.item, { suggested: 0, final: 0 }]));
  const suggestedAllocations = [];
  const suggestedFairness = [];
  const flags = [];
  const partnersOut = [];

  for (const { partner, pickupDate } of ctxs) {
    const pickupWeekday = weekdayName(pickupDate);
    const lines = items.map((item) => {
      const key = `${partner.id}|${item.item}`;
      const rec = recs.get(key);
      const adjustedKg = Object.hasOwn(adjustments, key) ? adjustments[key] : null;
      const kg = adjustedKg ?? rec.kg;
      const req = requests.get(key);
      const requestedKg = req ? req.kg : 0;
      const note = req ? req.notes.join('; ') : '';
      const totalsEntry = totals.get(item.item);
      totalsEntry.suggested += rec.kg;
      totalsEntry.final += kg;
      for (const l of rec.lots) suggestedAllocations.push({ kg: l.kg, expiry: l.expiry, pickupDate });
      const line = {
        partnerId: partner.id, item: item.item, category: item.category,
        fairKg: rec.fairKg, suggestedKg: rec.kg, adjustedKg, kg,
        lots: rec.lots, block: rec.block, eligible: rec.block === null,
        requestedKg, note, shortfallKg: requestedKg > 0 ? Math.max(0, requestedKg - kg) : null,
        warnings: [],
      };
      line.explanation = explainLine({
        partner, item: item.item, category: item.category, totalHouseholds, stockKg: stockOf.get(item.item),
        fairKg: rec.fairKg, suggestedKg: rec.kg, adjustedKg, kg, block: rec.block, lots: rec.lots,
        itemLots: item.lots, pickupDate, pickupWeekday, requestedKg, note,
      });
      return line;
    });

    const categoryKg = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const l of lines) categoryKg[l.category] += l.kg;
    for (const l of lines) l.warnings = storageWarnings(partner, l, categoryKg, itemByName.get(l.item).lots, pickupDate);

    const eligible = lines.filter((l) => l.eligible && stockOf.get(l.item) > 0);
    const fairness = fairnessOf(sum(eligible, (l) => l.kg), sum(eligible, (l) => l.fairKg));
    suggestedFairness.push({ id: partner.id, ...fairnessOf(sum(eligible, (l) => l.suggestedKg), fairness.fairKg) });

    const pFlags = [];
    if (fairness.outside) {
      pFlags.push({
        type: 'fairness', severity: 'warn', scope: 'partner', partnerId: partner.id, deviationPct: fairness.deviationPct,
        message: `${partner.name} is ${Math.abs(fairness.deviationPct).toFixed(1)}% ${fairness.deviationPct > 0 ? 'above' : 'below'} its fair share (band is 20%)`,
      });
    }
    if (missed.has(partner.id)) {
      pFlags.push({ type: 'missed-pickup', severity: 'warn', scope: 'partner', partnerId: partner.id, message: `${partner.name} missed last week's pickup; allocation kept for the coordinator to decide` });
    }
    for (const n of nutritionFlags(categoryKg, targets)) {
      pFlags.push({
        type: 'nutrition', severity: 'warn', scope: 'partner', partnerId: partner.id, category: n.category,
        message: `${partner.name}: ${n.category} is ${n.sharePct.toFixed(1)}% of its allocation, target ${n.targetPct}%`,
      });
    }
    const storageCount = sum(lines, (l) => l.warnings.length);
    if (storageCount > 0) {
      pFlags.push({ type: 'storage', severity: 'warn', scope: 'partner', partnerId: partner.id, message: `${partner.name} has ${storageCount} storage or pickup warning(s)` });
    }
    flags.push(...pFlags);

    partnersOut.push({
      id: partner.id, name: partner.name, households: partner.households,
      pickupDate, pickupWeekday, missedLastPickup: missed.has(partner.id),
      totalKg: sum(lines, (l) => l.kg), categoryKg,
      fairKg: fairness.fairKg, eligibleKg: fairness.allocatedKg, deviationPct: fairness.deviationPct, outsideBand: fairness.outside,
      flags: pFlags, lines,
    });
  }

  // Item level: stock, allocation, lot remainders, expiry and surplus flags.
  const itemsOut = [];
  const lotsForExpiry = [];
  const lotsForMeasures = [];
  for (const item of items) {
    const t = totals.get(item.item);
    const rem = finalRemainders(item.lots, remainders, t.final - t.suggested);
    const stockKg = stockOf.get(item.item);
    const lots = item.lots.map((l, i) => {
      const daysToExpiry = daysBetween(planDate, l.expiry);
      lotsForExpiry.push({ item: item.item, lotId: l.lotId, expiry: l.expiry, daysToExpiry, remainderKg: rem[i] });
      lotsForMeasures.push({ kg: l.kg, remainderKg: remainders.get(l.lotId) });
      return { lotId: l.lotId, kg: l.kg, expiry: l.expiry, daysToExpiry, remainderKg: rem[i] };
    });
    const unallocatedKg = stockKg - t.final;
    if (unallocatedKg > FLAG_MIN_KG) {
      flags.push({ type: 'surplus', severity: 'warn', scope: 'item', item: item.item, kg: unallocatedKg, message: `${r1(unallocatedKg)} kg of ${item.item} is unallocated; the coordinator decides what to do with it` });
    } else if (unallocatedKg < -FLAG_MIN_KG) {
      flags.push({ type: 'over-allocated', severity: 'warn', scope: 'item', item: item.item, kg: -unallocatedKg, message: `${item.item} is allocated ${r1(-unallocatedKg)} kg above the stock on hand` });
    }
    const requestedKg = sum(snapshot.requests.filter((q) => q.item === item.item), (q) => q.kg);
    if (requestedKg > stockKg + EPS) {
      flags.push({ type: 'requests-exceed-stock', severity: 'info', scope: 'item', item: item.item, message: `Requests for ${item.item} (${r1(requestedKg)} kg) exceed stock (${r1(stockKg)} kg); stock is shared by need` });
    }
    itemsOut.push({ item: item.item, category: item.category, stockKg, suggestedKg: t.suggested, allocatedKg: t.final, unallocatedKg, requestedKg, lots });
  }
  flags.push(...expiryFlags(lotsForExpiry, FLAG_MIN_KG));

  for (const l of snapshot.expiredLots) {
    flags.push({ type: 'expired', severity: 'warn', scope: 'item', item: l.item, lotId: l.lotId, kg: l.kg, expiry: l.expiry, message: `${r1(l.kg)} kg of ${l.item} (lot ${l.lotId}) expired ${l.expiry}, before the plan date, and is not stock on hand` });
  }
  for (const i of snapshot.excludedItems) flags.push({ type: 'excluded-item', severity: 'warn', scope: 'item', item: i.item, message: `${i.item} is left out of the plan: ${i.reason}` });
  for (const r of snapshot.excludedRecords) flags.push({ type: 'excluded-record', severity: 'warn', scope: 'item', item: r.item, recordId: r.recordId, message: `${r.item} (record ${r.recordId}) is left out of the plan: ${r.reason}` });
  for (const p of snapshot.excludedPartners) flags.push({ type: 'excluded-partner', severity: 'warn', scope: 'partner', partnerId: p.id, message: `${p.name} is left out of the plan: ${p.reason}` });

  const measures = buildMeasures({
    planDate,
    snapshotHistory: snapshot.history,
    lots: lotsForMeasures,
    allocations: suggestedAllocations,
    expiredLots: snapshot.expiredLots,
    partnerFairness: suggestedFairness,
  });

  return {
    planDate,
    totalHouseholds,
    partners: partnersOut,
    items: itemsOut,
    excluded: { items: snapshot.excludedItems, records: snapshot.excludedRecords, partners: snapshot.excludedPartners, expiredLots: snapshot.expiredLots },
    flags,
    measures,
    adjustments: { ...adjustments },
    totals: {
      stockKg: sum(itemsOut, (i) => i.stockKg),
      allocatedKg: sum(itemsOut, (i) => i.allocatedKg),
      unallocatedKg: sum(itemsOut, (i) => i.unallocatedKg),
      partnersFlagged: partnersOut.filter((p) => p.flags.length > 0).length,
    },
  };
}
