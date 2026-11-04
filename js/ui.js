// ui.js - shared rendering helpers: HTML escaping, URL safety, badges, cards, option lists.
// All data fields must pass through esc() before being placed in an HTML string. No DOM access at import time.

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

/** Escape a value for safe use in HTML text or attribute values. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => ESC_MAP[c]);
}

/** Returns the URL only if it is a parseable https:// URL; otherwise ''. */
export function safeUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return '';
  try { new URL(url); return url; } catch { return ''; }
}

/** Plain-text label lookup in a taxonomy list. */
export function labelOf(list, id) {
  const hit = (list || []).find((x) => x.id === id);
  return hit ? hit.label : String(id ?? '');
}

// Icons are drawn as inline SVG on one 16px grid with a 1.75 stroke, not as Unicode glyphs, which change shape from
// font to font. The paths are static strings and nothing from the data ever reaches them. Names double as the
// taxonomy ids for maturity, momentum and horizon, so a badge looks its icon up by id.
const RING = '<circle cx="8" cy="8" r="6"/>';
const ICON_PATHS = {
  emerging: `${RING}<path d="M8 8V3A5 5 0 0 1 13 8z" fill="currentColor" stroke="none"/>`,
  growing: `${RING}<path d="M8 8V3A5 5 0 0 1 8 13z" fill="currentColor" stroke="none"/>`,
  mainstream: `${RING}<path d="M8 8V3A5 5 0 1 1 3 8z" fill="currentColor" stroke="none"/>`,
  established: `${RING}<circle cx="8" cy="8" r="3.6" fill="currentColor" stroke="none"/>`,
  rising: '<path d="M4.5 11.5l7-7M5.5 4.5h6v6"/>',
  steady: '<path d="M3 8h9.5M9 4.5L12.5 8 9 11.5"/>',
  cooling: '<path d="M4.5 4.5l7 7M5.5 11.5h6v-6"/>',
  now: '<circle cx="3" cy="8" r="1.15" fill="currentColor"/><circle cx="8" cy="8" r="1.15"/><circle cx="13" cy="8" r="1.15"/>',
  next: '<circle cx="3" cy="8" r="1.15"/><circle cx="8" cy="8" r="1.15" fill="currentColor"/><circle cx="13" cy="8" r="1.15"/>',
  later: '<circle cx="3" cy="8" r="1.15"/><circle cx="8" cy="8" r="1.15"/><circle cx="13" cy="8" r="1.15" fill="currentColor"/>',
  star: '<path d="M8 1.9l1.85 3.9 4.25.55-3.1 2.95.8 4.25L8 11.45 4.2 13.55l.8-4.25-3.1-2.95 4.25-.55z"/>',
  warn: '<path d="M8 2.2l6.2 11H1.8z"/><path d="M8 6.4v3.2M8 11.6v.1"/>',
  back: '<path d="M10 3.5L5.5 8l4.5 4.5"/>'
};

/** Inline SVG icon by name; '' for an unknown name. Always decorative (aria-hidden). */
export function icon(name, cls = '') {
  if (!Object.prototype.hasOwnProperty.call(ICON_PATHS, name)) return '';
  return `<svg class="ico${cls ? ` ${esc(cls)}` : ''}" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;
}

// Impact and effort are drawn as small CSS meters (filled bars) rather than block characters, which render
// inconsistently across fonts. level = filled bars, total = bars drawn.
const METER = { impact: { total: 4, level: { low: 1, medium: 2, high: 3, transformative: 4 } }, effort: { total: 3, level: { low: 1, medium: 2, high: 3 } } };

function meter(kind, id) {
  const m = METER[kind];
  const n = (m && m.level[id]) || 0;
  return `<span class="bars" aria-hidden="true">${Array.from({ length: m.total }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}</span>`;
}

const KIND_LABELS = { maturity: 'Maturity', impact: 'Impact', momentum: 'Momentum', horizon: 'Horizon', effort: 'Effort' };

/** Badge with a drawn icon or meter, a visible text label and a screen-reader prefix. Never color-only. */
export function badge(kind, id, taxonomy) {
  const text = labelOf(taxonomy && taxonomy[kind], id);
  const glyph = METER[kind] ? meter(kind, id) : icon(id);
  return `<span class="badge badge-${esc(kind)} badge-v-${esc(id)}"><span aria-hidden="true">${glyph}</span> <span class="vh">${esc(KIND_LABELS[kind] || kind)}: </span>${esc(text)}</span>`;
}

export function categoryChips(item, taxonomy) {
  return (item.categories || []).map((c) => `<span class="chip">${esc(labelOf(taxonomy.categories, c))}</span>`).join(' ');
}

export function verificationBadge(item) {
  if (!item.needsVerification) return '';
  return `<span class="badge badge-warn">${icon('warn')} Needs verification</span>`;
}

export function watchButton(id, watched, title) {
  return `<button type="button" class="btn btn-watch" data-watch="${esc(id)}" aria-pressed="${watched ? 'true' : 'false'}" aria-label="Watch ${esc(title)}">${icon('star')}<span>${watched ? 'Watching' : 'Watch'}</span></button>`;
}

export function dateLine(item, stale) {
  return `<span class="muted">Updated <time datetime="${esc(item.lastUpdated)}">${esc(item.lastUpdated)}</time></span>${stale ? ' <span class="badge badge-warn">May be stale</span>' : ''}`;
}

/** ctx: { taxonomy, isWatched(id), isStale(date) } */
export function trendCard(t, ctx) {
  const watched = ctx.isWatched(t.id);
  return `<li class="card">
  <h3 class="card-title"><a href="#/trend/${encodeURIComponent(t.id)}">${esc(t.title)}</a></h3>
  <p class="chips">${categoryChips(t, ctx.taxonomy)}</p>
  <p class="badges">${badge('maturity', t.maturity, ctx.taxonomy)} ${badge('impact', t.impact, ctx.taxonomy)} ${badge('momentum', t.momentum, ctx.taxonomy)} ${verificationBadge(t)}</p>
  <p>${esc(t.summary)}</p>
  <div class="card-foot"><p class="small">${dateLine(t, ctx.isStale(t.lastUpdated))}</p>${watchButton(t.id, watched, t.title)}</div>
</li>`;
}

/** Recommendation card. ctx adds: trendById(id), score(rec), recById(id) */
export function recCard(r, ctx) {
  const tx = ctx.taxonomy;
  const links = (r.trendIds || []).map((id) => {
    const t = ctx.trendById(id);
    return t ? `<a href="#/trend/${encodeURIComponent(id)}">${esc(t.title)}</a>` : esc(id);
  }).join(', ');
  const deps = (r.dependencies || []).map((d) => {
    const dep = ctx.recById(d);
    return `<li>${dep ? esc(dep.title) : esc(d)}</li>`;
  }).join('');
  const list = (arr) => (arr || []).map((s) => `<li>${esc(s)}</li>`).join('');
  return `<li class="card rec">
  <h3 class="card-title">${esc(r.title)}</h3>
  <p class="badges">${badge('horizon', r.horizon, tx)} ${badge('effort', r.effort, tx)} ${badge('impact', r.impact, tx)} <span class="badge"><span class="vh">Priority score: </span>Priority ${ctx.score(r)}</span></p>
  <p>${esc(r.description)}</p>
  <p class="small">Trends: ${links}</p>
  <details><summary>Steps, metrics and dependencies</summary>
    <h4>Steps</h4><ol>${list(r.steps)}</ol>
    <h4>Success metrics</h4><ul>${list(r.successMetrics)}</ul>
    ${deps ? `<h4>Dependencies</h4><ul>${deps}</ul>` : ''}
    <p class="small">Audience: ${esc((r.audience || []).join(', '))}</p>
  </details>
  <p class="small">${dateLine(r, ctx.isStale(r.lastUpdated))}</p>
</li>`;
}

/** <option> list with a leading "all" option (omitted when allLabel is null). items: [{id,label}] */
export function options(items, selected, allLabel) {
  const opts = allLabel == null ? [] : [`<option value=""${selected ? '' : ' selected'}>${esc(allLabel)}</option>`];
  for (const it of items) opts.push(`<option value="${esc(it.id)}"${it.id === selected ? ' selected' : ''}>${esc(it.label)}</option>`);
  return opts.join('');
}

/**
 * Maturity x impact landscape as an accessible table (columns: maturity, rows: impact, top = highest).
 * Each trend is a link; momentum shows as an arrow plus screen-reader text. Returns '' when there are no trends.
 */
export function landscape(trends, tx) {
  if (!trends.length) return '';
  const cols = tx.maturity;
  const rows = [...tx.impact].reverse();
  const dot = (t) => `<a class="dot dot-${esc(t.momentum)}" href="#/trend/${encodeURIComponent(t.id)}">${icon(t.momentum)} ${esc(t.title)}<span class="vh"> (Momentum: ${esc(labelOf(tx.momentum, t.momentum))})</span></a>`;
  const body = rows.map((imp) => {
    const cells = cols.map((mat) => {
      const ts = trends.filter((t) => t.maturity === mat.id && t.impact === imp.id);
      return { mat, ts };
    });
    const any = cells.some((c) => c.ts.length);
    return `<tr class="imp-${esc(imp.id)}${any ? '' : ' row-empty'}"><th scope="row">${esc(imp.label)}</th>${cells.map((c) => `<td data-label="${esc(c.mat.label)}"${c.ts.length ? '' : ' class="empty-cell"'}>${c.ts.map(dot).join('')}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="matrix"><caption class="vh">Trends by maturity (columns) and impact (rows)</caption><thead><tr><td class="corner"></td>${cols.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Radio group drawn as chips: a fieldset with a legend, an "all" option (value "") and one option per item. */
export function chipRadios(name, legend, items, selected, allLabel) {
  const opt = (value, label) => `<label class="opt"><input type="radio" name="${esc(name)}" value="${esc(value)}"${value === (selected || '') ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  return `<fieldset class="chipset"><legend>${esc(legend)}</legend><div class="opts">${opt('', allLabel)}${items.map((it) => opt(it.id, it.label)).join('')}</div></fieldset>`;
}

/** Single checkbox drawn as a toggle chip. */
export function chipCheck(name, id, label, checked, iconName) {
  return `<label class="opt"><input type="checkbox" id="${esc(id)}" name="${esc(name)}"${checked ? ' checked' : ''}><span>${iconName ? icon(iconName) : ''}${esc(label)}</span></label>`;
}

export function emptyState(message, actionHtml) {
  return `<div class="empty"><p>${esc(message)}</p>${actionHtml || ''}</div>`;
}
