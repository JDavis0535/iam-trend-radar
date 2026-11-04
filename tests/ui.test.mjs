import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, safeUrl, valueMark, ladder, icon, trendRow, trendTable, recRow, recTable, watchButton, options } from '../js/ui.js';

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
const tx = {
  maturity: [{ id: 'emerging', label: 'Emerging' }, { id: 'growing', label: 'Growing' }, { id: 'mainstream', label: 'Mainstream' }, { id: 'established', label: 'Established' }],
  impact: [{ id: 'high', label: 'High' }], momentum: [{ id: 'rising', label: 'Rising' }], categories: [{ id: 'c', label: 'Cat' }]
};
test('valueMark has text, not colour only; hostile id escaped', () => {
  assert.match(valueMark('maturity', 'growing', tx), /Maturity: <\/span>Growing/);
  assert.ok(!valueMark('maturity', HOSTILE, tx).includes('<img'));
  assert.ok(!valueMark('momentum', HOSTILE, tx).includes('<img'));
});
test('ladder fills as many steps as the maturity position, and an unknown id draws an empty ladder', () => {
  const on = (h) => (h.match(/<i class="on">/g) || []).length;
  assert.equal(on(ladder('emerging', tx)), 1);
  assert.equal(on(ladder('growing', tx)), 2);
  assert.equal(on(ladder('established', tx)), 4);
  assert.equal(on(ladder('nope', tx)), 0);
  assert.match(ladder('growing', tx), /data-step="2"/);
  assert.equal((ladder('growing', tx).match(/<i/g) || []).length, 4);
});
test('icon returns an svg for known names and nothing for unknown or hostile names', () => {
  assert.match(icon('rising'), /^<svg class="ico"/);
  assert.equal(icon('nope'), '');
  assert.equal(icon('constructor'), '');
  assert.ok(!icon('rising', '"><img').includes('<img'));
});
test('trendRow escapes every data field (AC10) and shows the unconfirmed flag', () => {
  const t = { id: 'a"><script>', title: HOSTILE, categories: ['c'], maturity: 'growing', impact: 'high', momentum: 'rising', summary: HOSTILE, lastUpdated: '2026-01-01"><x', needsVerification: true, sources: [{}, {}] };
  const html = trendRow(t, { taxonomy: tx, isWatched: () => false, isStale: () => true });
  assert.ok(!/<img|<script|<x/.test(html), html);
  assert.match(html, /<span class="flag">/);
  assert.match(html, /2 sources/);
  assert.match(trendRow({ ...t, needsVerification: false, sources: [{}] }, { taxonomy: tx, isWatched: () => false, isStale: () => false }), /1 source</);
  assert.ok(!/class="flag"/.test(trendRow({ ...t, needsVerification: false }, { taxonomy: tx, isWatched: () => false, isStale: () => false })));
});
test('trendTable: fixed columns, sortable headers carry data-sort and aria-sort only when asked', () => {
  const t = { id: 'a', title: 'T', categories: ['c'], maturity: 'growing', impact: 'high', momentum: 'rising', lastUpdated: '2026-01-01', sources: [] };
  const ctx = { taxonomy: tx, isWatched: () => false, isStale: () => false };
  const plain = trendTable([t], ctx);
  assert.ok(!/data-sort/.test(plain));
  assert.equal((plain.match(/<th scope="col"/g) || []).length, 6);
  const sortable = trendTable([t], ctx, { sortable: true, sort: 'title', selectedId: 'a' });
  assert.match(sortable, /data-sort="title"/);
  assert.match(sortable, /h-title" aria-sort="ascending"/);
  assert.match(sortable, /h-impact" aria-sort="none"/);
  assert.match(sortable, /data-selected="true"/);
});
test('recRow and recTable escape fields and keep the score as text', () => {
  const r = { id: 'r', title: HOSTILE, description: HOSTILE, trendIds: ['t', 'gone'], horizon: 'now', effort: 'low', impact: 'high', steps: [HOSTILE], successMetrics: [HOSTILE], dependencies: [HOSTILE], audience: [HOSTILE], lastUpdated: '2026-01-01' };
  const ctx = { taxonomy: { horizon: [], effort: [], impact: [] }, trendById: (id) => (id === 't' ? { title: HOSTILE } : null), recById: () => null, score: () => 1, isStale: () => false };
  const html = recRow(r, ctx);
  assert.ok(!/<img/.test(html), html);
  assert.match(html, /Priority score: <\/span>1/);
  const table = recTable([r], ctx, 'Label <b>');
  assert.ok(!table.includes('<b>'));
  assert.equal((table.match(/<th scope="col"/g) || []).length, 6);
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
