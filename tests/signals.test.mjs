// signals.test.mjs - keyword signals (scripts/signals-lib.mjs), store.parseSignals/loadSignals and the UI notes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileKeywords, checkRules, buildSignals } from '../scripts/signals-lib.mjs';
import { parseSignals, loadSignals, state, SIGNALS_MAX_AGE_DAYS } from '../js/store.js';
import { signalNote } from '../js/ui.js';

const NOW = Date.parse('2026-11-05T12:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString();
const item = (id, title, daysAgo, extra = {}) => ({ id, title, summary: '', link: `https://example.org/${id}`, source: 'Src', published: day(daysAgo), ...extra });

test('compileKeywords matches whole words only, case-insensitively', () => {
  const re = compileKeywords(['sso', 'zero trust']);
  assert.ok(re.test('New SSO flaw'));
  assert.ok(re.test('A Zero Trust roadmap'));
  assert.ok(!re.test('association of vendors'));
  assert.equal(compileKeywords([]), null);
  assert.ok(compileKeywords(['a.b']).test('see a.b now') && !compileKeywords(['a.b']).test('axb'), 'regex characters are escaped');
});

test('checkRules reports unknown ids and trends without a rule', () => {
  assert.deepEqual(checkRules({ a: ['x'], zzz: ['y'] }, ['a', 'b']), { unknown: ['zzz'], missing: ['b'] });
});

test('buildSignals counts 30/90 day windows, newest first, and caps the item list', () => {
  const items = [item('1', 'Passkey news', 2), item('2', 'More passkeys', 40), item('3', 'Passkeys again', 100), item('4', 'Unrelated', 1), item('5', 'passkey x', 5), item('6', 'passkey y', 6)];
  const s = buildSignals(items, { p: ['passkey', 'passkeys'], empty: [] }, { now: NOW, maxItems: 3 });
  assert.equal(s.p.count30, 3);
  assert.equal(s.p.count90, 4);
  assert.equal(s.p.lastSignal, day(2));
  assert.deepEqual(s.p.items.map((i) => i.id), ['1', '5', '6']);
  assert.deepEqual(s.empty, { count30: 0, count90: 0, lastSignal: null, items: [] });
});

test('buildSignals ignores items dated in the future and undated items for the windows', () => {
  const s = buildSignals([item('f', 'passkey future', -30), { id: 'u', title: 'passkey undated', link: 'https://example.org/u', source: 'S', published: '' }], { p: ['passkey'] }, { now: NOW });
  assert.equal(s.p.count30, 0);
});

test('every trend has a rule and every rule names a real trend (committed files)', () => {
  const trends = JSON.parse(readFileSync(new URL('../data/trends.json', import.meta.url), 'utf8'));
  const rules = JSON.parse(readFileSync(new URL('../data/signal-rules.json', import.meta.url), 'utf8'));
  assert.deepEqual(checkRules(rules, trends.map((t) => t.id)), { unknown: [], missing: [] });
});

const raw = (over = {}) => ({ generatedAt: day(1), trends: { a: { count30: 2, count90: 3, lastSignal: day(1), items: [{ id: 'x', title: 'T', link: 'https://e.org/x', source: 'S', published: day(1) }, null, { nope: true }] } }, ...over });

test('parseSignals keeps valid entries for known trends and drops junk', () => {
  const m = parseSignals(raw(), ['a', 'b'], NOW);
  assert.equal(m.size, 1);
  assert.equal(m.get('a').items.length, 1);
  assert.equal(m.get('a').count30, 2);
});

test('parseSignals rejects malformed, undated and stale files', () => {
  assert.equal(parseSignals(null, ['a'], NOW), null);
  assert.equal(parseSignals({ generatedAt: day(1) }, ['a'], NOW), null);
  assert.equal(parseSignals(raw({ generatedAt: 'nope' }), ['a'], NOW), null);
  assert.equal(parseSignals(raw({ generatedAt: day(SIGNALS_MAX_AGE_DAYS + 1) }), ['a'], NOW), null);
  assert.equal(parseSignals({ generatedAt: day(1), trends: { a: { count30: 'x', count90: 1, items: [] } } }, ['a'], NOW).size, 0);
});

test('loadSignals never throws, and leaves signals empty when the fetch fails or the file is bad', async () => {
  state.trendMap = new Map([['a', {}]]);
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await loadSignals(50), false);
    assert.equal(state.signals.size, 0);
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    assert.equal(await loadSignals(50), false);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ generatedAt: new Date().toISOString(), trends: { a: { count30: 1, count90: 1, lastSignal: null, items: [] } } }) });
    assert.equal(await loadSignals(50), true);
    assert.equal(state.signals.get('a').count30, 1);
  } finally { globalThis.fetch = realFetch; }
});

test('signalNote pluralises and renders nothing without a signal', () => {
  assert.equal(signalNote(null), '');
  assert.equal(signalNote({ count30: 0 }), '');
  assert.ok(signalNote({ count30: 1 }).includes('1 headline (30 days)'));
  assert.ok(signalNote({ count30: 3 }).includes('3 headlines (30 days)'));
});
