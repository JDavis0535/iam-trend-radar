import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from '../js/filters.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trends = JSON.parse(readFileSync(resolve(root, 'data/trends.json'), 'utf8'));
const recs = JSON.parse(readFileSync(resolve(root, 'data/recommendations.json'), 'utf8'));
const ids = (a) => a.map((x) => x.id);
const cmp = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

test('no filters returns all', () => assert.equal(F.filterTrends(trends, {}, new Set()).length, trends.length));
test('category filter', () => {
  const r = F.filterTrends(trends, { category: 'authentication' }, []);
  assert.ok(r.length >= 1 && r.every((t) => t.categories.includes('authentication')));
});
test('maturity / impact / momentum filters', () => {
  assert.ok(F.filterTrends(trends, { maturity: 'emerging' }, []).every((t) => t.maturity === 'emerging'));
  assert.ok(F.filterTrends(trends, { impact: 'high' }, []).every((t) => t.impact === 'high'));
  assert.ok(F.filterTrends(trends, { momentum: 'rising' }, []).every((t) => t.momentum === 'rising'));
});
test('filters combine with AND', () => {
  const r = F.filterTrends(trends, { maturity: 'growing', impact: 'high', momentum: 'rising' }, []);
  assert.ok(r.length >= 1);
  assert.ok(r.every((t) => t.maturity === 'growing' && t.impact === 'high' && t.momentum === 'rising'));
  assert.equal(F.filterTrends(trends, { maturity: 'emerging', impact: 'low' }, []).length, 0);
});
test('text search is case-insensitive, multi-word AND', () => {
  assert.ok(ids(F.filterTrends(trends, { text: 'PASSKEYS' }, [])).includes('passkeys-passwordless'));
  assert.equal(F.filterTrends(trends, { text: 'passkeys zzzznotaword' }, []).length, 0);
  assert.equal(F.filterTrends(trends, { text: '   ' }, []).length, trends.length);
});
test('watchOnly uses set or array', () => {
  assert.deepEqual(ids(F.filterTrends(trends, { watchOnly: true }, new Set(['itdr']))), ['itdr']);
  assert.deepEqual(ids(F.filterTrends(trends, { watchOnly: true }, ['itdr'])), ['itdr']);
  assert.equal(F.filterTrends(trends, { watchOnly: true }, new Set()).length, 0);
});
test('watchOnly combined with category', () => {
  assert.equal(F.filterTrends(trends, { watchOnly: true, category: 'regulation' }, ['itdr']).length, 0);
});
test('sortTrends: impact desc, title tiebreak, does not mutate', () => {
  const copy = ids(trends);
  const s = F.sortTrends(trends, 'impact');
  assert.deepEqual(ids(trends), copy);
  for (let i = 1; i < s.length; i++) {
    const a = F.IMPACT_RANK[s[i - 1].impact], b = F.IMPACT_RANK[s[i].impact];
    assert.ok(a >= b);
    if (a === b) assert.ok(cmp(s[i - 1].title, s[i].title) <= 0);
  }
});
test('sortTrends: maturity, updated, title', () => {
  const m = F.sortTrends(trends, 'maturity');
  for (let i = 1; i < m.length; i++) assert.ok(F.MATURITY_RANK[m[i - 1].maturity] >= F.MATURITY_RANK[m[i].maturity]);
  const u = F.sortTrends(trends, 'updated');
  for (let i = 1; i < u.length; i++) assert.ok(u[i - 1].lastUpdated >= u[i].lastUpdated);
  const t = F.sortTrends(trends, 'title');
  for (let i = 1; i < t.length; i++) assert.ok(cmp(t[i - 1].title, t[i].title) <= 0);
});
test('priorityScore formula exhaustive', () => {
  const I = { low: 1, medium: 2, high: 3, transformative: 4 }, E = { low: 1, medium: 2, high: 3 };
  for (const i of Object.keys(I)) for (const e of Object.keys(E)) assert.equal(F.priorityScore({ impact: i, effort: e }), I[i] * 2 - E[e]);
  assert.equal(F.priorityScore({ impact: 'transformative', effort: 'low' }), 7);
  assert.equal(F.priorityScore({ impact: 'low', effort: 'high' }), -1);
});
test('quick wins: low effort + high/transformative impact only', () => {
  const q = F.filterRecs(recs, { quickWins: true });
  assert.ok(q.every((r) => r.effort === 'low' && ['high', 'transformative'].includes(r.impact)));
  const expected = recs.filter((r) => r.effort === 'low' && ['high', 'transformative'].includes(r.impact)).length;
  assert.equal(q.length, expected);
  assert.ok(F.isQuickWin({ effort: 'low', impact: 'high' }));
  assert.ok(!F.isQuickWin({ effort: 'medium', impact: 'high' }));
  assert.ok(!F.isQuickWin({ effort: 'low', impact: 'medium' }));
});
test('filterRecs by horizon/effort/impact/trendId combined', () => {
  const r = F.filterRecs(recs, { horizon: 'now', effort: 'low' });
  assert.ok(r.every((x) => x.horizon === 'now' && x.effort === 'low'));
  const t = F.filterRecs(recs, { trendId: 'itdr' });
  assert.ok(t.length >= 1 && t.every((x) => x.trendIds.includes('itdr')));
  assert.equal(F.filterRecs(recs, { trendId: 'nonexistent' }).length, 0);
});
test('sortRecs priority: score desc, horizon, title', () => {
  const s = F.sortRecs(recs, 'priority');
  for (let i = 1; i < s.length; i++) {
    const a = F.priorityScore(s[i - 1]), b = F.priorityScore(s[i]);
    assert.ok(a >= b);
    if (a === b) {
      const ha = F.HORIZON_RANK[s[i - 1].horizon], hb = F.HORIZON_RANK[s[i].horizon];
      assert.ok(ha <= hb);
      if (ha === hb) assert.ok(cmp(s[i - 1].title, s[i].title) <= 0);
    }
  }
});
test('sortRecs title and horizon', () => {
  const t = F.sortRecs(recs, 'title');
  for (let i = 1; i < t.length; i++) assert.ok(cmp(t[i - 1].title, t[i].title) <= 0);
  const h = F.sortRecs(recs, 'horizon');
  for (let i = 1; i < h.length; i++) assert.ok(F.HORIZON_RANK[h[i - 1].horizon] <= F.HORIZON_RANK[h[i].horizon]);
});
test('isStale boundary (180 days)', () => {
  const now = new Date('2026-11-04T00:00:00Z');
  assert.equal(F.isStale('2026-11-04', now), false);
  assert.equal(F.isStale('2026-05-08', now), false);
  assert.equal(F.isStale('2026-05-07', now), true);
  assert.equal(F.isStale('garbage', now), false);
});
