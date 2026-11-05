// signals-lib.mjs - pure helpers that match feed items to trends by keyword. No network or file access, so
// tests/signals.test.mjs can cover it directly. The output (data/signals.json) is a derived "what is being
// published about this trend lately" index. It never changes the curated trend text, maturity or momentum.

const DAY = 86400000;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Compiles a keyword list to one case-insensitive regex. Keywords match on word boundaries so "sso" does not
 * match "assoc". A keyword may contain spaces or hyphens. Returns null for an empty list.
 */
export function compileKeywords(keywords) {
  const list = (Array.isArray(keywords) ? keywords : []).map((k) => String(k).trim()).filter(Boolean);
  if (!list.length) return null;
  return new RegExp(`(?<![A-Za-z0-9])(?:${list.map(escapeRe).join('|')})(?![A-Za-z0-9])`, 'i');
}

/** Ids in `rules` that are not real trends, and trends that have no rule. Used to fail loudly on drift. */
export function checkRules(rules, trendIds) {
  const ids = new Set(trendIds);
  const unknown = Object.keys(rules).filter((id) => !ids.has(id));
  const missing = trendIds.filter((id) => !Object.prototype.hasOwnProperty.call(rules, id));
  return { unknown, missing };
}

/**
 * Builds the signals index. For each trend: how many feed items in the last 30 and 90 days match its keywords,
 * the date of the newest match, and up to `maxItems` newest matches (id, title, link, source, published).
 * `now` is injectable for tests. Items with no parseable date never count toward the windows.
 */
export function buildSignals(items, rules, { now = Date.now(), maxItems = 5 } = {}) {
  const compiled = Object.entries(rules).map(([id, kw]) => [id, compileKeywords(kw)]);
  const out = {};
  for (const [id, re] of compiled) {
    const hits = re
      ? items.filter((i) => re.test(`${i.title} ${i.summary || ''}`) && Date.parse(i.published) <= now + DAY)
      : [];
    hits.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    const within = (days) => hits.filter((i) => now - Date.parse(i.published) <= days * DAY).length;
    out[id] = {
      count30: within(30),
      count90: within(90),
      lastSignal: hits.length ? hits[0].published : null,
      items: hits.slice(0, maxItems).map((i) => ({ id: i.id, title: i.title, link: i.link, source: i.source, published: i.published }))
    };
  }
  return out;
}
