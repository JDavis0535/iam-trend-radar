import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from '../scripts/validate-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => JSON.parse(readFileSync(resolve(root, 'data', f), 'utf8'));
const load = () => ({ meta: rd('meta.json'), taxonomy: rd('taxonomy.json'), trends: rd('trends.json'), recommendations: rd('recommendations.json') });

test('real dataset validates with zero errors', () => {
  const { errors } = validateDataset(load());
  assert.deepEqual(errors, []);
});

test('dataset size: 10+ trends, ~20 recs', () => {
  const d = load();
  assert.ok(d.trends.length >= 10);
  assert.ok(d.recommendations.length >= 18);
});

test('every trend has >=1 source and >=1 rec; every rec trend resolves', () => {
  const d = load();
  const ids = new Set(d.trends.map((t) => t.id));
  for (const t of d.trends) {
    assert.ok(t.sources.length >= 1, t.id);
    assert.ok(d.recommendations.some((r) => r.trendIds.includes(t.id)), t.id);
  }
  for (const r of d.recommendations) for (const id of r.trendIds) assert.ok(ids.has(id), r.id);
});

test('all source URLs are https and parseable', () => {
  for (const t of load().trends) for (const s of t.sources) {
    assert.ok(s.url.startsWith('https://'), s.url);
    assert.doesNotThrow(() => new URL(s.url));
  }
});

test('data/data.js mirrors the JSON files', () => {
  const src = readFileSync(resolve(root, 'data/data.js'), 'utf8');
  const win = {};
  new Function('window', src)(win);
  assert.deepEqual(win.IAM_DATA, load());
});

test('statistic-like tokens or multi-digit numbers in prose only allowed with needsVerification', () => {
  for (const t of load().trends) for (const f of ['summary', 'whyItMatters']) {
    if (/%|\$|\bbillion\b|\bmillion\b/i.test(t[f])) assert.equal(t.needsVerification, true, `${t.id}.${f}`);
  }
});

const neg = (name, mutate, pattern) => test(`negative: ${name}`, () => {
  const d = structuredClone(load());
  mutate(d);
  const { errors } = validateDataset(d);
  assert.ok(errors.some((e) => pattern.test(e)), `expected ${pattern}, got ${JSON.stringify(errors)}`);
});
neg('bad enum', (d) => { d.trends[0].maturity = 'bogus'; }, /invalid maturity/);
neg('dangling rec ref', (d) => { d.recommendations[0].trendIds = ['nope']; }, /unknown trend/);
neg('duplicate trend id', (d) => { d.trends[1].id = d.trends[0].id; }, /duplicate id/);
neg('http url', (d) => { d.trends[0].sources[0].url = 'http://x.example'; }, /https/);
neg('missing sources', (d) => { d.trends[0].sources = []; }, /at least 1 source/);
neg('needsVerification without notes', (d) => { d.trends[0].needsVerification = true; d.trends[0].verificationNotes = ''; }, /verificationNotes is empty/);
neg('bad date', (d) => { d.trends[0].lastUpdated = '2026-13-45'; }, /lastUpdated/);
neg('summary too long', (d) => { d.trends[0].summary = 'x'.repeat(281); }, /exceeds 280/);
neg('unsourced stat', (d) => { d.trends[0].needsVerification = false; d.trends[0].verificationNotes = ''; d.trends[0].summary = '90% of firms adopt it'; }, /statistic/);
neg('trend without rec', (d) => { d.recommendations = d.recommendations.filter((r) => !r.trendIds.includes(d.trends[0].id)); }, /no linked recommendation/);
neg('dangling related trend', (d) => { d.trends[0].relatedTrends = ['ghost']; }, /unknown trend/);
