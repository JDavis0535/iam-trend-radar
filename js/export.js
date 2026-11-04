// export.js - builds the Markdown export of the watchlist and its recommendations (DOM-free, deterministic).
// Same input always yields the same output: no timestamps other than dataset metadata; stable ordering.

import { sortRecs } from './filters.js';

/** Escape Markdown-significant characters in inline text and collapse newlines. */
export function mdEscape(value) {
  return String(value ?? '')
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .replace(/([\\`*_{}\[\]<>#|])/g, '\\$1');
}

function label(list, id) {
  const hit = (list || []).find((x) => x.id === id);
  return hit ? hit.label : String(id);
}

/**
 * @param {{trends:object[], recommendations:object[], watchlist:string[]|Set<string>, meta?:object, taxonomy?:object}} input
 * @returns {string} Markdown
 */
export function watchlistToMarkdown({ trends, recommendations, watchlist, meta, taxonomy }) {
  const tax = taxonomy || {};
  const watched = watchlist instanceof Set ? watchlist : new Set(watchlist || []);
  const picked = trends
    .filter((t) => watched.has(t.id))
    .sort((a, b) => String(a.title).localeCompare(String(b.title), 'en', { sensitivity: 'base' }) || String(a.id).localeCompare(String(b.id)));

  const out = [];
  out.push('# IAM Trend Radar watchlist', '');
  if (meta) out.push(`Dataset ${mdEscape(meta.datasetVersion)} (last updated ${mdEscape(meta.lastUpdated)}). ${mdEscape(meta.disclaimer || '')}`.trim(), '');
  if (picked.length === 0) {
    out.push('_No trends on the watchlist._', '');
    return out.join('\n');
  }

  for (const t of picked) {
    out.push(`## ${mdEscape(t.title)}`, '');
    out.push(`- Maturity: ${mdEscape(label(tax.maturity, t.maturity))}`);
    out.push(`- Impact: ${mdEscape(label(tax.impact, t.impact))}`);
    out.push(`- Momentum: ${mdEscape(label(tax.momentum, t.momentum))}`);
    if (t.needsVerification) out.push(`- Needs verification: ${mdEscape(t.verificationNotes)}`);
    out.push('', mdEscape(t.summary), '');
    if (t.sources && t.sources.length) {
      out.push('Sources:', '');
      for (const s of t.sources) {
        out.push(`- [${mdEscape(s.title)}](${encodeMdUrl(s.url)}) (${mdEscape(s.publisher)}, ${mdEscape(s.type)})`);
      }
      out.push('');
    }
    const recs = sortRecs(recommendations.filter((r) => (r.trendIds || []).includes(t.id)), 'priority');
    if (recs.length) {
      out.push('### Recommendations', '');
      for (const r of recs) {
        out.push(`#### ${mdEscape(r.title)}`, '');
        out.push(`- Horizon: ${mdEscape(label(tax.horizon, r.horizon))}`);
        out.push(`- Effort: ${mdEscape(label(tax.effort, r.effort))}`);
        out.push(`- Impact: ${mdEscape(label(tax.impact, r.impact))}`);
        out.push('- Steps:');
        (r.steps || []).forEach((step, i) => out.push(`  ${i + 1}. ${mdEscape(step)}`));
        out.push('');
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n*$/, '\n');
}

function encodeMdUrl(url) {
  // encodeURIComponent leaves ( and ) alone, which would end the Markdown link early; encode them explicitly.
  return String(url ?? '').replace(/[()\s<>]/g, (c) => (c === '(' ? '%28' : c === ')' ? '%29' : encodeURIComponent(c)));
}
