// views/playbook.js - all recommendations with computed priority score, filters, sort and a Quick wins preset.

import { state, makeCtx } from '../store.js';
import { filterRecs, sortRecs, defaultRecFilters } from '../filters.js';
import { esc, options, recCard, emptyState } from '../ui.js';

function playbookResults() {
  const ctx = makeCtx();
  const list = sortRecs(filterRecs(state.recommendations, state.recFilters), state.recFilters.sort);
  const count = `${list.length} of ${state.recommendations.length} recommendations shown`;
  const html = list.length
    ? `<ol class="grid" aria-label="Recommendations">${list.map((r) => recCard(r, ctx)).join('')}</ol>`
    : emptyState('No recommendations match these filters.', '<p><button type="button" class="btn" data-action="clear-rec-filters">Clear filters</button></p>');
  return { count, html };
}

export function renderPlaybook() {
  const f = state.recFilters;
  const tx = state.taxonomy;
  const res = playbookResults();
  const trendOpts = [...state.trends].sort((a, b) => a.title.localeCompare(b.title)).map((t) => ({ id: t.id, label: t.title }));
  const sorts = [
    { id: 'priority', label: 'Priority score (high first)' },
    { id: 'horizon', label: 'Horizon (soonest first)' },
    { id: 'title', label: 'Title (A-Z)' }
  ];
  return {
    title: 'Playbook',
    html: `<h1 tabindex="-1">Playbook</h1>
<p class="lead">Recommendations linked to trends. Priority score = impact rank x 2 minus effort rank (see <a href="#/about">About</a>); higher is better.</p>
<form class="filters" id="rec-form" role="search" aria-label="Filter recommendations" autocomplete="off">
  <div class="field"><label for="p-horizon">Horizon</label><select id="p-horizon" name="horizon">${options(tx.horizon, f.horizon, 'All horizons')}</select></div>
  <div class="field"><label for="p-effort">Effort</label><select id="p-effort" name="effort">${options(tx.effort, f.effort, 'All efforts')}</select></div>
  <div class="field"><label for="p-impact">Impact</label><select id="p-impact" name="impact">${options(tx.impact, f.impact, 'All impacts')}</select></div>
  <div class="field"><label for="p-trend">Trend</label><select id="p-trend" name="trendId">${options(trendOpts, f.trendId, 'All trends')}</select></div>
  <div class="field"><label for="p-sort">Sort by</label><select id="p-sort" name="sort">${options(sorts, f.sort, null)}</select></div>
  <div class="field field-check"><label><input type="checkbox" id="p-quick" name="quickWins"${f.quickWins ? ' checked' : ''}> Quick wins (low effort, high or transformative impact)</label></div>
  <div class="field field-check"><button type="button" class="btn" data-action="clear-rec-filters">Clear filters</button></div>
</form>
<p id="result-count" class="result-count" role="status" aria-live="polite">${esc(res.count)}</p>
<h2 class="vh">Recommendations</h2>
<div id="results">${res.html}</div>`
  };
}

export function bindPlaybook(root, api) {
  const form = root.querySelector('#rec-form');
  form.addEventListener('input', () => {
    const d = new FormData(form);
    state.recFilters = {
      horizon: String(d.get('horizon') || ''),
      effort: String(d.get('effort') || ''),
      impact: String(d.get('impact') || ''),
      trendId: String(d.get('trendId') || ''),
      sort: String(d.get('sort') || 'priority'),
      quickWins: d.get('quickWins') !== null
    };
    const r = playbookResults();
    root.querySelector('#result-count').textContent = r.count;
    root.querySelector('#results').innerHTML = r.html;
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="clear-rec-filters"]')) return;
    state.recFilters = defaultRecFilters();
    api.refresh({ focusSelector: '#p-horizon' });
  });
}
