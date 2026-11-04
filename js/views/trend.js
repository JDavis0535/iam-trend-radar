// views/trend.js - detail page for one trend: all schema fields, sources, linked recommendations, related trends.
// renderTrend(id) returns null for an unknown id so the router can show the 404 view.

import { state, makeCtx } from '../store.js';
import { sortRecs } from '../filters.js';
import { esc, safeUrl, badge, categoryChips, verificationBadge, watchButton, dateLine, recCard, labelOf } from '../ui.js';

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
    html: `<p class="crumb"><a href="#/">&larr; All trends</a></p>
<h1 tabindex="-1">${esc(t.title)}</h1>
<p class="chips">${categoryChips(t, tx)}</p>
<p class="badges">${badge('maturity', t.maturity, tx)} ${badge('impact', t.impact, tx)} ${badge('momentum', t.momentum, tx)} ${verificationBadge(t)}</p>
<p class="small">${dateLine(t, ctx.isStale(t.lastUpdated))}</p>
<p>${watchButton(t.id, ctx.isWatched(t.id), t.title)}</p>
${verification}
<section aria-labelledby="h-summary"><h2 id="h-summary">Summary</h2><p>${esc(t.summary)}</p></section>
<section aria-labelledby="h-why"><h2 id="h-why">Why it matters</h2><p>${esc(t.whyItMatters)}</p></section>
<section aria-labelledby="h-risks"><h2 id="h-risks">Risks and challenges</h2>${list(t.risks)}</section>
<section aria-labelledby="h-std"><h2 id="h-std">Key standards</h2>${list(t.keyStandards)}</section>
<section aria-labelledby="h-recs"><h2 id="h-recs">Recommendations</h2>
  <ul class="grid" aria-label="Recommendations for this trend">${recs.map((r) => recCard(r, ctx)).join('')}</ul></section>
<section aria-labelledby="h-src"><h2 id="h-src">Sources</h2><ul class="sources">${t.sources.map(sourceItem).join('')}</ul></section>
<section aria-labelledby="h-rel"><h2 id="h-rel">Related trends</h2>${related.length
      ? `<ul>${related.map((r) => `<li><a href="#/trend/${encodeURIComponent(r.id)}">${esc(r.title)}</a> <span class="muted small">(${esc(labelOf(tx.categories, r.categories[0]))})</span></li>`).join('')}</ul>`
      : '<p class="muted">None listed.</p>'}</section>`
  };
}
