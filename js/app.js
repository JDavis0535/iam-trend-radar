// app.js - entry point: loads data, wires the global watch-toggle handler and starts the router.
// Shows a clear error view (with local-server instructions) if the data cannot be loaded.

import { loadData, loadSignals, toggleWatch, state } from './store.js';
import { startRouter, refreshCurrent } from './router.js';
import { esc } from './ui.js';
import { renderDashboard, bindDashboard } from './views/dashboard.js';
import { renderTrend } from './views/trend.js';
import { renderPlaybook, bindPlaybook } from './views/playbook.js';
import { renderWatchlist, bindWatchlist } from './views/watchlist.js';
import { renderAbout } from './views/about.js';
import { renderFeed, bindFeed } from './views/feed.js';

const views = {
  dashboard: { render: renderDashboard, bind: bindDashboard },
  trend: { render: renderTrend },
  playbook: { render: renderPlaybook, bind: bindPlaybook },
  feed: { render: renderFeed, bind: bindFeed },
  watchlist: { render: renderWatchlist, bind: bindWatchlist },
  about: { render: renderAbout },
  notfound: {
    render: () => ({
      title: 'Not found',
      html: '<h1 tabindex="-1">Page not found</h1><p>That page or trend does not exist.</p><p><a class="btn" href="#/">Back to the dashboard</a></p>'
    })
  }
};

function showLoadError(root, message) {
  document.title = 'Data unavailable - IAM Trend Radar';
  root.innerHTML = `<div class="view"><h1 tabindex="-1">Data could not be loaded</h1>
<div class="notice" role="alert">${esc(message)}</div>
<p>If you opened <code>index.html</code> directly, make sure <code>data/data.js</code> exists (run <code>node scripts/build-data.mjs</code>). Otherwise serve the folder with a local web server and open the printed address:</p>
<pre><code>python -m http.server 8000</code></pre>
<p>Then browse to <code>http://localhost:8000/</code>.</p></div>`;
}

async function main() {
  const root = document.getElementById('app');
  try {
    await loadData();
  } catch (e) {
    showLoadError(root, e.message);
    return;
  }
  await loadSignals(); // optional and time-boxed; the site renders the same without it
  const footer = document.getElementById('data-version');
  if (footer) footer.textContent = `Dataset ${state.meta.datasetVersion}, updated ${state.meta.lastUpdated}. ${state.meta.disclaimer}`;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-watch]');
    if (!btn) return;
    toggleWatch(btn.dataset.watch);
    refreshCurrent({ focusSelector: `button[data-watch="${CSS.escape(btn.dataset.watch)}"]` });
  });

  startRouter(root, views);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
else main();
