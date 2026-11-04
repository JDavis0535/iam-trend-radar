// views/feed.js - "Latest" news feed from data/feed.json (written on a schedule by scripts/fetch-feed.mjs).
// The page re-fetches the file every REFRESH_MS while it is open and visible, and again when the tab becomes visible.
// Needs http(s): browsers block fetch() on file://, in which case a short explanation is shown instead.

import { esc, safeUrl, emptyState } from '../ui.js';

export const REFRESH_MS = 15 * 60 * 1000;
export const STALE_HOURS = 48;

const feed = { data: null, error: '', loadedAt: 0, loading: false, sourceFilter: '' };
let timer = null;
let boundRoot = null;

/** Pure: whole hours between an ISO timestamp and `now` (ms); Infinity if unparseable. */
export function hoursSince(iso, now) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (now - t) / 3600000;
}

function fmtDate(iso) {
  return iso ? iso.slice(0, 10) : '';
}

function itemHtml(i) {
  const url = safeUrl(i.link);
  const title = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a>` : esc(i.title);
  return `<li class="card">
  <h3 class="card-title">${title}</h3>
  <p class="small muted">${esc(i.source)}${i.published ? ` &middot; <time datetime="${esc(i.published)}">${esc(fmtDate(i.published))}</time>` : ''}</p>
  ${i.summary ? `<p>${esc(i.summary)}</p>` : ''}
</li>`;
}

function bodyHtml() {
  if (!feed.data) {
    if (feed.error) return `<div class="notice" role="note">${esc(feed.error)}</div>`;
    return '<p class="muted">Loading the latest items&hellip;</p>';
  }
  const items = feed.data.items.filter((i) => !feed.sourceFilter || i.sourceId === feed.sourceFilter);
  const stale = hoursSince(feed.data.generatedAt, Date.now()) > STALE_HOURS;
  const failed = (feed.data.sources || []).filter((s) => !s.ok);
  const staleNote = stale ? `<div class="notice" role="note">The feed has not refreshed since ${esc(fmtDate(feed.data.generatedAt))}; items may be out of date.</div>` : '';
  const failNote = failed.length ? `<p class="small muted">Showing earlier items for: ${esc(failed.map((s) => s.name).join(', '))} (could not be reached at the last refresh).</p>` : '';
  const list = items.length ? `<ul class="grid">${items.map(itemHtml).join('')}</ul>` : emptyState('No items for this source yet.');
  return `${staleNote}${failNote}${list}`;
}

function statusText() {
  if (!feed.data) return '';
  return `Feed generated ${feed.data.generatedAt.slice(0, 16).replace('T', ' ')} UTC. This page checks for updates every ${REFRESH_MS / 60000} minutes.`;
}

function paint() {
  if (!boundRoot || !boundRoot.isConnected) return;
  const body = boundRoot.querySelector('#feed-body');
  if (body) body.innerHTML = bodyHtml();
  const st = boundRoot.querySelector('#feed-status');
  if (st) st.textContent = statusText();
  const sel = boundRoot.querySelector('#feed-source');
  if (sel && feed.data && sel.options.length <= 1) {
    sel.innerHTML = `<option value="">All sources</option>${feed.data.sources.map((s) => `<option value="${esc(s.id)}"${s.id === feed.sourceFilter ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}`;
  }
}

export async function loadFeed() {
  if (feed.loading) return;
  feed.loading = true;
  try {
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
  const sources = feed.data ? feed.data.sources : [];
  return {
    title: 'Latest',
    html: `<h1 tabindex="-1">Latest from the field</h1>
<p class="lead">Headlines from official identity and security sources, refreshed automatically. These are links to the original publishers, not summaries we have verified.</p>
<div class="toolbar">
  <label for="feed-source">Source</label>
  <select id="feed-source"><option value="">All sources</option>${sources.map((s) => `<option value="${esc(s.id)}"${s.id === feed.sourceFilter ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
  <button type="button" class="btn" id="feed-refresh">Refresh now</button>
  <span id="feed-status" class="small muted" role="status">${esc(statusText())}</span>
</div>
<div id="feed-body">${bodyHtml()}</div>`
  };
}

export function bindFeed(root) {
  boundRoot = root;
  root.querySelector('#feed-source').addEventListener('change', (e) => { feed.sourceFilter = e.target.value; paint(); });
  root.querySelector('#feed-refresh').addEventListener('click', () => loadFeed());
  if (!feed.data || Date.now() - feed.loadedAt > REFRESH_MS) loadFeed();
  startTimer();
}

// Stop polling when the user leaves the Feed view, and catch up when a hidden tab becomes visible again.
window.addEventListener('hashchange', () => { if (!/^#\/feed\/?$/.test(location.hash)) stopTimer(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timer && Date.now() - feed.loadedAt > REFRESH_MS) loadFeed();
});
