// views/trend.js - detail page for one trend: all schema fields, sources, linked recommendations, related trends.
// renderTrend(id) returns null for an unknown id so the router can show the 404 view.

import { state, makeCtx } from '../store.js';
import { sortRecs } from '../filters.js';
import { esc, safeUrl, icon, valueMark, categoryChips, verificationBadge, watchButton, recTable, labelOf } from '../ui.js';

/** "In the news": keyword-matched headlines from the official feeds. Empty string when there are none. */
function newsSection(sig) {
  if (!sig || !sig.items.length) return '';
  const rows = sig.items.map((i) => {
    const url = safeUrl(i.link);
    const title = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}<span class="vh"> (opens in a new tab)</span></a>` : esc(i.title);
    const when = typeof i.published === 'string' ? i.published.slice(0, 10) : '';
    return `<li>${title}<br><span class="small muted">${esc(i.source || '')}${when ? ` &middot; <time datetime="${esc(when)}">${esc(when)}</time>` : ''}</span></li>`;
  }).join('');
  return `<section aria-labelledby="h-news"><h2 id="h-news">In the news</h2><ul class="sources">${rows}</ul>
      <p class="small muted">Matched to this trend by keyword from official feeds. These links are not reviewed and do not change the assessment above.</p></section>`;
}

function sourceItem(s) {
  const url = safeUrl(s.url);
  const title = url
    ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}<span class="vh"> (opens in a new tab)</span></a>`
    : `${esc(s.title)} <span class="muted">(link unavailable)</span>`;
  const published = s.published ? `published ${esc(s.published)}, ` : '';
  return `<li>${title}<br><span class="small muted">${esc(s.publisher)} &middot; ${esc(s.type)} source &middot; ${published}accessed ${esc(s.accessed)}</span></li>`;
}

export function renderTrend(id) {
  const t = state.trendMap.get(id);
  if (!t) return null;
  const ctx = makeCtx();
  const tx = state.taxonomy;
  const list = (arr) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">None listed.</p>');
  const recs = sortRecs(state.recommendations.filter((r) => r.trendIds.includes(t.id)), 'priority');
  const related = (t.relatedTrends || []).map((rid) => state.trendMap.get(rid)).filter(Boolean);
  const verification = t.needsVerification
    ? `<div class="notice" role="note"><strong>Needs verification.</strong> ${esc(t.verificationNotes)}</div>`
    : '';
  return {
    title: t.title,
    html: `<p class="crumb"><a href="#/">${icon('back')} All trends</a></p>
<h1 tabindex="-1">${esc(t.title)}</h1>
<p class="chips">${categoryChips(t, tx)}</p>
<div class="trend-head">
  <dl class="spec-head">
    <div><dt>Status</dt><dd>${valueMark('maturity', t.maturity, tx)}</dd></div>
    <div><dt>Impact</dt><dd>${valueMark('impact', t.impact, tx)}</dd></div>
    <div><dt>Momentum</dt><dd>${valueMark('momentum', t.momentum, tx)}</dd></div>
    <div><dt>This review</dt><dd><time datetime="${esc(t.lastUpdated)}">${esc(t.lastUpdated)}</time>${ctx.isStale(t.lastUpdated) ? ' <span class="badge badge-warn">May be stale</span>' : ''}</dd></div>
  </dl>
  <div class="trend-actions">${verificationBadge(t)}${watchButton(t.id, ctx.isWatched(t.id), t.title)}</div>
</div>
${verification}
<div class="detail">
  <div class="detail-main">
    <section aria-labelledby="h-summary"><h2 id="h-summary">Summary</h2><p class="lead-text">${esc(t.summary)}</p></section>
    <section aria-labelledby="h-why"><h2 id="h-why">Why it matters</h2><p>${esc(t.whyItMatters)}</p></section>
    <section aria-labelledby="h-risks"><h2 id="h-risks">Risks and challenges</h2>${list(t.risks)}</section>
    ${newsSection(ctx.signal(t.id))}
    <section aria-labelledby="h-recs"><h2 id="h-recs">Recommendations</h2>
      ${recs.length ? recTable(recs, ctx, 'Recommendations for this trend') : '<p class="muted">None listed.</p>'}</section>
    <section aria-labelledby="h-rel"><h2 id="h-rel">Related trends</h2>${related.length
      ? `<ul>${related.map((r) => `<li><a href="#/trend/${encodeURIComponent(r.id)}">${esc(r.title)}</a> <span class="muted small">(${esc(labelOf(tx.categories, r.categories[0]))})</span></li>`).join('')}</ul>`
      : '<p class="muted">None listed.</p>'}</section>
  </div>
  <aside class="detail-aside" aria-label="Standards and sources">
    <section aria-labelledby="h-std"><h2 id="h-std">Key standards</h2>${list(t.keyStandards)}</section>
    <section aria-labelledby="h-src"><h2 id="h-src">Sources</h2><ul class="sources">${t.sources.map(sourceItem).join('')}</ul></section>
  </aside>
</div>`
  };
}
