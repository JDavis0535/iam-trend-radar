// build-signals.mjs - matches data/feed.json items to trends using data/signal-rules.json and writes data/signals.json.
// Usage: node scripts/build-signals.mjs        (Node 18+, no dependencies; run after fetch-feed.mjs by .github/workflows/pages.yml)
// The result is a derived index shown on the dashboard and trend pages. It does not edit curated content.
// If the feed is missing or unreadable, the previous signals.json is left alone and the exit code is 0, so a feed
// outage never breaks a deploy. A rules file that references unknown trends is a hard error (exit 1).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSignals, checkRules } from './signals-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));

const trends = readJson('data/trends.json');
const rules = readJson('data/signal-rules.json');
const { unknown, missing } = checkRules(rules, trends.map((t) => t.id));
if (unknown.length || missing.length) {
  if (unknown.length) console.error(`signal-rules.json references unknown trends: ${unknown.join(', ')}`);
  if (missing.length) console.error(`signal-rules.json has no rule for trends: ${missing.join(', ')}`);
  process.exit(1);
}

let feed;
try { feed = readJson('data/feed.json'); } catch (e) {
  console.warn(`WARN no usable data/feed.json (${e.message}); leaving data/signals.json unchanged`);
  process.exit(0);
}
if (!feed || !Array.isArray(feed.items)) {
  console.warn('WARN data/feed.json has no items array; leaving data/signals.json unchanged');
  process.exit(0);
}

const signals = {
  schemaVersion: 1,
  generatedAt: feed.generatedAt || new Date().toISOString(),
  trends: buildSignals(feed.items, rules)
};
writeFileSync(resolve(root, 'data/signals.json'), JSON.stringify(signals, null, 1) + '\n');
const total = Object.values(signals.trends).reduce((n, s) => n + s.count30, 0);
console.log(`wrote data/signals.json: ${total} trend matches in the last 30 days across ${trends.length} trends`);
