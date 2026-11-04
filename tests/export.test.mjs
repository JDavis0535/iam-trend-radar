import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watchlistToMarkdown, mdEscape } from '../js/export.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => JSON.parse(readFileSync(resolve(root, 'data', f), 'utf8'));
const base = { trends: rd('trends.json'), recommendations: rd('recommendations.json'), meta: rd('meta.json'), taxonomy: rd('taxonomy.json') };
const md = (w, over = {}) => watchlistToMarkdown({ ...base, watchlist: w, ...over });

test('0 watched: placeholder', () => {
  const out = md([]);
  assert.match(out, /_No trends on the watchlist\._/);
  assert.ok(out.endsWith('\n'));
});
test('1 watched: required content (AC7)', () => {
  const t = base.trends.find((x) => x.id === 'itdr');
  const out = md(['itdr']);
  assert.ok(out.includes('## ' + mdEscape(t.title)));
  assert.match(out, /- Maturity: /);
  assert.match(out, /- Impact: /);
  assert.ok(out.includes(mdEscape(t.summary)));
  for (const s of t.sources) assert.ok(out.includes(s.url.replace(/[()\s<>]/g, (c) => ({ '(': '%28', ')': '%29' }[c] || encodeURIComponent(c)))));
  const rs = base.recommendations.filter((r) => r.trendIds.includes('itdr'));
  for (const r of rs) {
    assert.ok(out.includes('#### ' + mdEscape(r.title)));
    r.steps.forEach((s) => assert.ok(out.includes(mdEscape(s))));
  }
  assert.equal((out.match(/- Horizon: /g) || []).length, rs.length);
});
test('3 watched: sorted by title, deterministic, order-independent', () => {
  const a = md(['zero-trust-identity', 'itdr', 'passkeys-passwordless']);
  assert.equal(a, md(new Set(['passkeys-passwordless', 'zero-trust-identity', 'itdr'])));
  assert.equal(a, md(['itdr', 'passkeys-passwordless', 'zero-trust-identity']));
  const heads = [...a.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.equal(heads.length, 3);
  assert.deepEqual(heads, [...heads].sort((x, y) => x.localeCompare(y, 'en', { sensitivity: 'base' })));
});
test('no timestamps in output', () => {
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(md(['itdr'])));
});
test('special characters are escaped', () => {
  const trends = [{ id: 'x', title: 'A *bold* <b>t</b> [x](y) | `c`', maturity: 'growing', impact: 'high', momentum: 'rising', summary: 'line1\n# heading\nline2', sources: [{ title: 'S]', publisher: 'P', type: 'vendor', url: 'https://e.com/a_(b)' }], needsVerification: true, verificationNotes: 'n' }];
  const out = md(['x'], { trends, recommendations: [] });
  assert.ok(!out.includes('<b>'));
  assert.ok(out.includes('\\*bold\\*'));
  assert.ok(!/^# heading/m.test(out), 'newline-injected heading must be neutralised');
  assert.ok(out.includes('https://e.com/a_%28b%29'));
});
test('unknown watched id is ignored', () => assert.match(md(['ghost']), /No trends/));
