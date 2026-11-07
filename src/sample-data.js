// Built-in synthetic data (FR1.1). A fixed seed makes the data, and so the plan, identical every run (NFR4).
// No real people or organisations: partner names are made-up combinations.

import { addDays } from './model.js';

export const PLAN_DATE = '2026-11-09'; // a Monday (D6)
export const DEFAULT_SEED = 20261109;
const HISTORY_WEEKS = 13;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREFIXES = ['Maple Street', 'Riverside', 'Hope', 'Oakdale', 'Northside', 'Grace', 'Eastgate', 'Harvest', 'Unity', 'Cedar', 'Lakeview', 'Sunrise'];
const SUFFIXES = ['Pantry', 'Food Shelf', 'Community Kitchen', 'Neighbors Network', 'Outreach'];
const NOTES = ['Hosting a community meal on Saturday', 'Need more shelf-stable items', 'Serving more families this month', 'Volunteers can collect extra'];
const REQUEST_ITEMS = ['yogurt', 'apples', 'rice', 'chicken', 'milk'];

// Inventory in several units. Conversion factors for most are preset; two lines are left
// incomplete on purpose (no factor for canned beans, no expiry for granola bars) so the
// coordinator sees how they are flagged and left out until fixed.
function inventory() {
  return [
    { id: 'R01', item: 'yogurt', category: 'dairy', unit: 'kg', quantity: 600, expiry: '2026-11-11' },
    { id: 'R02', item: 'yogurt', category: 'dairy', unit: 'case', quantity: 150, expiry: '2026-11-23' },
    { id: 'R03', item: 'milk', category: 'dairy', unit: 'kg', quantity: 900, expiry: '2026-11-20' },
    { id: 'R04', item: 'cheese', category: 'dairy', unit: 'lb', quantity: 1500, expiry: '2026-12-05' },
    { id: 'R05', item: 'chicken', category: 'meat', unit: 'kg', quantity: 800, expiry: '2026-12-10' },
    { id: 'R06', item: 'ground beef', category: 'meat', unit: 'kg', quantity: 500, expiry: '2026-11-30' },
    { id: 'R07', item: 'apples', category: 'produce', unit: 'crate', quantity: 80, expiry: '2026-11-25' },
    { id: 'R08', item: 'carrots', category: 'produce', unit: 'kg', quantity: 700, expiry: '2026-11-28' },
    { id: 'R09', item: 'spinach', category: 'produce', unit: 'kg', quantity: 300, expiry: '2026-11-13' },
    { id: 'R10', item: 'rice', category: 'dry', unit: 'kg', quantity: 1200, expiry: '2027-06-01' },
    { id: 'R11', item: 'pasta', category: 'dry', unit: 'kg', quantity: 800, expiry: '2027-04-01' },
    { id: 'R12', item: 'oats', category: 'dry', unit: 'kg', quantity: 700, expiry: '2027-03-01' },
    { id: 'R13', item: 'canned beans', category: 'dry', unit: 'case', quantity: 60, expiry: '2027-09-01' },
    { id: 'R14', item: 'granola bars', category: 'dry', unit: 'kg', quantity: 200, expiry: null },
  ];
}

export function buildSampleData(seed = DEFAULT_SEED) {
  const rand = mulberry32(seed);
  const partners = [];
  for (let i = 0; i < 60; i++) {
    partners.push({
      id: `P${String(i + 1).padStart(2, '0')}`,
      name: `${PREFIXES[i % PREFIXES.length]} ${SUFFIXES[Math.floor(i / PREFIXES.length)]}`,
      households: 40 + Math.floor(rand() * 360),
      storage: {
        refrigeratorKg: rand() < 0.88 ? 150 + Math.floor(rand() * 450) : 0,
        freezerKg: rand() < 0.82 ? 100 + Math.floor(rand() * 300) : 0,
      },
      pickupDay: 1 + Math.floor(rand() * 5),
    });
  }
  const totalHouseholds = partners.reduce((s, p) => s + p.households, 0);

  const weekStarts = Array.from({ length: HISTORY_WEEKS }, (_, w) => addDays(PLAN_DATE, -7 * (HISTORY_WEEKS - w)));
  const lastWeek = weekStarts[weekStarts.length - 1];
  const forcedMiss = new Set(['P05', 'P18', 'P42']);

  const history = weekStarts.map((weekStart) => {
    const receivedKg = Math.round(9000 + rand() * 2000);
    const spoiledKg = Math.round(receivedKg * (0.11 + rand() * 0.04));
    const partnerAllocations = partners.map((p) => {
      const fairShareKg = Math.round(((p.households / totalHouseholds) * receivedKg) * 10) / 10;
      const allocatedKg = Math.round(fairShareKg * (1 + (rand() - 0.5) * 0.7) * 10) / 10;
      return { partnerId: p.id, allocatedKg, fairShareKg };
    });
    return { weekStart, receivedKg, spoiledKg, partnerAllocations };
  });

  const pickups = [];
  for (const weekStart of weekStarts) {
    for (const p of partners) {
      const collected = weekStart === lastWeek ? !forcedMiss.has(p.id) : rand() < 0.93;
      pickups.push({ partnerId: p.id, weekStart, collected });
    }
  }

  const requests = [];
  partners.forEach((p, i) => {
    if (i % 3 !== 0) return;
    requests.push({
      partnerId: p.id,
      item: REQUEST_ITEMS[i % REQUEST_ITEMS.length],
      kg: 20 + Math.floor(rand() * 380),
      note: NOTES[i % NOTES.length],
    });
  });
  requests.push({ partnerId: 'P07', item: 'rice', kg: 5000, note: 'Opening a second site next week' });

  return {
    planDate: PLAN_DATE,
    partners,
    inventory: inventory(),
    requests,
    pickups,
    history,
    targets: { produce: 25, dairy: 30, meat: 15, dry: 30 },
    conversions: {
      yogurt: { case: 10 },
      cheese: { lb: 0.45359237 },
      apples: { crate: 18 },
    },
  };
}
