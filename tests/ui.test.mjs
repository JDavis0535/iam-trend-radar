import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, safeUrl, badge, trendCard, recCard, watchButton, options } from '../js/ui.js';

const HOSTILE = '<img src=x onerror=alert(1)> "q" \'a\' `b` &amp;';

test('esc neutralises hostile strings', () => {
  const e = esc(HOSTILE);
  assert.ok(!/[<>"'`]/.test(e));
  assert.ok(e.includes('&amp;amp;'));
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(0), '0');
});
test('safeUrl allows only https', () => {
  assert.equal(safeUrl('https://a.example/x'), 'https://a.example/x');
  for (const u of ['http://a', 'javascript:alert(1)', 'data:text/html,x', '//a', '', null, 'https://']) assert.equal(safeUrl(u), '', String(u));
});
const tx = { maturity: [{ id: 'growing', label: 'Growing' }], impact: [{ id: 'high', label: 'High' }], momentum: [{ id: 'rising', label: 'Rising' }], categories: [{ id: 'c', label: 'Cat' }] };
test('badge has text, not colour only; hostile id escaped', () => {
  assert.match(badge('maturity', 'growing', tx), /Maturity: <\/span>Growing/);
  assert.ok(!badge('maturity', HOSTILE, tx).includes('<img'));
});
test('trendCard escapes every data field (AC10)', () => {
  const t = { id: 'a"><script>', title: HOSTILE, categories: ['c'], maturity: 'growing', impact: 'high', momentum: 'rising', summary: HOSTILE, lastUpdated: '2026-01-01"><x', needsVerification: true };
  const html = trendCard(t, { taxonomy: tx, isWatched: () => false, isStale: () => true });
  assert.ok(!/<img|<script|<x/.test(html), html);
});
test('recCard escapes fields', () => {
  const r = { id: 'r', title: HOSTILE, description: HOSTILE, trendIds: ['t', 'gone'], horizon: 'now', effort: 'low', impact: 'high', steps: [HOSTILE], successMetrics: [HOSTILE], dependencies: [HOSTILE], audience: [HOSTILE], lastUpdated: '2026-01-01' };
  const html = recCard(r, { taxonomy: { horizon: [], effort: [], impact: [] }, trendById: (id) => (id === 't' ? { title: HOSTILE } : null), recById: () => null, score: () => 1, isStale: () => false });
  assert.ok(!/<img/.test(html), html);
});
test('watchButton aria-pressed reflects state', () => {
  assert.match(watchButton('a', true, 'T'), /aria-pressed="true"/);
  assert.match(watchButton('a', false, 'T'), /aria-pressed="false"/);
});
test('options escapes and marks selected', () => {
  const o = options([{ id: 'a"', label: '<b>' }], 'a"', 'All');
  assert.ok(!o.includes('<b>'));
  assert.match(o, /selected/);
});
