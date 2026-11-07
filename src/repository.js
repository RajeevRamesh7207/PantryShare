// In-memory store. Holds the dataset plus the coordinator's settings (conversion factors,
// expiry dates) and adjustments, and turns them into a clean snapshot for the allocation engine.

import { buildSampleData } from './sample-data.js';
import { validateDataset, ValidationError, isIsoDate, BASE_UNIT } from './model.js';

const MAX_KG = 1_000_000;

function validFactor(f) {
  return typeof f === 'number' && Number.isFinite(f) && f > 0;
}

function sortLots(lots) {
  return lots.sort((a, b) => (a.expiry < b.expiry ? -1 : a.expiry > b.expiry ? 1 : a.lotId < b.lotId ? -1 : 1));
}

/**
 * Pure: build the snapshot the engine plans from.
 * FR1.2 items with a non-kg unit and no factor are left out and flagged.
 * FR1.3 records without an expiry date are left out and flagged.
 * FR1.4 partners with missing or zero households are left out and flagged.
 * D5 stock already expired on the plan date is not stock on hand; it is listed separately.
 */
export function buildSnapshot(data, conversions, expiryOverrides, adjustments) {
  const partners = [];
  const excludedPartners = [];
  for (const p of data.partners) {
    if (Number.isFinite(p.households) && p.households > 0) partners.push(p);
    else excludedPartners.push({ id: p.id, name: p.name, reason: 'missing or zero households served' });
  }

  const byItem = new Map();
  for (const r of data.inventory) {
    if (!byItem.has(r.item)) byItem.set(r.item, []);
    byItem.get(r.item).push(r);
  }

  const items = [];
  const excludedItems = [];
  const excludedRecords = [];
  const expiredLots = [];
  for (const name of [...byItem.keys()].sort()) {
    const records = byItem.get(name);
    const category = records[0].category;
    const missing = [...new Set(records.filter((r) => r.unit !== BASE_UNIT && !validFactor(conversions[name]?.[r.unit])).map((r) => r.unit))];
    if (missing.length) {
      excludedItems.push({ item: name, category, units: missing, reason: `no conversion factor to ${BASE_UNIT} for unit ${missing.join(', ')}` });
      continue;
    }
    const lots = [];
    for (const r of records) {
      const factor = r.unit === BASE_UNIT ? 1 : conversions[name][r.unit];
      const expiry = expiryOverrides[r.id] ?? r.expiry;
      if (!expiry) {
        excludedRecords.push({ recordId: r.id, item: name, category, reason: 'no expiry date' });
        continue;
      }
      const lot = { lotId: r.id, item: name, category, kg: r.quantity * factor, expiry };
      if (expiry < data.planDate) expiredLots.push(lot);
      else lots.push(lot);
    }
    if (lots.length > 0) items.push({ item: name, category, lots: sortLots(lots) });
  }

  return {
    planDate: data.planDate,
    partners,
    excludedPartners,
    items,
    excludedItems,
    excludedRecords,
    expiredLots: sortLots(expiredLots),
    requests: data.requests.filter((q) => partners.some((p) => p.id === q.partnerId)),
    pickups: data.pickups,
    targets: data.targets,
    history: data.history,
    conversions: structuredClone(conversions),
    adjustments: { ...adjustments },
  };
}

export function createRepository(dataset = buildSampleData()) {
  validateDataset(dataset);
  const data = structuredClone(dataset);
  const conversions = structuredClone(data.conversions ?? {});
  const expiryOverrides = {};
  const adjustments = new Map();

  const snapshot = () => buildSnapshot(data, conversions, expiryOverrides, Object.fromEntries(adjustments));

  return {
    snapshot,

    /** FR1.2 */
    setConversion(item, unit, factor) {
      if (!data.inventory.some((r) => r.item === item)) throw new ValidationError(`unknown item "${item}"`);
      if (typeof unit !== 'string' || unit.trim() === '' || unit === BASE_UNIT) throw new ValidationError(`unit must be a unit other than ${BASE_UNIT}`);
      if (!validFactor(factor)) throw new ValidationError('factor must be a number greater than 0');
      conversions[item] = { ...(conversions[item] ?? {}), [unit]: factor };
    },

    /** FR1.3 */
    setExpiry(recordId, date) {
      if (!data.inventory.some((r) => r.id === recordId)) throw new ValidationError(`unknown inventory record "${recordId}"`);
      if (!isIsoDate(date)) throw new ValidationError('expiry must be a YYYY-MM-DD date');
      expiryOverrides[recordId] = date;
    },

    /** FR5.1, FR5.2: a null quantity clears the adjustment. Adjustments are kept until cleared. */
    setAdjustment(partnerId, item, kg) {
      const snap = snapshot();
      if (!snap.partners.some((p) => p.id === partnerId)) throw new ValidationError(`unknown or excluded partner "${partnerId}"`);
      if (!snap.items.some((i) => i.item === item)) throw new ValidationError(`unknown or excluded item "${item}"`);
      const key = `${partnerId}|${item}`;
      if (kg === null) {
        adjustments.delete(key);
        return;
      }
      if (typeof kg !== 'number' || !Number.isFinite(kg) || kg < 0 || kg > MAX_KG) {
        throw new ValidationError(`kg must be a number from 0 to ${MAX_KG}`);
      }
      adjustments.set(key, kg);
    },
  };
}
