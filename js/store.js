// store.js - data loading (window.IAM_DATA bundle first, fetch fallback) and safe localStorage state.
// Every storage access is wrapped in try/catch; the app keeps working in memory if storage is unavailable.

import { defaultFilters, defaultRecFilters, TREND_SORTS, isStale, priorityScore } from './filters.js';

export const WATCH_KEY = 'iamradar.watchlist.v1';
export const FILTER_KEY = 'iamradar.filters.v1';

export const state = {
  meta: null,
  taxonomy: null,
  trends: [],
  recommendations: [],
  trendMap: new Map(),
  recMap: new Map(),
  signals: new Map(), // trendId -> { count30, count90, lastSignal, items[] } from data/signals.json (empty if unavailable)
  signalsAt: '',
  watch: new Set(),
  filters: defaultFilters(),
  recFilters: defaultRecFilters(),
  storageOk: true
};

function storageGet(key) {
  try { return globalThis.localStorage.getItem(key); } catch { state.storageOk = false; return null; }
}
function storageSet(key, value) {
  try { globalThis.localStorage.setItem(key, value); return true; } catch { state.storageOk = false; return false; }
}

async function fetchJson(name) {
  const res = await fetch(`data/${name}.json`);
  if (!res.ok) throw new Error(`Could not load data/${name}.json (HTTP ${res.status})`);
  return res.json();
}

/** Loads the dataset. Throws an Error with a user-facing message on failure. */
export async function loadData() {
  let raw = globalThis.IAM_DATA;
  if (!raw) {
    try {
      const [meta, taxonomy, trends, recommendations] = await Promise.all(['meta', 'taxonomy', 'trends', 'recommendations'].map(fetchJson));
      raw = { meta, taxonomy, trends, recommendations };
    } catch (e) {
      throw new Error(`The data could not be loaded (${e.message}).`);
    }
  }
  if (!raw || !Array.isArray(raw.trends) || !Array.isArray(raw.recommendations) || !raw.taxonomy || !raw.meta) {
    throw new Error('The data is incomplete or malformed.');
  }
  state.meta = raw.meta;
  state.taxonomy = raw.taxonomy;
  state.trends = raw.trends;
  state.recommendations = raw.recommendations;
  state.trendMap = new Map(raw.trends.map((t) => [t.id, t]));
  state.recMap = new Map(raw.recommendations.map((r) => [r.id, r]));
  loadWatchlist();
  loadFilters();
}

export const SIGNALS_MAX_AGE_DAYS = 14;

/** Pure: validates a parsed signals.json against the known trend ids. Returns a Map, or null if unusable or too old. */
export function parseSignals(raw, trendIds, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || !raw.trends || typeof raw.trends !== 'object') return null;
  const at = Date.parse(raw.generatedAt);
  if (Number.isNaN(at) || now - at > SIGNALS_MAX_AGE_DAYS * 86400000) return null;
  const out = new Map();
  for (const id of trendIds) {
    const s = raw.trends[id];
    if (!s || !Number.isFinite(s.count30) || !Number.isFinite(s.count90) || !Array.isArray(s.items)) continue;
    const items = s.items.filter((i) => i && typeof i.title === 'string' && typeof i.link === 'string').slice(0, 5);
    out.set(id, { count30: s.count30, count90: s.count90, lastSignal: typeof s.lastSignal === 'string' ? s.lastSignal : null, items });
  }
  return out;
}

/**
 * Loads the derived headline signals (data/signals.json, rebuilt by the scheduled workflow). Optional: it needs
 * http(s), is ignored when missing or older than SIGNALS_MAX_AGE_DAYS, never throws, and gives up after timeoutMs
 * so a slow request can never block the first render. Returns true when signals were loaded.
 */
export async function loadSignals(timeoutMs = 3000) {
  state.signals = new Map();
  state.signalsAt = '';
  try {
    if (globalThis.location && globalThis.location.protocol === 'file:') return false;
    const res = await fetch('data/signals.json', { cache: 'no-cache', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return false;
    const raw = await res.json();
    const map = parseSignals(raw, [...state.trendMap.keys()]);
    if (!map) return false;
    state.signals = map;
    state.signalsAt = raw.generatedAt;
    return true;
  } catch { return false; }
}

function loadWatchlist() {
  state.watch = new Set();
  const raw = storageGet(WATCH_KEY);
  if (!raw) return;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((id) => { if (state.trendMap.has(id)) state.watch.add(id); });
  } catch { /* ignore corrupt value */ }
}

function saveWatchlist() { storageSet(WATCH_KEY, JSON.stringify([...state.watch])); }

export function isWatched(id) { return state.watch.has(id); }

/** Toggles a trend in the watchlist; returns the new watched state. */
export function toggleWatch(id) {
  if (!state.trendMap.has(id)) return false;
  if (state.watch.has(id)) state.watch.delete(id); else state.watch.add(id);
  saveWatchlist();
  return state.watch.has(id);
}

export function clearWatchlist() {
  state.watch = new Set();
  saveWatchlist();
}

function loadFilters() {
  const raw = storageGet(FILTER_KEY);
  if (!raw) return;
  try {
    const f = JSON.parse(raw);
    if (!f || typeof f !== 'object') return;
    const tx = state.taxonomy;
    const ok = (list, v) => typeof v === 'string' && (v === '' || tx[list].some((x) => x.id === v));
    const next = defaultFilters();
    if (ok('categories', f.category)) next.category = f.category;
    if (ok('maturity', f.maturity)) next.maturity = f.maturity;
    if (ok('impact', f.impact)) next.impact = f.impact;
    if (ok('momentum', f.momentum)) next.momentum = f.momentum;
    if (typeof f.text === 'string') next.text = f.text.slice(0, 200);
    if (f.watchOnly === true) next.watchOnly = true;
    if (TREND_SORTS.includes(f.sort)) next.sort = f.sort;
    state.filters = next;
  } catch { /* ignore corrupt value */ }
}

export function saveFilters() { storageSet(FILTER_KEY, JSON.stringify(state.filters)); }

export function resetFilters() {
  state.filters = defaultFilters();
  saveFilters();
}

/** Rendering context shared by the views and the ui.js card helpers. */
export function makeCtx() {
  return {
    taxonomy: state.taxonomy,
    isWatched,
    isStale: (d) => isStale(d),
    trendById: (id) => state.trendMap.get(id),
    signal: (id) => state.signals.get(id) || null,
    recById: (id) => state.recMap.get(id),
    score: priorityScore
  };
}
