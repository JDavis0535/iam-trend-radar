// views/playbook.js - all recommendations as ranked rows with computed priority score, a sticky filter bar
// (horizon / effort / impact chips, trend, sort, Quick wins preset) that collapses behind a toggle on narrow screens.

import { state, makeCtx } from '../store.js';
import { filterRecs, sortRecs, defaultRecFilters, countActiveRecs } from '../filters.js';
import { esc, options, recTable, emptyState, chipRadios, chipCheck } from '../ui.js';

// Whether the filter panel is open on narrow screens (always shown on wide ones). Module-level so it survives re-renders.
let recPanelOpen = false;

function playbookResults() {
  const ctx = makeCtx();
  const list = sortRecs(filterRecs(state.recommendations, state.recFilters), state.recFilters.sort);
  const count = `${list.length} of ${state.recommendations.length} recommendations shown`;
  const html = list.length
    ? recTable(list, ctx)
    : emptyState('No recommendations match these filters.', '<p><button type="button" class="btn" data-action="clear-rec-filters">Clear filters</button></p>');
  return { count, html };
}

export function renderPlaybook() {
  const f = state.recFilters;
  const tx = state.taxonomy;
  const res = playbookResults();
  const n = countActiveRecs(f);
  const trendOpts = [...state.trends].sort((a, b) => a.title.localeCompare(b.title)).map((t) => ({ id: t.id, label: t.title }));
  const sorts = [
    { id: 'priority', label: 'Priority score (high first)' },
    { id: 'horizon', label: 'Horizon (soonest first)' },
    { id: 'title', label: 'Title (A-Z)' }
  ];
  return {
    title: 'Playbook',
    html: `<h1 tabindex="-1">Playbook</h1>
<p class="lead">Recommendations linked to trends. Priority score = impact rank x 2 minus effort rank (see <a href="#/about">About</a>); higher is better. Quick wins are low effort with high or transformative impact.</p>
<form class="dash-filters${recPanelOpen ? ' open' : ''}" id="rec-form" role="search" aria-label="Filter recommendations" autocomplete="off">
  <div class="filter-bar">
    <button type="button" class="btn btn-compact filter-toggle" id="rec-toggle" aria-expanded="${recPanelOpen}" aria-controls="rec-panel">Filters<span id="rec-count">${n ? ` (${n})` : ''}</span></button>
    <div class="bar-sort"><label for="p-sort" class="vh">Sort by</label><select id="p-sort" name="sort">${options(sorts, f.sort, null)}</select></div>
    <p id="result-count" class="result-count" role="status" aria-live="polite">${esc(res.count)}</p>
  </div>
  <div class="filter-panel" id="rec-panel">
    ${chipRadios('horizon', 'Horizon', tx.horizon, f.horizon, 'All')}
    ${chipRadios('effort', 'Effort', tx.effort, f.effort, 'All')}
    ${chipRadios('impact', 'Impact', tx.impact, f.impact, 'All')}
    <div class="field"><label for="p-trend">Trend</label><select id="p-trend" name="trendId">${options(trendOpts, f.trendId, 'All trends')}</select></div>
    <div class="panel-actions">${chipCheck('quickWins', 'p-quick', 'Quick wins', f.quickWins)}<button type="button" class="btn btn-compact" id="rec-clear" data-action="clear-rec-filters"${n ? '' : ' hidden'}>Clear filters</button></div>
  </div>
</form>
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
    const n = countActiveRecs(state.recFilters);
    root.querySelector('#rec-count').textContent = n ? ` (${n})` : '';
    root.querySelector('#rec-clear').hidden = n === 0;
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  const toggle = root.querySelector('#rec-toggle');
  toggle.addEventListener('click', () => {
    recPanelOpen = !recPanelOpen;
    form.classList.toggle('open', recPanelOpen);
    toggle.setAttribute('aria-expanded', String(recPanelOpen));
  });
  root.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="clear-rec-filters"]')) return;
    state.recFilters = defaultRecFilters();
    api.refresh({ focusSelector: '#p-sort' });
  });
}
