// filters.js - pure (DOM-free) filter, sort and priority-score functions for trends and recommendations.
// Imported by the views and by Node unit tests. Rank tables mirror data/taxonomy.json.

export const IMPACT_RANK = { low: 1, medium: 2, high: 3, transformative: 4 };
export const EFFORT_RANK = { low: 1, medium: 2, high: 3 };
export const MATURITY_RANK = { emerging: 1, growing: 2, mainstream: 3, established: 4 };
export const HORIZON_RANK = { now: 1, next: 2, later: 3 };

export const TREND_SORTS = ['impact', 'maturity', 'updated', 'title'];
export const REC_SORTS = ['priority', 'title', 'horizon'];

export function defaultFilters() {
  return { category: '', maturity: '', impact: '', momentum: '', text: '', watchOnly: false, sort: 'impact' };
}

export function defaultRecFilters() {
  return { horizon: '', effort: '', impact: '', trendId: '', quickWins: false, sort: 'priority' };
}

function cmpText(a, b) {
  return String(a).localeCompare(String(b), 'en', { sensitivity: 'base' });
}

/** Filters combine with AND. watchSet is a Set (or array) of watched trend ids. */
export function filterTrends(trends, filters, watchSet) {
  const f = { ...defaultFilters(), ...(filters || {}) };
  const watched = watchSet instanceof Set ? watchSet : new Set(watchSet || []);
  const q = String(f.text || '').trim().toLowerCase();
  return trends.filter((t) => {
    if (f.category && !(t.categories || []).includes(f.category)) return false;
    if (f.maturity && t.maturity !== f.maturity) return false;
    if (f.impact && t.impact !== f.impact) return false;
    if (f.momentum && t.momentum !== f.momentum) return false;
    if (f.watchOnly && !watched.has(t.id)) return false;
    if (q) {
      const hay = [t.title, t.summary, t.whyItMatters, ...(t.categories || []), ...(t.keyStandards || [])].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
}

/** Returns a new sorted array. impact/maturity/updated sort descending; title ascending. Ties: title. */
export function sortTrends(trends, key) {
  const arr = [...trends];
  const by = {
    impact: (a, b) => (IMPACT_RANK[b.impact] || 0) - (IMPACT_RANK[a.impact] || 0),
    maturity: (a, b) => (MATURITY_RANK[b.maturity] || 0) - (MATURITY_RANK[a.maturity] || 0),
    updated: (a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)),
    title: () => 0
  };
  const primary = by[key] || by.title;
  return arr.sort((a, b) => primary(a, b) || cmpText(a.title, b.title));
}

/** Priority = impactRank*2 - effortRank (impact low=1..transformative=4, effort low=1..high=3). */
export function priorityScore(rec) {
  return (IMPACT_RANK[rec.impact] || 0) * 2 - (EFFORT_RANK[rec.effort] || 0);
}

/** Quick win = low effort and high or transformative impact. */
export function isQuickWin(rec) {
  return rec.effort === 'low' && (rec.impact === 'high' || rec.impact === 'transformative');
}

export function filterRecs(recs, filters) {
  const f = { ...defaultRecFilters(), ...(filters || {}) };
  return recs.filter((r) => {
    if (f.horizon && r.horizon !== f.horizon) return false;
    if (f.effort && r.effort !== f.effort) return false;
    if (f.impact && r.impact !== f.impact) return false;
    if (f.trendId && !(r.trendIds || []).includes(f.trendId)) return false;
    if (f.quickWins && !isQuickWin(r)) return false;
    return true;
  });
}

/** priority: score desc, then horizon (now first), then title. */
export function sortRecs(recs, key) {
  const arr = [...recs];
  const byHorizon = (a, b) => (HORIZON_RANK[a.horizon] || 9) - (HORIZON_RANK[b.horizon] || 9);
  const byTitle = (a, b) => cmpText(a.title, b.title);
  if (key === 'title') return arr.sort(byTitle);
  if (key === 'horizon') return arr.sort((a, b) => byHorizon(a, b) || priorityScore(b) - priorityScore(a) || byTitle(a, b));
  return arr.sort((a, b) => priorityScore(b) - priorityScore(a) || byHorizon(a, b) || byTitle(a, b));
}

/** True when lastUpdated (YYYY-MM-DD) is more than `days` before `now` (Date). */
export function isStale(lastUpdated, now = new Date(), days = 180) {
  const d = new Date(String(lastUpdated) + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  return (now.getTime() - d.getTime()) / 86400000 > days;
}
