import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => JSON.parse(readFileSync(resolve(root, 'data', f), 'utf8'));
const DATA = { meta: rd('meta.json'), taxonomy: rd('taxonomy.json'), trends: rd('trends.json'), recommendations: rd('recommendations.json') };

function mkStorage(initial = {}, throwing = false) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => { if (throwing) throw new Error('denied'); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (throwing) throw new Error('quota'); m.set(k, String(v)); }
  };
}
const S = await import('../js/store.js');
const R = await import('../js/router.js');

async function fresh(storage) {
  globalThis.localStorage = storage;
  globalThis.IAM_DATA = structuredClone(DATA);
  S.state.storageOk = true;
  await S.loadData();
}

test('toggle persists and reloads', async () => {
  const st = mkStorage();
  await fresh(st);
  assert.equal(S.toggleWatch('itdr'), true);
  assert.equal(S.isWatched('itdr'), true);
  assert.deepEqual(JSON.parse(st.getItem(S.WATCH_KEY)), ['itdr']);
  await fresh(st);
  assert.equal(S.isWatched('itdr'), true);
  assert.equal(S.toggleWatch('itdr'), false);
  assert.deepEqual(JSON.parse(st.getItem(S.WATCH_KEY)), []);
});
test('unknown id cannot be watched; stale ids dropped; corrupt JSON ignored', async () => {
  await fresh(mkStorage());
  assert.equal(S.toggleWatch('ghost'), false);
  await fresh(mkStorage({ [S.WATCH_KEY]: JSON.stringify(['itdr', 'ghost', 5]) }));
  assert.deepEqual([...S.state.watch], ['itdr']);
  await fresh(mkStorage({ [S.WATCH_KEY]: '{not json' }));
  assert.equal(S.state.watch.size, 0);
  await fresh(mkStorage({ [S.WATCH_KEY]: '{"a":1}' }));
  assert.equal(S.state.watch.size, 0);
});
test('works when localStorage throws (AC6)', async () => {
  await fresh(mkStorage({}, true));
  assert.equal(S.state.storageOk, false);
  assert.doesNotThrow(() => S.toggleWatch('itdr'));
  assert.equal(S.isWatched('itdr'), true);
  assert.doesNotThrow(() => S.clearWatchlist());
  assert.doesNotThrow(() => S.saveFilters());
});
test('works when localStorage is undefined', async () => {
  await fresh(undefined);
  assert.doesNotThrow(() => S.toggleWatch('itdr'));
  assert.equal(S.isWatched('itdr'), true);
});
test('clearWatchlist empties and persists', async () => {
  const st = mkStorage();
  await fresh(st);
  S.toggleWatch('itdr');
  S.toggleWatch('zero-trust-identity');
  S.clearWatchlist();
  assert.equal(S.state.watch.size, 0);
  assert.deepEqual(JSON.parse(st.getItem(S.WATCH_KEY)), []);
});
test('stored filters validated against taxonomy', async () => {
  await fresh(mkStorage({ [S.FILTER_KEY]: JSON.stringify({ category: 'bogus', maturity: 'growing', text: 'x'.repeat(500), sort: 'nope', watchOnly: 'yes' }) }));
  const f = S.state.filters;
  assert.equal(f.category, '');
  assert.equal(f.maturity, 'growing');
  assert.equal(f.text.length, 200);
  assert.equal(f.sort, 'impact');
  assert.equal(f.watchOnly, false);
});
test('filters persist and reset', async () => {
  const st = mkStorage();
  await fresh(st);
  S.state.filters = { ...S.state.filters, impact: 'high' };
  S.saveFilters();
  await fresh(st);
  assert.equal(S.state.filters.impact, 'high');
  S.resetFilters();
  assert.equal(S.state.filters.impact, '');
});
test('loadData rejects malformed data', async () => {
  globalThis.localStorage = mkStorage();
  globalThis.IAM_DATA = { trends: [] };
  await assert.rejects(S.loadData(), /incomplete or malformed/);
});
test('loadData falls back to fetch, and fails clearly', async () => {
  globalThis.localStorage = mkStorage();
  delete globalThis.IAM_DATA;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => ({ ok: true, json: async () => DATA[u.match(/data\/(\w+)\.json/)[1]] });
  await S.loadData();
  assert.equal(S.state.trends.length, DATA.trends.length);
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(S.loadData(), /could not be loaded/);
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(S.loadData(), /could not be loaded/);
  globalThis.fetch = realFetch;
});

test('parseRoute: known routes', () => {
  assert.deepEqual(R.parseRoute(''), { name: 'dashboard' });
  assert.deepEqual(R.parseRoute('#'), { name: 'dashboard' });
  assert.deepEqual(R.parseRoute('#/'), { name: 'dashboard' });
  assert.deepEqual(R.parseRoute('#/playbook'), { name: 'playbook' });
  assert.deepEqual(R.parseRoute('#/watchlist/'), { name: 'watchlist' });
  assert.deepEqual(R.parseRoute('#/about'), { name: 'about' });
  assert.deepEqual(R.parseRoute('#/trend/itdr'), { name: 'trend', id: 'itdr' });
  assert.deepEqual(R.parseRoute(undefined), { name: 'dashboard' });
});
test('parseRoute: unknown gives notfound (404)', () => {
  for (const h of ['#/nope', '#/trend', '#/trend/', '#/trend/a/b', '#/playbook/x', '#/trend/%E0%A4%A', '#about']) assert.equal(R.parseRoute(h).name, 'notfound', h);
});
test('every trend id routes to a trend; unknown id is not in data', async () => {
  await fresh(mkStorage());
  for (const t of DATA.trends) {
    const r = R.parseRoute('#/trend/' + t.id);
    assert.equal(r.id, t.id);
    assert.ok(S.state.trendMap.has(r.id));
  }
  assert.ok(!S.state.trendMap.has(R.parseRoute('#/trend/ghost').id));
});
