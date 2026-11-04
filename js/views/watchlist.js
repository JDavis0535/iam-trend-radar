// views/watchlist.js - watched trends and their recommendations, Markdown export (view/copy/download) and confirmed clear.

import { state, makeCtx, clearWatchlist } from '../store.js';
import { sortRecs, sortTrends } from '../filters.js';
import { watchlistToMarkdown } from '../export.js';
import { esc, trendTable, recTable, emptyState } from '../ui.js';

// Whether the export panel is open. Kept here so a re-render (e.g. un-watching a trend) does not close it;
// reset when the user navigates to another route.
let exportOpen = false;
window.addEventListener('hashchange', () => { exportOpen = false; });

export function renderWatchlist() {
  const ctx = makeCtx();
  const trends = sortTrends(state.trends.filter((t) => state.watch.has(t.id)), 'title');
  const storageNote = state.storageOk ? '' : '<div class="notice" role="note">Browser storage is unavailable, so your watchlist will not be saved after you close this tab.</div>';
  if (trends.length === 0) {
    exportOpen = false;
    return {
      title: 'Watchlist',
      html: `<h1 tabindex="-1">Watchlist</h1>${storageNote}${emptyState('Your watchlist is empty. Use the Watch button on any trend to add it.', '<p><a class="btn" href="#/">Browse trends</a></p>')}`
    };
  }
  const recs = sortRecs(state.recommendations.filter((r) => r.trendIds.some((id) => state.watch.has(id))), 'priority');
  return {
    title: 'Watchlist',
    html: `<h1 tabindex="-1">Watchlist</h1>
<p class="lead">Saved in this browser only. ${trends.length} trend${trends.length === 1 ? '' : 's'} watched.</p>${storageNote}
<div class="toolbar">
  <button type="button" class="btn btn-primary" data-action="export">Export as Markdown</button>
  <button type="button" class="btn" data-action="clear-watchlist">Clear watchlist</button>
</div>
<div id="export-panel"${exportOpen ? '' : ' hidden'}>
  <h2 id="h-export">Markdown export</h2>
  <label for="export-text" class="vh">Markdown export text</label>
  <textarea id="export-text" rows="14" readonly>${exportOpen ? esc(markdown()) : ''}</textarea>
  <div class="toolbar">
    <button type="button" class="btn" data-action="copy">Copy</button>
    <button type="button" class="btn" data-action="download">Download .md</button>
    <span id="export-status" class="small" role="status"></span>
  </div>
</div>
<section aria-labelledby="h-wt"><h2 id="h-wt">Watched trends</h2>${trendTable(trends, ctx)}</section>
<section aria-labelledby="h-wr"><h2 id="h-wr">Recommendations for watched trends</h2>${recTable(recs, ctx, 'Recommendations for watched trends')}</section>`
  };
}

function markdown() {
  return watchlistToMarkdown({
    trends: state.trends,
    recommendations: state.recommendations,
    watchlist: state.watch,
    meta: state.meta,
    taxonomy: state.taxonomy
  });
}

export function bindWatchlist(root, api) {
  const status = (msg) => { const el = root.querySelector('#export-status'); if (el) el.textContent = msg; };
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'export') {
      const panel = root.querySelector('#export-panel');
      exportOpen = true;
      root.querySelector('#export-text').value = markdown();
      panel.hidden = false;
      root.querySelector('#export-text').focus();
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(markdown());
        status('Copied to clipboard.');
      } catch {
        root.querySelector('#export-text').select();
        status('Copy is not available here; the text is selected so you can copy it manually.');
      }
    } else if (action === 'download') {
      const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'iam-trend-radar-watchlist.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status('Download started.');
    } else if (action === 'clear-watchlist') {
      if (window.confirm('Remove all trends from your watchlist? This cannot be undone.')) {
        clearWatchlist();
        exportOpen = false;
        api.refresh({});
      }
    }
  });
}
