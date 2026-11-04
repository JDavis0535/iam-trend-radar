// views/feed.js - "Latest" news feed from data/feed.json (written on a schedule by scripts/fetch-feed.mjs).
// Items are grouped by age, items published since your previous visit are marked New, and the source filter is a
// set of chips with counts. The page re-fetches the file every REFRESH_MS while it is open and visible, and again
// when the tab becomes visible. Needs http(s): browsers block fetch() on file://, so a short explanation is shown.

import { esc, safeUrl, emptyState, chipRadios } from '../ui.js';
import { groupFeedItems, isNewItem, countNewItems } from '../filters.js';

export const REFRESH_MS = 15 * 60 * 1000;
export const STALE_HOURS = 48;
export const FEED_SEEN_KEY = 'iamradar.feedseen.v1';

const feed = { data: null, error: '', loadedAt: 0, loading: false, sourceFilter: '' };
let timer = null;
let boundRoot = null;
let baseline = null; // ms timestamp of the previous visit, read once per page session (0 = first visit)
let chipSig = '';

/** Reads the previous visit time once per page session, then records this visit. All storage access is guarded. */
function recordVisit() {
  if (baseline !== null) return;
  let prev = 0;
  try { const v = globalThis.localStorage.getItem(FEED_SEEN_KEY); prev = v ? Date.parse(v) || 0 : 0; } catch { /* storage unavailable */ }
  baseline = prev;
  try { globalThis.localStorage.setItem(FEED_SEEN_KEY, new Date().toISOString()); } catch { /* storage unavailable */ }
}

/** Pure: whole hours between an ISO timestamp and `now` (ms); Infinity if unparseable. */
export function hoursSince(iso, now) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (now - t) / 3600000;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "30 Oct 2026" from an ISO timestamp (UTC), or '' if unparseable. */
export function fmtDate(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function itemHtml(i) {
  const url = safeUrl(i.link);
  const title = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}<span class="vh"> (opens in a new tab)</span></a>` : esc(i.title);
  const isNew = isNewItem(i, baseline || 0);
  const when = i.published ? `<time datetime="${esc(i.published)}">${esc(fmtDate(i.published))}</time>` : '<span class="muted">Undated</span>';
  return `<tr class="frow feed-item">
  <td class="f-date">${when}</td>
  <td class="f-src">${esc(i.source)}</td>
  <td class="f-main"><span class="f-title">${title}</span>${isNew ? ' <span class="badge badge-new">New</span>' : ''}${i.summary ? `<span class="feed-summary">${esc(i.summary)}</span>` : ''}</td>
</tr>`;
}

function feedTable(rows, label) {
  return `<table class="ttable ftable"><caption class="vh">${esc(label)}</caption><thead class="vh"><tr><th scope="col">Date</th><th scope="col">Source</th><th scope="col">Headline</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function skeletonHtml() {
  const row = '<tr class="frow skel" aria-hidden="true"><td class="f-date"><span class="skel-line skel-meta"></span></td><td class="f-src"><span class="skel-line skel-meta"></span></td><td class="f-main"><span class="skel-line skel-title"></span><span class="skel-line"></span></td></tr>';
  return feedTable(row.repeat(6), 'Loading the latest items');
}

function bodyHtml() {
  if (!feed.data) {
    if (feed.error) return `<div class="notice" role="note">${esc(feed.error)}</div>`;
    return skeletonHtml();
  }
  const items = feed.data.items.filter((i) => !feed.sourceFilter || i.sourceId === feed.sourceFilter);
  const stale = hoursSince(feed.data.generatedAt, Date.now()) > STALE_HOURS;
  const failed = (feed.data.sources || []).filter((s) => !s.ok);
  const staleNote = stale ? `<div class="notice" role="note">The feed has not refreshed since ${esc(fmtDate(feed.data.generatedAt))}; items may be out of date.</div>` : '';
  const failNote = failed.length ? `<p class="small muted">Showing earlier items for: ${esc(failed.map((s) => s.name).join(', '))} (could not be reached at the last refresh).</p>` : '';
  if (!items.length) return `${staleNote}${failNote}${emptyState('No items for this source yet.')}`;
  const groups = groupFeedItems(items).map((g) => `<section class="feed-group" aria-labelledby="g-${esc(g.key)}">
  <h2 id="g-${esc(g.key)}" class="group-title">${esc(g.label)} <span class="muted small">(${g.items.length})</span></h2>
  ${feedTable(g.items.map(itemHtml).join(''), g.label)}
</section>`).join('');
  return `${staleNote}${failNote}${groups}`;
}

function statusText() {
  if (feed.loading && !feed.data) return 'Loading the latest items…';
  if (!feed.data) return '';
  const fresh = baseline ? countNewItems(feed.data.items, baseline) : 0;
  const newPart = baseline ? (fresh ? ` ${fresh} new since your last visit.` : ' Nothing new since your last visit.') : '';
  return `Feed generated ${feed.data.generatedAt.slice(0, 16).replace('T', ' ')} UTC. This page checks for updates every ${REFRESH_MS / 60000} minutes.${newPart}`;
}

function chipItems() {
  if (!feed.data) return [];
  return feed.data.sources
    .map((s) => ({ id: s.id, label: `${s.name} (${feed.data.items.filter((i) => i.sourceId === s.id).length})` }))
    .filter((c) => !c.label.endsWith('(0)'));
}

function chipsHtml() {
  const total = feed.data ? feed.data.items.length : 0;
  return chipRadios('source', 'Source', chipItems(), feed.sourceFilter, `All (${total})`);
}

function paintChips(force) {
  const box = boundRoot && boundRoot.querySelector('#feed-chips');
  if (!box) return;
  const sig = feed.data ? JSON.stringify([chipItems(), feed.data.items.length, feed.sourceFilter]) : '';
  if (!force && sig === chipSig) return; // unchanged: leave the controls (and their focus) alone
  chipSig = sig;
  box.innerHTML = feed.data ? chipsHtml() : '';
}

function paintBody() {
  if (!boundRoot || !boundRoot.isConnected) return;
  const body = boundRoot.querySelector('#feed-body');
  if (body) { body.innerHTML = bodyHtml(); body.setAttribute('aria-busy', String(feed.loading && !feed.data)); }
}

function paint() {
  if (!boundRoot || !boundRoot.isConnected) return;
  paintBody();
  paintChips(false);
  const st = boundRoot.querySelector('#feed-status');
  if (st) st.textContent = statusText();
  const btn = boundRoot.querySelector('#feed-refresh');
  if (btn) { btn.disabled = feed.loading; btn.textContent = feed.loading ? 'Refreshing…' : 'Refresh now'; }
}

export async function loadFeed() {
  if (feed.loading) return;
  feed.loading = true;
  paint();
  try {
    // Browsers block fetch() on file://, and would log a console error for it; do not even try.
    if (location.protocol === 'file:') throw new Error('file protocol');
    const res = await fetch(`data/feed.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) throw new Error('malformed feed');
    feed.data = data;
    feed.error = '';
    feed.loadedAt = Date.now();
  } catch (e) {
    // Keep showing the previous data if a refresh fails; only show an error when we have nothing.
    if (!feed.data) {
      feed.error = location.protocol === 'file:'
        ? 'The live feed needs the site to be served over http(s); browsers block loading it when index.html is opened directly from disk.'
        : `The feed could not be loaded (${e.message}). Try again later.`;
    }
  } finally {
    feed.loading = false;
    paint();
  }
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null; }
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible' && boundRoot && boundRoot.isConnected) loadFeed();
    else if (!boundRoot || !boundRoot.isConnected) stopTimer();
  }, REFRESH_MS);
}

export function renderFeed() {
  return {
    title: 'Latest',
    html: `<h1 tabindex="-1">Latest from the field</h1>
<p class="lead">Headlines from official identity and security sources, refreshed automatically. These are links to the original publishers, not summaries we have verified.</p>
<form class="feed-controls" id="feed-form" aria-label="Filter the feed" autocomplete="off">
  <div id="feed-chips">${feed.data ? chipsHtml() : ''}</div>
  <div class="feed-actions"><button type="button" class="btn btn-compact" id="feed-refresh">Refresh now</button></div>
</form>
<p id="feed-status" class="small muted" role="status">${esc(statusText())}</p>
<div id="feed-body" aria-busy="${!feed.data && !feed.error}">${bodyHtml()}</div>`
  };
}

export function bindFeed(root) {
  recordVisit();
  boundRoot = root;
  chipSig = feed.data ? JSON.stringify([chipItems(), feed.data.items.length, feed.sourceFilter]) : '';
  root.querySelector('#feed-form').addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('#feed-form').addEventListener('change', (e) => {
    if (e.target.name !== 'source') return;
    feed.sourceFilter = e.target.value;
    chipSig = JSON.stringify([chipItems(), feed.data.items.length, feed.sourceFilter]);
    paintBody();
  });
  root.querySelector('#feed-refresh').addEventListener('click', () => loadFeed());
  if (!feed.data || Date.now() - feed.loadedAt > REFRESH_MS) loadFeed();
  else paint();
  startTimer();
}

// Stop polling when the user leaves the Feed view, and catch up when a hidden tab becomes visible again.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => { if (!/^#\/feed\/?$/.test(location.hash)) stopTimer(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timer && Date.now() - feed.loadedAt > REFRESH_MS) loadFeed();
  });
}
