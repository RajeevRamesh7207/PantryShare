import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRepository } from '../src/repository.js';
import { buildPlan } from '../src/allocate.js';
import {
  escapeHtml, formatKg, computeTotals, renderTotals, renderPartners, renderPartner, renderExclusions, renderMeasures, renderItems, filterPartners,
  renderPlanFlags, renderFlagBadge, TIPS, tipText, tipIcon,
} from '../public/view-model.js';
import { makeData, partner, record } from './helpers.js';

const samplePlan = () => buildPlan(createRepository().snapshot());

test('FR3 and FR5: flags and totals are shown correctly', () => {
  const plan = samplePlan();
  const totals = computeTotals(plan);
  assert.equal(totals.flagsByType['missed-pickup'], 3);
  assert.equal(formatKg(1234.56), '1,234.6 kg');
  const html = renderTotals(plan);
  assert.match(html, /data-testid="total-stock">10,120\.4 kg/);
  assert.match(html, new RegExp(`${totals.partnersFlagged} of 60`));
  const flagged = plan.partners.find((p) => p.missedLastPickup);
  assert.match(renderPartner(flagged, false), /data-flag="missed-pickup"/);
  assert.match(renderMeasures(plan.measures), /Meets target/);
});

test('FR3.2: an adjustment outside the band shows a fairness flag and the final quantity', () => {
  const repo = createRepository(makeData({ partners: [partner('A', 100), partner('B', 100)], inventory: [record('R1', 'rice', 'dry', 200, '2027-06-01')] }));
  repo.setAdjustment('A', 'rice', 130);
  const plan = buildPlan(repo.snapshot());
  const html = renderPartner(plan.partners[0], true);
  assert.match(html, /data-flag="fairness"/);
  assert.match(html, /value="130"/);
  assert.match(html, /\+30\.0%/);
});

test('every interactive element carries a data-testid', () => {
  const plan = samplePlan();
  const expanded = new Set(plan.partners.slice(0, 3).map((p) => p.id));
  const html = [renderPartners(plan, { expanded }), renderExclusions(plan), renderMeasures(plan.measures), renderItems(plan)].join('\n');
  const interactive = html.match(/<(button|input|select|summary|textarea|a)\b[^>]*>/g) ?? [];
  assert.ok(interactive.length > 20, `found ${interactive.length} interactive elements`);
  for (const tag of interactive) assert.match(tag, /data-testid="[^"]+"/, tag);
});

test('data from the plan is escaped, and the partner filter works', () => {
  assert.equal(escapeHtml('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  const repo = createRepository(makeData({
    partners: [partner('A', 100, { name: '<script>alert(1)</script>' }), partner('B', 100)],
    inventory: [record('R1', 'rice', 'dry', 200, '2027-06-01')],
  }));
  const plan = buildPlan(repo.snapshot());
  const html = renderPartners(plan, { expanded: new Set(['A']) });
  assert.ok(!html.includes('<script>'));
  assert.deepEqual(filterPartners(plan, { text: 'pantry b' }).map((p) => p.id), ['B']);
  assert.match(renderPartners(plan, { text: 'nothing matches' }), /No partners match/);
});

// ---- Tooltips and the rebuilt screen ----

function fullScreenHtml() {
  const base = samplePlan();
  const repo = createRepository();
  repo.setAdjustment('P01', 'yogurt', 3000); // over the partner's refrigeration
  repo.setAdjustment('P01', 'apples', 9999); // over the stock on hand
  const adjusted = buildPlan(repo.snapshot());
  const expanded = new Set(['P01', 'P07']); // P07 has a request it cannot be given in full
  const pages = [base, adjusted].map((plan) => [
    renderTotals(plan), renderMeasures(plan.measures), renderPlanFlags(plan), renderExclusions(plan), renderItems(plan), renderPartners(plan, { expanded }),
  ].join('\n'));
  const index = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const slots = [...index.matchAll(/data-tip-slot="(\w+)" data-tip-label="([^"]+)"/g)].map((m) => tipIcon(m[1], m[2]));
  return { html: [...pages, ...slots].join('\n'), adjusted, index };
}

test('all 29 tooltips exist and every one is shown somewhere on the screen', () => {
  assert.equal(Object.keys(TIPS).length, 29);
  const { html } = fullScreenHtml();
  const shown = new Set([...html.matchAll(/data-testid="tip-(\w+)"/g)].map((m) => m[1]));
  const missing = Object.keys(TIPS).filter((k) => !shown.has(k));
  assert.deepEqual(missing, [], `tips not shown: ${missing.join(', ')}`);
});

test('every tooltip trigger carries its text, escaped, and a name for screen readers', () => {
  const { html } = fullScreenHtml();
  const triggers = html.match(/<(button|span)\b[^>]*data-tip-text="[^"]*"[^>]*>/g) ?? [];
  assert.ok(triggers.length > 50, `found ${triggers.length} triggers`);
  for (const tag of triggers) assert.match(tag, /data-testid="tip-\w+"/, tag);
  for (const tag of triggers.filter((x) => x.startsWith('<button'))) assert.match(tag, /aria-label="About [^"]+: [^"]+"/, tag);
  for (const tag of triggers.filter((x) => x.startsWith('<span'))) assert.match(tag, /tabindex="0"/, tag);
  assert.equal(tipIcon('leftOut', 'x').includes("can't"), false, 'apostrophes are escaped in attributes');
  assert.throws(() => tipText('nope'), /unknown tooltip/);
});

test('flags name the category and the nutrition tip says which one', () => {
  const plan = samplePlan();
  const flag = plan.flags.find((f) => f.type === 'nutrition');
  const html = renderFlagBadge(flag);
  assert.match(html, new RegExp(`Nutrition: ${flag.category}`));
  const cap = flag.category[0].toUpperCase() + flag.category.slice(1);
  assert.match(html, new RegExp(`data-tip-text="${cap} is more than 10 points below its target share`));
});

test('over stock shows on the edited line and in the totals, not as a negative number', () => {
  const { adjusted } = fullScreenHtml();
  assert.ok(adjusted.totals.unallocatedKg < 0);
  const totals = renderTotals(adjusted);
  assert.match(totals, /Over stock by/);
  assert.match(totals, /data-testid="total-unallocated">[\d,.]+ kg/);
  assert.ok(!/-[\d,.]+ kg/.test(totals), 'no negative kilograms in the totals');
  const p01 = renderPartner(adjusted.partners.find((p) => p.id === 'P01'), true);
  assert.match(p01, /apples is [\d,.]+ kg above the stock on hand/);
  assert.match(p01, /data-flag="over-allocated"/);
  assert.match(renderTotals(samplePlan()), /Unallocated/);
});

test('measures say they are measured on synthetic history', () => {
  assert.match(renderMeasures(samplePlan().measures), /on synthetic history/);
});

test('partner rows carry labels so the phone layout can show them as cards', () => {
  const html = renderPartners(samplePlan());
  assert.match(html, /<table class="partners">/);
  for (const label of ['Pickup', 'Households', 'Allocated', 'Fair share', 'Vs fair', 'Flags']) assert.match(html, new RegExp(`data-label="${label}"`));
});
