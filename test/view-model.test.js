import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../src/repository.js';
import { buildPlan } from '../src/allocate.js';
import {
  escapeHtml, formatKg, computeTotals, renderTotals, renderPartners, renderPartner, renderExclusions, renderMeasures, renderItems, filterPartners,
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
