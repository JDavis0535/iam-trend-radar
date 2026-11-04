// feed-lib.mjs - pure helpers for scripts/fetch-feed.mjs: dependency-free RSS 2.0 / Atom parsing, keyword
// filtering and merging. No network or file access here, so tests/feed.test.mjs can cover it directly.
// Output text is plain (tags stripped, entities decoded); the site escapes it again when rendering.

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return Object.prototype.hasOwnProperty.call(NAMED, e.toLowerCase()) ? NAMED[e.toLowerCase()] : m;
  });
}

/** Unwraps CDATA, decodes entities, strips tags and collapses whitespace. */
export function cleanText(raw) {
  let s = String(raw ?? '');
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner) => inner);
  // Feed descriptions are usually HTML escaped inside XML, so decode and strip twice: the first pass exposes the
  // HTML, the second turns HTML entities (e.g. &amp;) into text. Tags can never survive either pass.
  for (let pass = 0; pass < 2; pass++) {
    s = decodeEntities(s);
    s = s.replace(/<[^>]*>/g, ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function tagText(block, names) {
  for (const n of names) {
    const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i').exec(block);
    if (m) return m[1];
  }
  return '';
}

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)].map((m) => m[1]);
  const pick = links.find((a) => /rel=["']alternate["']/i.test(a)) || links.find((a) => !/rel=/i.test(a)) || links[0];
  const href = pick && /href=["']([^"']+)["']/i.exec(pick);
  return href ? decodeEntities(href[1]) : '';
}

/** Returns an https URL string or '' (http and other schemes are rejected). */
export function httpsOnly(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === 'https:' ? u.href : '';
  } catch { return ''; }
}

export function toIsoDate(raw) {
  const t = Date.parse(cleanText(raw));
  return Number.isNaN(t) ? '' : new Date(t).toISOString();
}

/** Parses RSS 2.0 (<item>) or Atom (<entry>) XML into [{title, link, published, summary}]. */
export function parseFeed(xml) {
  const text = String(xml ?? '');
  const isAtom = /<feed\b/i.test(text) && !/<rss\b/i.test(text);
  const re = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const items = [];
  for (const [block] of text.matchAll(re)) {
    const title = cleanText(tagText(block, ['title']));
    const link = httpsOnly(isAtom ? atomLink(block) : cleanText(tagText(block, ['link'])) || cleanText(tagText(block, ['guid'])));
    const published = toIsoDate(tagText(block, isAtom ? ['published', 'updated'] : ['pubDate', 'dc:date', 'published']));
    const summary = cleanText(tagText(block, isAtom ? ['summary', 'content'] : ['description', 'content:encoded'])).slice(0, 300);
    if (title && link) items.push({ title, link, published, summary });
  }
  return items;
}

const IDENTITY_RE = /\b(identity|identities|authentication|authenticator|passkeys?|passwordless|credentials?|access control|access management|zero trust|oauth|openid|saml|mfa|multi-factor|privileged|single sign-on|sso|iam|fido|entra|active directory|least privilege|account takeover)\b/i;

/** True when the item looks identity/access related. Used for broad (non-IAM-specific) feeds. */
export function isIdentityRelated(item) {
  return IDENTITY_RE.test(`${item.title} ${item.summary}`);
}

/** Stable short id from the link, so the same story is never listed twice. */
export function itemId(link) {
  let h = 5381;
  for (const ch of link) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
}

/**
 * Merges per-source items into one feed: dedupes by link, drops items older than maxAgeDays,
 * keeps at most perSource per source and total overall, newest first. `now` is injectable for tests.
 */
export function mergeItems(bySource, { now = Date.now(), maxAgeDays = 365, perSource = 25, total = 60 } = {}) {
  const cutoff = now - maxAgeDays * 86400000;
  const seen = new Set();
  const out = [];
  for (const items of bySource) {
    const kept = items
      .filter((i) => !i.published || Date.parse(i.published) >= cutoff)
      .sort((a, b) => (b.published || '').localeCompare(a.published || ''))
      .slice(0, perSource);
    for (const i of kept) {
      if (seen.has(i.link)) continue;
      seen.add(i.link);
      out.push(i);
    }
  }
  out.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  return out.slice(0, total).map((i) => ({ id: itemId(i.link), ...i }));
}
