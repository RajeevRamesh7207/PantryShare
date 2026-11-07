// Data shapes, date helpers and validation for PantryShare.
// Synthetic data only: records that look like personal client data are rejected (NFR1).

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const CATEGORIES = Object.freeze(['produce', 'dairy', 'meat', 'dry']);
// D3: dairy needs refrigeration, frozen meat needs a freezer. Produce and dry goods need nothing special.
export const PERISHABLE_STORAGE = Object.freeze({ dairy: 'refrigeratorKg', meat: 'freezerKg' });
export const STORAGE_LABEL = Object.freeze({ dairy: 'refrigeration', meat: 'a freezer' });
export const BASE_UNIT = 'kg';
export const PERSONAL_FIELDS = Object.freeze([
  'clientName', 'clients', 'clientId', 'client', 'address', 'phone', 'email',
  'dateOfBirth', 'dob', 'ssn', 'firstName', 'lastName',
]);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MS = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isPerishable(category) {
  return Object.hasOwn(PERISHABLE_STORAGE, category);
}

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

export function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from a to b (b minus a). */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export function weekdayName(iso) {
  return WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

function fail(message) {
  throw new ValidationError(message);
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function requireString(obj, key, what) {
  if (typeof obj[key] !== 'string' || obj[key].trim() === '') fail(`${what}: "${key}" must be a non-empty string`);
}

function requireNonNegative(value, what) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${what} must be a number of 0 or more`);
}

function rejectPersonalFields(obj, what) {
  for (const key of Object.keys(obj)) {
    if (PERSONAL_FIELDS.includes(key)) fail(`${what}: personal field "${key}" is not allowed (synthetic data only)`);
  }
}

/** Households may be missing or zero here: the repository leaves such partners out and flags them (FR1.4). */
export function validatePartner(p) {
  if (!isObject(p)) fail('partner must be an object');
  rejectPersonalFields(p, `partner ${p.id ?? '?'}`);
  requireString(p, 'id', 'partner');
  requireString(p, 'name', `partner ${p.id}`);
  if (p.households !== undefined && p.households !== null) {
    if (!Number.isInteger(p.households) || p.households < 0) fail(`partner ${p.id}: households must be a whole number of 0 or more`);
  }
  if (!isObject(p.storage)) fail(`partner ${p.id}: storage must be an object`);
  requireNonNegative(p.storage.refrigeratorKg, `partner ${p.id}: storage.refrigeratorKg`);
  requireNonNegative(p.storage.freezerKg, `partner ${p.id}: storage.freezerKg`);
  if (!Number.isInteger(p.pickupDay) || p.pickupDay < 1 || p.pickupDay > 5) fail(`partner ${p.id}: pickupDay must be 1 (Monday) to 5 (Friday)`);
  return p;
}

export function validateInventoryRecord(r) {
  if (!isObject(r)) fail('inventory record must be an object');
  rejectPersonalFields(r, `inventory record ${r.id ?? '?'}`);
  requireString(r, 'id', 'inventory record');
  requireString(r, 'item', `inventory record ${r.id}`);
  requireString(r, 'unit', `inventory record ${r.id}`);
  if (!CATEGORIES.includes(r.category)) fail(`inventory record ${r.id}: category must be one of ${CATEGORIES.join(', ')}`);
  requireNonNegative(r.quantity, `inventory record ${r.id}: quantity`);
  if (r.expiry !== undefined && r.expiry !== null && !isIsoDate(r.expiry)) fail(`inventory record ${r.id}: expiry must be a YYYY-MM-DD date`);
  return r;
}

export function validateRequest(r) {
  if (!isObject(r)) fail('request must be an object');
  requireString(r, 'partnerId', 'request');
  requireString(r, 'item', 'request');
  requireNonNegative(r.kg, `request for ${r.partnerId}: kg`);
  if (r.note !== undefined && typeof r.note !== 'string') fail(`request for ${r.partnerId}: note must be text`);
  return r;
}

export function validatePickup(p) {
  if (!isObject(p)) fail('pickup record must be an object');
  requireString(p, 'partnerId', 'pickup record');
  if (!isIsoDate(p.weekStart)) fail(`pickup record for ${p.partnerId}: weekStart must be a YYYY-MM-DD date`);
  if (typeof p.collected !== 'boolean') fail(`pickup record for ${p.partnerId}: collected must be true or false`);
  return p;
}

export function validateTargets(t) {
  if (!isObject(t)) fail('nutrition targets must be an object');
  let sum = 0;
  for (const c of CATEGORIES) {
    if (typeof t[c] !== 'number' || t[c] < 0 || t[c] > 100) fail(`nutrition target for ${c} must be a percent from 0 to 100`);
    sum += t[c];
  }
  if (Math.abs(sum - 100) > 1e-6) fail('nutrition targets must add up to 100 percent');
  return t;
}

export function validateHistoryWeek(w) {
  if (!isObject(w)) fail('history week must be an object');
  if (!isIsoDate(w.weekStart)) fail('history week: weekStart must be a YYYY-MM-DD date');
  requireNonNegative(w.receivedKg, `history ${w.weekStart}: receivedKg`);
  requireNonNegative(w.spoiledKg, `history ${w.weekStart}: spoiledKg`);
  if (!Array.isArray(w.partnerAllocations)) fail(`history ${w.weekStart}: partnerAllocations must be a list`);
  for (const a of w.partnerAllocations) {
    requireString(a, 'partnerId', `history ${w.weekStart} allocation`);
    requireNonNegative(a.allocatedKg, `history ${w.weekStart} ${a.partnerId}: allocatedKg`);
    requireNonNegative(a.fairShareKg, `history ${w.weekStart} ${a.partnerId}: fairShareKg`);
  }
  return w;
}

function requireArray(d, key) {
  if (!Array.isArray(d[key])) fail(`dataset: "${key}" must be a list`);
}

export function validateDataset(d) {
  if (!isObject(d)) fail('dataset must be an object');
  if (!isIsoDate(d.planDate)) fail('dataset: planDate must be a YYYY-MM-DD date');
  for (const key of ['partners', 'inventory', 'requests', 'pickups', 'history']) requireArray(d, key);
  d.partners.forEach(validatePartner);
  d.inventory.forEach(validateInventoryRecord);
  d.requests.forEach(validateRequest);
  d.pickups.forEach(validatePickup);
  d.history.forEach(validateHistoryWeek);
  validateTargets(d.targets);
  if (d.conversions !== undefined && !isObject(d.conversions)) fail('dataset: conversions must be an object');
  const partnerIds = new Set();
  for (const p of d.partners) {
    if (partnerIds.has(p.id)) fail(`dataset: duplicate partner id ${p.id}`);
    partnerIds.add(p.id);
  }
  const recordIds = new Set();
  for (const r of d.inventory) {
    if (recordIds.has(r.id)) fail(`dataset: duplicate inventory record id ${r.id}`);
    recordIds.add(r.id);
  }
  return d;
}
