import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createRepository } from '../src/repository.js';
import { makeData, partner, record } from './helpers.js';

async function withServer(data, fn) {
  const server = createServer(createRepository(data));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, raw) => {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null), res };
  };
  try {
    await fn(call);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const small = () => makeData({
  partners: [partner('A', 100, { storage: { refrigeratorKg: 0 } }), partner('B', 100)],
  inventory: [record('R1', 'milk', 'dairy', 200, '2026-12-01'), record('R2', 'rice', 'dry', 200, '2027-06-01')],
});

test('GET /api/plan returns the plan for 60 sample partners', async () => {
  await withServer(undefined, async (call) => {
    const { status, body } = await call('GET', '/api/plan');
    assert.equal(status, 200);
    assert.equal(body.partners.length, 60);
  });
});

test('FR5.1: adjusting updates totals and shows a storage warning', async () => {
  await withServer(small(), async (call) => {
    const before = (await call('GET', '/api/plan')).body;
    const { status, body } = await call('POST', '/api/adjust', { partnerId: 'A', item: 'milk', kg: 30 });
    assert.equal(status, 200);
    const milk = (p) => p.items.find((i) => i.item === 'milk');
    assert.equal(milk(body).allocatedKg - milk(before).allocatedKg, 30);
    assert.ok(Math.abs(milk(body).unallocatedKg - (milk(before).unallocatedKg - 30)) < 1e-9);
    const line = body.partners.find((p) => p.id === 'A').lines.find((l) => l.item === 'milk');
    assert.equal(line.kg, 30);
    assert.equal(line.suggestedKg, 0);
    assert.ok(line.warnings.some((w) => w.type === 'storage'), 'storage warning shows');
  });
});

test('FR5.2: a coordinator adjustment is kept and never overwritten by a later plan', async () => {
  await withServer(small(), async (call) => {
    await call('POST', '/api/adjust', { partnerId: 'B', item: 'rice', kg: 12 });
    const settings = await call('POST', '/api/settings', { type: 'expiry', recordId: 'R2', date: '2027-07-01' });
    assert.equal(settings.status, 200);
    const again = (await call('GET', '/api/plan')).body;
    const line = again.partners.find((p) => p.id === 'B').lines.find((l) => l.item === 'rice');
    assert.equal(line.adjustedKg, 12);
    assert.equal(line.kg, 12);
    const cleared = (await call('POST', '/api/adjust', { partnerId: 'B', item: 'rice', kg: null })).body;
    assert.equal(cleared.partners.find((p) => p.id === 'B').lines.find((l) => l.item === 'rice').adjustedKg, null);
  });
});

test('NFR3: an adjustment responds in under 2 seconds with 60 partners', async () => {
  await withServer(undefined, async (call) => {
    const start = performance.now();
    const { status, body } = await call('POST', '/api/adjust', { partnerId: 'P01', item: 'rice', kg: 5 });
    const elapsed = performance.now() - start;
    assert.equal(status, 200);
    assert.equal(body.partners.length, 60);
    assert.ok(elapsed < 2000, `took ${elapsed} ms`);
  });
});

test('bad input returns a clear error and changes nothing', async () => {
  await withServer(small(), async (call) => {
    const negative = await call('POST', '/api/adjust', { partnerId: 'A', item: 'rice', kg: -5 });
    assert.equal(negative.status, 400);
    assert.match(negative.body.error, /kg must be/);
    assert.equal((await call('POST', '/api/adjust', { partnerId: 'Z', item: 'rice', kg: 5 })).status, 400);
    assert.equal((await call('POST', '/api/adjust', { partnerId: 'A', item: 'rice', kg: '5' })).status, 400);
    assert.equal((await call('POST', '/api/adjust', '{not json', true)).status, 400);
    assert.equal((await call('POST', '/api/settings', { type: 'conversion', item: 'rice', unit: 'case', factor: 0 })).status, 400);
    assert.equal((await call('POST', '/api/settings', { type: 'other' })).status, 400);
    assert.equal((await call('GET', '/api/adjust')).status, 405);
    assert.equal((await call('GET', '/api/nothing')).status, 404);
    assert.equal((await call('GET', '/%2e%2e/package.json')).status, 404);
    const plan = (await call('GET', '/api/plan')).body;
    assert.deepEqual(plan.adjustments, {});
  });
});
