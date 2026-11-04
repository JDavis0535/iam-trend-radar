// fetch-feed.mjs - pulls official RSS/Atom feeds and writes data/feed.json for the site's Feed view.
// Usage: node scripts/fetch-feed.mjs        (Node 18+, no dependencies; run on a schedule by .github/workflows/pages.yml)
// Each source is fetched independently with an honest User-Agent. If a source fails, its previous items are kept from
// the existing data/feed.json, so one outage never empties the feed. Exit code is 0 unless every source failed
// and there is nothing to fall back to.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeed, isIdentityRelated, mergeItems } from './feed-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'data/feed.json');

// filter: true = broad feed, keep only identity/access related items.
export const SOURCES = [
  { id: 'fido', name: 'FIDO Alliance', url: 'https://fidoalliance.org/feed/', filter: false },
  { id: 'openid', name: 'OpenID Foundation', url: 'https://openid.net/feed/', filter: false },
  { id: 'nist', name: 'NIST News', url: 'https://www.nist.gov/news-events/news/rss.xml', filter: true },
  { id: 'cisa', name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', filter: true },
  { id: 'w3c', name: 'W3C News', url: 'https://www.w3.org/blog/news/feed', filter: true }
];

const UA = 'IAMTrendRadar-feed/1.0 (scheduled RSS reader for a public IAM trends site)';

async function fetchSource(src) {
  const res = await fetch(src.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let items = parseFeed(await res.text());
  if (src.filter) items = items.filter(isIdentityRelated);
  return items.map((i) => ({ ...i, source: src.name, sourceId: src.id }));
}

function readPrevious() {
  try { return JSON.parse(readFileSync(outFile, 'utf8')); } catch { return null; }
}

async function main() {
  const prev = readPrevious();
  const prevItems = (prev && Array.isArray(prev.items)) ? prev.items : [];
  const status = [];
  const bySource = [];
  for (const src of SOURCES) {
    try {
      const items = await fetchSource(src);
      bySource.push(items);
      status.push({ id: src.id, name: src.name, ok: true, count: items.length });
    } catch (e) {
      const fallback = prevItems.filter((i) => i.sourceId === src.id);
      bySource.push(fallback);
      status.push({ id: src.id, name: src.name, ok: false, count: fallback.length, error: String(e.message || e).slice(0, 120) });
      console.warn(`WARN ${src.id}: ${e.message || e} (kept ${fallback.length} previous items)`);
    }
  }
  const items = mergeItems(bySource);
  if (status.every((s) => !s.ok) && items.length === 0) {
    console.error('Every source failed and there is no previous feed; not writing.');
    process.exit(1);
  }
  const allFailed = status.every((s) => !s.ok);
  const feed = {
    schemaVersion: 1,
    // Keep the old timestamp when nothing was refreshed, so the site can say the feed is stale.
    generatedAt: allFailed && prev && prev.generatedAt ? prev.generatedAt : new Date().toISOString(),
    sources: status,
    items
  };
  writeFileSync(outFile, JSON.stringify(feed, null, 1) + '\n');
  console.log(`wrote data/feed.json: ${items.length} items; ${status.filter((s) => s.ok).length}/${status.length} sources ok`);
}

main();
