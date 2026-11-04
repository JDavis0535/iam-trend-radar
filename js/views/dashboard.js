// views/dashboard.js - stat tiles, maturity x impact landscape and trend card grid, driven by combined filters, search, sort and a live result count.
// Filters live in store.state.filters (persisted), so they survive navigation to a trend and back.

import { state, makeCtx, saveFilters, resetFilters } from '../store.js';
import { filterTrends, sortTrends, countActive } from '../filters.js';
import { esc, options, trendCard, emptyState, landscape, chipRadios, chipCheck } from '../ui.js';

// Whether the filter panel is open on narrow screens (on wide screens it is always shown). Module-level so it
// survives the re-render that follows a watch toggle or "Clear filters".
let panelOpen = false;

/** Number of active filters, and whether anything (including search text) can be cleared. */
function filterSummary() {
  const n = countActive(state.filters);
  return { n, any: n > 0 || state.filters.text.trim() !== '' };
}

function dashboardResults() {
  const ctx = makeCtx();
  const list = sortTrends(filterTrends(state.trends, state.filters, state.watch), state.filters.sort);
  const count = `${list.length} of ${state.trends.length} trends shown`;
  const html = list.length
    ? `<ul class="grid" aria-label="Trends">${list.map((t) => trendCard(t, ctx)).join('')}</ul>`
    : emptyState('No trends match these filters.', '<p><button type="button" class="btn" data-action="clear-filters">Clear filters</button></p>');
  return { count, html, list };
}

export function renderDashboard() {
  const f = state.filters;
  const tx = state.taxonomy;
  const res = dashboardResults();
  const flagged = state.trends.filter((t) => t.needsVerification).length;
  const rising = state.trends.filter((t) => t.momentum === 'rising').length;
  const sum = filterSummary();
  const sorts = [
    { id: 'impact', label: 'Impact (high first)' },
    { id: 'maturity', label: 'Maturity (most mature first)' },
    { id: 'updated', label: 'Recently updated' },
    { id: 'title', label: 'Title (A-Z)' }
  ];
  return {
    title: 'Dashboard',
    html: `<h1 tabindex="-1">What is changing in identity and access</h1>
<p class="lead">How mature and impactful each trend is, and what to do about it.</p>
<ul class="tiles" aria-label="Dataset summary">
  <li class="tile"><strong>${state.trends.length}</strong><span>Trends</span></li>
  <li class="tile"><strong>${state.recommendations.length}</strong><span>Recommendations</span></li>
  <li class="tile"><strong>${rising}</strong><span>Rising momentum</span></li>
  <li class="tile"><strong>${esc(state.meta.lastUpdated)}</strong><span>Data updated</span></li>${flagged ? `
  <li class="tile tile-warn"><strong>${flagged}</strong><span>Need verification</span></li>` : ''}
</ul>
<form class="dash-filters${panelOpen ? ' open' : ''}" id="filter-form" role="search" aria-label="Filter trends" autocomplete="off">
  <div class="filter-bar">
    <div class="bar-search"><label for="f-text" class="vh">Search trends</label><input type="search" id="f-text" name="text" value="${esc(f.text)}" placeholder="Search title, summary, standard"></div>
    <button type="button" class="btn btn-compact filter-toggle" id="filter-toggle" aria-expanded="${panelOpen}" aria-controls="filter-panel">Filters<span id="filter-count">${sum.n ? ` (${sum.n})` : ''}</span></button>
    <div class="bar-sort"><label for="f-sort" class="vh">Sort by</label><select id="f-sort" name="sort">${options(sorts, f.sort, null)}</select></div>
    <p id="result-count" class="result-count" role="status" aria-live="polite">${esc(res.count)}</p>
  </div>
  <div class="filter-panel" id="filter-panel">
    <div class="field"><label for="f-category">Category</label><select id="f-category" name="category">${options(tx.categories, f.category, 'All categories')}</select></div>
    ${chipRadios('maturity', 'Maturity', tx.maturity, f.maturity, 'All')}
    ${chipRadios('impact', 'Impact', tx.impact, f.impact, 'All')}
    ${chipRadios('momentum', 'Momentum', tx.momentum, f.momentum, 'All')}
    <div class="panel-actions">${chipCheck('watchOnly', 'f-watch', '★ Watchlist only', f.watchOnly)}<button type="button" class="btn btn-compact" id="clear-filters" data-action="clear-filters"${sum.any ? '' : ' hidden'}>Clear filters</button></div>
  </div>
</form>
<section class="landscape" id="landscape" aria-labelledby="h-landscape"${res.list.length ? '' : ' hidden'}>
  <h2 id="h-landscape">Landscape</h2>
  <p class="small muted">Maturity runs left to right and impact runs bottom to top. Each trend is a link, and the arrow shows momentum. The filters above apply here too.</p>
  <div id="landscape-body">${landscape(res.list, tx)}</div>
</section>
<h2 class="vh">Trends</h2>
<div id="results">${res.html}</div>`
  };
}

export function bindDashboard(root, api) {
  const form = root.querySelector('#filter-form');
  const update = () => {
    const r = dashboardResults();
    root.querySelector('#result-count').textContent = r.count;
    root.querySelector('#results').innerHTML = r.html;
    root.querySelector('#landscape-body').innerHTML = landscape(r.list, state.taxonomy);
    root.querySelector('#landscape').hidden = r.list.length === 0;
    const sum = filterSummary();
    root.querySelector('#filter-count').textContent = sum.n ? ` (${sum.n})` : '';
    root.querySelector('#clear-filters').hidden = !sum.any;
  };
  form.addEventListener('input', () => {
    const d = new FormData(form);
    state.filters = {
      ...state.filters,
      text: String(d.get('text') || ''),
      category: String(d.get('category') || ''),
      maturity: String(d.get('maturity') || ''),
      impact: String(d.get('impact') || ''),
      momentum: String(d.get('momentum') || ''),
      sort: String(d.get('sort') || 'impact'),
      watchOnly: d.get('watchOnly') !== null
    };
    saveFilters();
    update();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  const toggle = root.querySelector('#filter-toggle');
  toggle.addEventListener('click', () => {
    panelOpen = !panelOpen;
    form.classList.toggle('open', panelOpen);
    toggle.setAttribute('aria-expanded', String(panelOpen));
  });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="clear-filters"]');
    if (!btn) return;
    resetFilters();
    api.refresh({ focusSelector: '#f-text' });
  });
}
