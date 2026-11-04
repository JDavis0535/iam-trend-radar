// feed.test.mjs - RSS/Atom parsing, filtering, merging and feed-view helpers (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, cleanText, httpsOnly, isIdentityRelated, mergeItems, itemId } from '../scripts/feed-lib.mjs';
import { parseRoute } from '../js/router.js';

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>
<item><title><![CDATA[Passkeys &amp; you]]></title><link>https://example.org/a</link><pubDate>Thu, 30 Oct 2026 10:00:00 +0000</pubDate>
<description>&lt;p&gt;Hello &lt;b&gt;world&lt;/b&gt; &amp;amp; more&lt;/p&gt;</description></item>
<item><title>Insecure link</title><link>http://example.org/b</link></item>
<item><title>Script</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom one</title>
<link rel="self" href="https://example.org/self"/><link rel="alternate" href="https://example.org/alt?a=1&amp;b=2"/>
<updated>2026-10-01T00:00:00Z</updated><summary>Sum</summary></entry></feed>`;

test('parseFeed handles RSS, decodes entities, strips tags and keeps only https links', () => {
  const items = parseFeed(RSS);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Passkeys & you');
  assert.equal(items[0].link, 'https://example.org/a');
  assert.equal(items[0].published, '2026-10-30T10:00:00.000Z');
  assert.equal(items[0].summary, 'Hello world & more');
});

test('parseFeed handles Atom and prefers the alternate link', () => {
  const items = parseFeed(ATOM);
  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://example.org/alt?a=1&b=2');
  assert.equal(items[0].published, '2026-10-01T00:00:00.000Z');
});

test('parseFeed returns [] for garbage and cleanText never leaves tags', () => {
  assert.deepEqual(parseFeed('not xml'), []);
  assert.deepEqual(parseFeed(null), []);
  assert.ok(!/[<>]/.test(cleanText('&lt;script&gt;alert(1)&lt;/script&gt; <img src=x onerror=y>')));
});

test('httpsOnly rejects other schemes and junk', () => {
  assert.equal(httpsOnly('https://a.example/x'), 'https://a.example/x');
  for (const bad of ['http://a.example', 'javascript:alert(1)', 'data:text/html,hi', '', 'nope']) assert.equal(httpsOnly(bad), '');
});

test('isIdentityRelated matches identity topics and skips unrelated ones', () => {
  assert.ok(isIdentityRelated({ title: 'New passkey guidance', summary: '' }));
  assert.ok(isIdentityRelated({ title: 'x', summary: 'Zero Trust architecture update' }));
  assert.ok(!isIdentityRelated({ title: 'Quantum clock record', summary: 'Atomic physics' }));
  assert.ok(!isIdentityRelated({ title: 'Diamond results', summary: '' })); // "iam" must not match inside words
});

test('mergeItems dedupes, drops old items, caps per source, sorts newest first', () => {
  const now = Date.parse('2026-11-04T00:00:00Z');
  const mk = (n, d, src) => ({ title: `t${n}`, link: `https://e.org/${n}`, published: `${d}T00:00:00.000Z`, summary: '', source: src, sourceId: src });
  const a = [mk(1, '2026-10-01', 'a'), mk(2, '2026-10-20', 'a'), mk(3, '2024-01-01', 'a')];
  const b = [mk(2, '2026-10-20', 'b'), mk(4, '2026-10-25', 'b')];
  const out = mergeItems([a, b], { now, perSource: 2 });
  assert.deepEqual(out.map((i) => i.link.split('/').pop()), ['4', '2', '1']);
  assert.ok(out.every((i) => i.id && i.id === itemId(i.link)));
});

test('router knows #/feed', () => {
  assert.deepEqual(parseRoute('#/feed'), { name: 'feed' });
  assert.deepEqual(parseRoute('#/feed/'), { name: 'feed' });
});

// ---- Latest page: grouping, "new" markers, formatting ----
import { groupFeedItems, isNewItem, countNewItems } from '../js/filters.js';
import { fmtDate, hoursSince } from '../js/views/feed.js';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const at = (iso) => ({ title: 't', link: 'https://e.org/' + iso, published: iso });

test('groupFeedItems buckets by age, newest first, with stable labels', () => {
  const items = [at('2026-10-01T00:00:00Z'), at('2026-11-04T08:00:00Z'), at('2026-11-03T23:59:00Z'), at('2026-10-30T10:00:00Z'), at('2026-10-20T00:00:00Z'), at('2026-09-02T00:00:00Z'), { title: 'x', link: 'https://e.org/u' }];
  const g = groupFeedItems(items, NOW);
  assert.deepEqual(g.map((x) => x.label), ['Today', 'Yesterday', 'Earlier this week', 'Earlier this month', 'October 2026', 'September 2026', 'Undated']);
  assert.equal(g.reduce((n, x) => n + x.items.length, 0), items.length);
});

test('groupFeedItems sorts within a group and treats future dates as today', () => {
  const g = groupFeedItems([at('2026-11-04T01:00:00Z'), at('2026-11-04T09:00:00Z'), at('2026-11-20T00:00:00Z')], NOW);
  assert.equal(g.length, 1);
  assert.equal(g[0].label, 'Today');
  assert.deepEqual(g[0].items.map((i) => i.published), ['2026-11-20T00:00:00Z', '2026-11-04T09:00:00Z', '2026-11-04T01:00:00Z']);
});

test('groupFeedItems handles empty and junk input', () => {
  assert.deepEqual(groupFeedItems([], NOW), []);
  assert.deepEqual(groupFeedItems(null, NOW), []);
  assert.equal(groupFeedItems([{ title: 'a', link: 'https://e.org', published: 'not a date' }], NOW)[0].label, 'Undated');
});

test('isNewItem / countNewItems: only items after the baseline; first visit marks nothing', () => {
  const items = [at('2026-11-04T08:00:00Z'), at('2026-11-01T00:00:00Z'), { title: 'x', link: 'https://e.org/u' }];
  const base = Date.parse('2026-11-02T00:00:00Z');
  assert.equal(countNewItems(items, base), 1);
  assert.equal(isNewItem(items[1], base), false);
  assert.equal(isNewItem(items[2], base), false);
  assert.equal(countNewItems(items, 0), 0);
  assert.equal(countNewItems(null, base), 0);
});

test('fmtDate and hoursSince', () => {
  assert.equal(fmtDate('2026-10-30T10:00:00.000Z'), '30 Oct 2026');
  assert.equal(fmtDate('nope'), '');
  assert.equal(hoursSince('2026-11-04T10:00:00Z', NOW), 2);
  assert.equal(hoursSince('nope', NOW), Infinity);
});
