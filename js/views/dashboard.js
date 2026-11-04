// views/dashboard.js - trend card grid with combined filters, search, sort and a live result count.
// Filters live in store.state.filters (persisted), so they survive navigation to a trend and back.

import { state, makeCtx, saveFilters, resetFilters } from '../store.js';
import { filterTrends, sortTrends } from '../filters.js';
import { esc, options, trendCard, emptyState } from '../ui.js';

function dashboardResults() {
  const ctx = makeCtx();
  const list = sortTrends(filterTrends(state.trends, state.filters, state.watch), state.filters.sort);
  const count = `${list.length} of ${state.trends.length} trends shown`;
  const html = list.length
    ? `<ul class="grid" aria-label="Trends">${list.map((t) => trendCard(t, ctx)).join('')}</ul>`
    : emptyState('No trends match these filters.', '<p><button type="button" class="btn" data-action="clear-filters">Clear filters</button></p>');
  return { count, html };
}

export function renderDashboard() {
  const f = state.filters;
  const tx = state.taxonomy;
  const res = dashboardResults();
  const flagged = state.trends.filter((t) => t.needsVerification).length;
  const sorts = [
    { id: 'impact', label: 'Impact (high first)' },
    { id: 'maturity', label: 'Maturity (most mature first)' },
    { id: 'updated', label: 'Recently updated' },
    { id: 'title', label: 'Title (A-Z)' }
  ];
  return {
    title: 'Dashboard',
    html: `<h1 tabindex="-1">IAM Trend Radar</h1>
<p class="lead">What is changing in identity and access management, how mature and impactful it is, and what to do about it.</p>
<ul class="stats" aria-label="Dataset summary">
  <li><strong>${state.trends.length}</strong> trends</li>
  <li><strong>${state.recommendations.length}</strong> recommendations</li>
  <li><strong>${flagged}</strong> need verification</li>
  <li>Data updated <strong>${esc(state.meta.lastUpdated)}</strong></li>
</ul>
<form class="filters" id="filter-form" role="search" aria-label="Filter trends" autocomplete="off">
  <div class="field field-wide"><label for="f-text">Search</label><input type="search" id="f-text" name="text" value="${esc(f.text)}" placeholder="Title, summary, standard"></div>
  <div class="field"><label for="f-category">Category</label><select id="f-category" name="category">${options(tx.categories, f.category, 'All categories')}</select></div>
  <div class="field"><label for="f-maturity">Maturity</label><select id="f-maturity" name="maturity">${options(tx.maturity, f.maturity, 'All maturities')}</select></div>
  <div class="field"><label for="f-impact">Impact</label><select id="f-impact" name="impact">${options(tx.impact, f.impact, 'All impacts')}</select></div>
  <div class="field"><label for="f-momentum">Momentum</label><select id="f-momentum" name="momentum">${options(tx.momentum, f.momentum, 'All momentum')}</select></div>
  <div class="field"><label for="f-sort">Sort by</label><select id="f-sort" name="sort">${options(sorts, f.sort, null)}</select></div>
  <div class="field field-check"><label><input type="checkbox" id="f-watch" name="watchOnly"${f.watchOnly ? ' checked' : ''}> Watchlist only</label></div>
  <div class="field field-check"><button type="button" class="btn" data-action="clear-filters">Clear filters</button></div>
</form>
<p id="result-count" class="result-count" role="status" aria-live="polite">${esc(res.count)}</p>
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
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="clear-filters"]');
    if (!btn) return;
    resetFilters();
    api.refresh({ focusSelector: '#f-text' });
  });
}
