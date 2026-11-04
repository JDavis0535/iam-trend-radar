// views/dashboard.js - filter rail, sortable trend table (or the maturity x impact landscape), and a spec-style
// preview of the selected trend, all driven by one set of filters. Filters live in store.state.filters (persisted),
// so they survive navigation to a trend and back. On narrow screens the rail's filters collapse behind a toggle.

import { state, makeCtx, saveFilters, resetFilters } from '../store.js';
import { filterTrends, sortTrends, countActive } from '../filters.js';
import { esc, icon, ladder, labelOf, trendTable, emptyState, landscape, chipRadios, chipCheck } from '../ui.js';

// View state that should survive the re-render after a watch toggle or "Clear filters". Not persisted across visits.
let panelOpen = false;
let view = 'table';
let selectedId = null;

/** Number of active filters, and whether anything (including search text) can be cleared. */
function filterSummary() {
  const n = countActive(state.filters);
  return { n, any: n > 0 || state.filters.text.trim() !== '' };
}

function results() {
  const list = sortTrends(filterTrends(state.trends, state.filters, state.watch), state.filters.sort);
  if (!list.some((t) => t.id === selectedId)) selectedId = list.length ? list[0].id : null;
  return { list, count: `${list.length} of ${state.trends.length} trends shown` };
}

function panelHtml(list) {
  if (!list.length) return emptyState('No trends match these filters.', '<p><button type="button" class="btn" data-action="clear-filters">Clear filters</button></p>');
  return view === 'landscape' ? landscape(list, state.taxonomy) : trendTable(list, makeCtx(), { selectedId, sortable: true, sort: state.filters.sort });
}

/** Spec-style block for the selected trend (a definition list, like a document's status header). */
function previewHtml() {
  const t = state.trendMap.get(selectedId);
  if (!t) return '<p class="muted">Select a trend to see its status.</p>';
  const tx = state.taxonomy;
  const recs = state.recommendations.filter((r) => r.trendIds.includes(t.id)).length;
  const sources = (t.sources || []).map((s) => esc(s.publisher)).filter((v, i, a) => a.indexOf(v) === i).join(', ');
  return `<h2 class="pv-title">${esc(t.title)}</h2>
<p class="pv-ladder">${ladder(t.maturity, tx)}</p>
<dl class="spec">
  <dt>Status</dt><dd>${esc(labelOf(tx.maturity, t.maturity))}</dd>
  <dt>Impact</dt><dd>${esc(labelOf(tx.impact, t.impact))}</dd>
  <dt>Momentum</dt><dd>${esc(labelOf(tx.momentum, t.momentum))}</dd>
  <dt>This review</dt><dd><time datetime="${esc(t.lastUpdated)}">${esc(t.lastUpdated)}</time></dd>
  <dt>Recommendations</dt><dd>${recs} ranked</dd>
  <dt>Sources</dt><dd>${sources || 'None listed'}</dd>
</dl>
${t.needsVerification ? `<p class="flag">${icon('warn')} Needs verification</p>` : ''}
<p class="pv-sum">${esc(t.summary)}</p>
<p><a class="btn btn-primary" href="#/trend/${encodeURIComponent(t.id)}">Open trend</a></p>`;
}

/** Status filter: radio rows that show the ladder step and how many trends sit at it. */
function statusRadios(f) {
  const tx = state.taxonomy;
  const row = (value, label, count, mark) => `<label class="opt opt-row"><input type="radio" name="maturity" value="${esc(value)}"${value === (f.maturity || '') ? ' checked' : ''}><span>${mark}<b>${esc(label)}</b><em>${count}<span class="vh"> trends</span></em></span></label>`;
  const rows = tx.maturity.map((m) => row(m.id, m.label, state.trends.filter((t) => t.maturity === m.id).length, ladder(m.id, tx)));
  return `<fieldset class="chipset"><legend>Status</legend><div class="opts opts-col">${row('', 'All', state.trends.length, '')}${rows.join('')}</div></fieldset>`;
}

function categorySelect(f) {
  const opts = state.taxonomy.categories.map((c) => `<option value="${esc(c.id)}"${c.id === f.category ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
  return `<div class="field"><label for="f-category">Category</label><select id="f-category" name="category"><option value=""${f.category ? '' : ' selected'}>All categories</option>${opts}</select></div>`;
}

export function renderDashboard() {
  const f = state.filters;
  const tx = state.taxonomy;
  const res = results();
  const sum = filterSummary();
  const flagged = state.trends.filter((t) => t.needsVerification).length;
  const rising = state.trends.filter((t) => t.momentum === 'rising').length;
  return {
    title: 'Dashboard',
    html: `<h1 tabindex="-1">What is changing in identity and access</h1>
<p class="lead">How mature and impactful each trend is, and what to do about it.</p>
<p class="summary-line" aria-label="Dataset summary"><strong>${state.trends.length}</strong> trends, <strong>${state.recommendations.length}</strong> recommendations, <strong>${rising}</strong> with rising momentum${flagged ? `, <strong>${flagged}</strong> needing verification` : ''}. Data updated <time datetime="${esc(state.meta.lastUpdated)}">${esc(state.meta.lastUpdated)}</time>.</p>
<form class="dash${panelOpen ? ' open' : ''}" data-view="${view}" id="filter-form" role="search" aria-label="Filter trends" autocomplete="off">
  <aside class="rail" aria-label="Filters">
    <div class="rail-search">
      <label for="f-text" class="vh">Search trends</label>
      <input type="search" id="f-text" name="text" value="${esc(f.text)}" placeholder="Search trends">
      <button type="button" class="btn btn-compact filter-toggle" id="filter-toggle" aria-expanded="${panelOpen}" aria-controls="filter-panel">Filters<span id="filter-count">${sum.n ? ` (${sum.n})` : ''}</span></button>
    </div>
    <div class="filter-panel" id="filter-panel">
      ${statusRadios(f)}
      ${chipRadios('impact', 'Impact', tx.impact, f.impact, 'All')}
      ${chipRadios('momentum', 'Momentum', tx.momentum, f.momentum, 'All')}
      ${categorySelect(f)}
      <div class="panel-actions">${chipCheck('watchOnly', 'f-watch', 'Watchlist only', f.watchOnly, 'star')}<button type="button" class="btn btn-compact" id="clear-filters" data-action="clear-filters"${sum.any ? '' : ' hidden'}>Clear filters</button></div>
    </div>
  </aside>
  <div class="dash-main">
    <div class="dash-bar">
      <div class="tabs" role="tablist" aria-label="View">
        <button type="button" role="tab" id="tab-table" data-view="table" aria-selected="${view === 'table'}" aria-controls="results" tabindex="${view === 'table' ? 0 : -1}">Table</button>
        <button type="button" role="tab" id="tab-landscape" data-view="landscape" aria-selected="${view === 'landscape'}" aria-controls="results" tabindex="${view === 'landscape' ? 0 : -1}">Landscape</button>
      </div>
      <p id="result-count" class="result-count" role="status" aria-live="polite">${esc(res.count)}</p>
    </div>
    <h2 class="vh">Trends</h2>
    <div id="results" role="tabpanel" aria-labelledby="tab-${view}">${panelHtml(res.list)}</div>
  </div>
  <aside class="preview" id="preview" aria-label="Selected trend">${previewHtml()}</aside>
</form>`
  };
}

export function bindDashboard(root, api) {
  const form = root.querySelector('#filter-form');
  const update = () => {
    const r = results();
    root.querySelector('#result-count').textContent = r.count;
    root.querySelector('#results').innerHTML = panelHtml(r.list);
    root.querySelector('#preview').innerHTML = previewHtml();
    const sum = filterSummary();
    root.querySelector('#filter-count').textContent = sum.n ? ` (${sum.n})` : '';
    root.querySelector('#clear-filters').hidden = !sum.any;
  };
  const select = (id) => {
    if (!id || id === selectedId) return;
    selectedId = id;
    root.querySelectorAll('.trow').forEach((row) => { if (row.dataset.trend === id) row.dataset.selected = 'true'; else delete row.dataset.selected; });
    root.querySelector('#preview').innerHTML = previewHtml();
  };
  const setView = (next, focus) => {
    view = next;
    root.querySelectorAll('[role="tab"]').forEach((tab) => {
      const on = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    root.querySelector('#results').setAttribute('aria-labelledby', `tab-${view}`);
    form.dataset.view = view;
    update();
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
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) {
      state.filters = { ...state.filters, sort: sortBtn.dataset.sort };
      saveFilters();
      update();
      const again = root.querySelector(`[data-sort="${CSS.escape(sortBtn.dataset.sort)}"]`);
      if (again) again.focus();
      return;
    }
    const tab = e.target.closest('[role="tab"]');
    if (tab) { setView(tab.dataset.view, false); return; }
    const row = e.target.closest('.trow');
    if (row && !e.target.closest('a, button')) { select(row.dataset.trend); return; }
    if (e.target.closest('[data-action="clear-filters"]')) {
      resetFilters();
      api.refresh({ focusSelector: '#f-text' });
    }
  });
  root.addEventListener('focusin', (e) => {
    const row = e.target.closest && e.target.closest('.trow');
    if (row) select(row.dataset.trend);
  });
  root.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    setView(view === 'table' ? 'landscape' : 'table', true);
  });
}
