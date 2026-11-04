// landscape.test.mjs - maturity x impact table and the impact/effort meters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { landscape, valueMark } from '../js/ui.js';

const tx = JSON.parse(readFileSync(new URL('../data/taxonomy.json', import.meta.url), 'utf8'));
const trends = JSON.parse(readFileSync(new URL('../data/trends.json', import.meta.url), 'utf8'));

test('landscape returns nothing for no trends', () => {
  assert.equal(landscape([], tx), '');
});

test('landscape places every trend exactly once, as a link, in the right cell', () => {
  const html = landscape(trends, tx);
  for (const t of trends) {
    const hits = html.split(`href="#/trend/${encodeURIComponent(t.id)}"`).length - 1;
    assert.equal(hits, 1, `${t.id} appears once`);
  }
  // non-human-identity is growing + transformative: it must sit in the transformative row, "Growing" column
  const row = /<tr class="imp-transformative[^"]*">([\s\S]*?)<\/tr>/.exec(html)[1];
  const growing = /<td data-label="Growing"[^>]*>([\s\S]*?)<\/td>/.exec(row)[1];
  assert.ok(growing.includes('#/trend/non-human-identity'));
});

test('landscape is a labelled table with row and column headers and highest impact first', () => {
  const html = landscape(trends, tx);
  assert.match(html, /<caption class="vh">/);
  assert.equal((html.match(/<th scope="col">/g) || []).length, tx.maturity.length);
  assert.equal((html.match(/<th scope="row">/g) || []).length, tx.impact.length);
  assert.ok(html.indexOf('imp-transformative') < html.indexOf('imp-low'));
});

test('landscape momentum is conveyed in text, not just by the arrow', () => {
  const html = landscape(trends.filter((t) => t.momentum === 'rising').slice(0, 1), tx);
  assert.match(html, /\(Momentum: Rising\)/);
});

test('landscape escapes hostile titles and ids', () => {
  const evil = [{ id: 'x"><img src=x onerror=1>', title: '<script>alert(1)</script>', maturity: 'growing', impact: 'high', momentum: 'rising' }];
  const html = landscape(evil, tx);
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
});

test('impact and effort badges draw meters with the right number of filled bars and keep text labels', () => {
  const filled = (h) => (h.match(/<i class="on">/g) || []).length;
  const total = (h) => (h.match(/<i[ >]/g) || []).length;
  const hi = valueMark('impact', 'transformative', tx);
  assert.equal(filled(hi), 4); assert.equal(total(hi), 4);
  assert.match(hi, /Impact: <\/span>Transformative/);
  const lo = valueMark('impact', 'low', tx);
  assert.equal(filled(lo), 1);
  const ef = valueMark('effort', 'medium', { effort: [{ id: 'medium', label: 'Medium' }] });
  assert.equal(filled(ef), 2); assert.equal(total(ef), 3);
});

// ---- filter chips ----
import { chipRadios, chipCheck } from '../js/ui.js';
import { countActive, defaultFilters } from '../js/filters.js';

test('chipRadios renders a labelled fieldset with an All option and marks the selection', () => {
  const html = chipRadios('maturity', 'Maturity', tx.maturity, 'growing', 'All');
  assert.match(html, /<fieldset class="chipset"><legend>Maturity<\/legend>/);
  assert.equal((html.match(/type="radio" name="maturity"/g) || []).length, tx.maturity.length + 1);
  assert.match(html, /value="growing" checked/);
  assert.ok(!/value="" checked/.test(html));
  assert.match(chipRadios('impact', 'Impact', tx.impact, '', 'All'), /value="" checked/);
});

test('chip helpers escape hostile values', () => {
  const html = chipRadios('x"><b>', 'L<script>', [{ id: '"><img src=x>', label: '<i>' }], '', 'All');
  assert.ok(!html.includes('<script>') && !html.includes('<img') && !html.includes('<b>') && !html.includes('<i>'));
  assert.ok(!chipCheck('n', 'i"><b>', '<u>', true).includes('<u>'));
});

test('countActive counts chips and category but not search text or sort', () => {
  assert.equal(countActive(defaultFilters()), 0);
  assert.equal(countActive({ ...defaultFilters(), text: 'abc', sort: 'title' }), 0);
  assert.equal(countActive({ ...defaultFilters(), category: 'governance', maturity: 'growing', watchOnly: true }), 3);
  assert.equal(countActive(null), 0);
});

// ---- priority bar ----
import { priorityPct, recRow } from '../js/ui.js';

test('priorityPct maps the -1..7 score range onto 0..100 and never returns junk', () => {
  assert.equal(priorityPct(-1), 0);
  assert.equal(priorityPct(7), 100);
  assert.equal(priorityPct(3), 50);
  assert.equal(priorityPct(99), 100);
  assert.equal(priorityPct(-50), 0);
  assert.equal(priorityPct('x'), 0);
  assert.equal(priorityPct(undefined), 0);
});

test('recRow draws the priority as a bar and keeps the number as text', () => {
  const recs = JSON.parse(readFileSync(new URL('../data/recommendations.json', import.meta.url), 'utf8'));
  const ctx = { taxonomy: tx, trendById: () => null, recById: () => null, isStale: () => false, score: () => 5 };
  const html = recRow(recs[0], ctx);
  assert.match(html, /<span class="pbar" aria-hidden="true"><i style="width:75%"><\/i><\/span>/);
  assert.match(html, /Priority score: <\/span>5/);
});
