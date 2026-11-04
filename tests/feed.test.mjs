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
