// validate-data.mjs - schema, referential-integrity and content-policy checks for data/*.json.
// Usage: node scripts/validate-data.mjs [dataDir]   (exit 0 = valid, 1 = errors, 2 = cannot read files)
// Also exports validateDataset(data) -> { errors: string[], warnings: string[] } for tests.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_RE = /^\d{4}-\d{2}$/;
const STAT_RE = /%|\$|\bbillion\b|\bmillion\b/i;
const SOURCE_TYPES = ['standard', 'vendor', 'analyst', 'government', 'research', 'news'];
const LIMITS = { summary: 280, whyItMatters: 500, description: 400 };

function isIsoDate(s) {
  if (typeof s !== 'string' || !ISO_DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }
function isStrArray(v) { return Array.isArray(v) && v.every(isStr); }

export function validateDataset({ meta, taxonomy, trends, recommendations }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  // meta
  if (!meta || typeof meta !== 'object') err('meta: missing');
  else {
    if (meta.schemaVersion !== 1) err('meta.schemaVersion must be 1');
    if (!isStr(meta.datasetVersion)) err('meta.datasetVersion required');
    if (!isIsoDate(meta.lastUpdated)) err('meta.lastUpdated must be an ISO date (YYYY-MM-DD)');
    if (!isStr(meta.disclaimer)) err('meta.disclaimer required');
  }

  // taxonomy
  const enums = {};
  if (!taxonomy || typeof taxonomy !== 'object') err('taxonomy: missing');
  else {
    for (const key of ['categories', 'maturity', 'impact', 'momentum', 'effort', 'horizon']) {
      const list = taxonomy[key];
      if (!Array.isArray(list) || list.length === 0) { err(`taxonomy.${key}: must be a non-empty array`); enums[key] = new Set(); continue; }
      const ids = list.map((x) => x && x.id);
      if (ids.some((i) => !isStr(i))) err(`taxonomy.${key}: every entry needs an id`);
      if (new Set(ids).size !== ids.length) err(`taxonomy.${key}: duplicate ids`);
      enums[key] = new Set(ids);
    }
  }
  const has = (key, v) => enums[key] && enums[key].has(v);

  // trends
  const trendIds = new Set();
  if (!Array.isArray(trends)) err('trends: must be an array');
  const trendList = Array.isArray(trends) ? trends : [];
  for (const t of trendList) {
    const where = `trend ${t && t.id ? t.id : '(no id)'}`;
    if (!t || typeof t !== 'object') { err('trends: entry is not an object'); continue; }
    if (!isStr(t.id) || !ID_RE.test(t.id)) err(`${where}: id must be lowercase kebab-case`);
    else if (trendIds.has(t.id)) err(`${where}: duplicate id`);
    else trendIds.add(t.id);
    if (!isStr(t.title)) err(`${where}: title required`);
    if (!Array.isArray(t.categories) || t.categories.length === 0) err(`${where}: categories must be a non-empty array`);
    else t.categories.forEach((c) => { if (!has('categories', c)) err(`${where}: unknown category "${c}"`); });
    for (const [field, key] of [['maturity', 'maturity'], ['impact', 'impact'], ['momentum', 'momentum']]) {
      if (!has(key, t[field])) err(`${where}: invalid ${field} "${t[field]}"`);
    }
    for (const f of ['summary', 'whyItMatters']) {
      if (!isStr(t[f])) err(`${where}: ${f} required`);
      else if (t[f].length > LIMITS[f]) err(`${where}: ${f} exceeds ${LIMITS[f]} chars (${t[f].length})`);
    }
    if (!isStrArray(t.risks)) err(`${where}: risks must be an array of strings`);
    if (!isStrArray(t.keyStandards)) err(`${where}: keyStandards must be an array of strings`);
    if (!Array.isArray(t.relatedTrends)) err(`${where}: relatedTrends must be an array`);
    if (!Array.isArray(t.sources) || t.sources.length < 1) err(`${where}: at least 1 source required`);
    else {
      if (t.sources.length < 2) warn(`${where}: only 1 source (2 preferred)`);
      t.sources.forEach((s, i) => {
        const sw = `${where} source[${i}]`;
        if (!s || typeof s !== 'object') { err(`${sw}: not an object`); return; }
        if (!isStr(s.title)) err(`${sw}: title required`);
        if (!isStr(s.publisher)) err(`${sw}: publisher required`);
        if (!isStr(s.url) || !s.url.startsWith('https://')) err(`${sw}: url must start with https://`);
        else { try { new URL(s.url); } catch { err(`${sw}: url is not parseable`); } }
        if (!SOURCE_TYPES.includes(s.type)) err(`${sw}: invalid type "${s.type}"`);
        if (!(s.published === null || (typeof s.published === 'string' && (ISO_MONTH_RE.test(s.published) || ISO_DATE_RE.test(s.published))))) err(`${sw}: published must be YYYY-MM, YYYY-MM-DD or null`);
        if (!isIsoDate(s.accessed)) err(`${sw}: accessed must be an ISO date`);
      });
    }
    if (typeof t.needsVerification !== 'boolean') err(`${where}: needsVerification must be boolean`);
    if (typeof t.verificationNotes !== 'string') err(`${where}: verificationNotes must be a string`);
    else if (t.needsVerification === true && !t.verificationNotes.trim()) err(`${where}: needsVerification is true but verificationNotes is empty`);
    else if (t.needsVerification === false && t.verificationNotes.trim()) warn(`${where}: verificationNotes set but needsVerification is false`);
    if (!isIsoDate(t.lastUpdated)) err(`${where}: lastUpdated must be an ISO date`);
    // AC12: no unsourced numeric statistics
    for (const f of ['summary', 'whyItMatters']) {
      if (typeof t[f] === 'string' && STAT_RE.test(t[f])) {
        const ok = t.needsVerification === true && Array.isArray(t.sources) && t.sources.length > 0;
        if (!ok) err(`${where}: ${f} contains a statistic-like token (% $ billion million) without needsVerification + source`);
      }
    }
  }
  // trend references (second pass so forward references resolve)
  for (const t of trendList) {
    if (!t || !Array.isArray(t.relatedTrends)) continue;
    for (const r of t.relatedTrends) {
      if (!trendIds.has(r)) err(`trend ${t.id}: relatedTrends references unknown trend "${r}"`);
      else if (r === t.id) err(`trend ${t.id}: relatedTrends includes itself`);
      else {
        const other = trendList.find((x) => x.id === r);
        if (other && Array.isArray(other.relatedTrends) && !other.relatedTrends.includes(t.id)) warn(`trend ${t.id}: relation to ${r} is not reciprocal`);
      }
    }
  }

  // recommendations
  const recIds = new Set();
  if (!Array.isArray(recommendations)) err('recommendations: must be an array');
  const recList = Array.isArray(recommendations) ? recommendations : [];
  for (const r of recList) {
    if (r && isStr(r.id) && ID_RE.test(r.id)) {
      if (recIds.has(r.id)) err(`rec ${r.id}: duplicate id`); else recIds.add(r.id);
    }
  }
  const covered = new Set();
  for (const r of recList) {
    const where = `rec ${r && r.id ? r.id : '(no id)'}`;
    if (!r || typeof r !== 'object') { err('recommendations: entry is not an object'); continue; }
    if (!isStr(r.id) || !ID_RE.test(r.id)) err(`${where}: id must be lowercase kebab-case`);
    if (!Array.isArray(r.trendIds) || r.trendIds.length === 0) err(`${where}: trendIds must be a non-empty array`);
    else r.trendIds.forEach((id) => { if (!trendIds.has(id)) err(`${where}: trendIds references unknown trend "${id}"`); else covered.add(id); });
    if (!isStr(r.title)) err(`${where}: title required`);
    if (!isStr(r.description)) err(`${where}: description required`);
    else {
      if (r.description.length > LIMITS.description) err(`${where}: description exceeds ${LIMITS.description} chars (${r.description.length})`);
      if (STAT_RE.test(r.description)) err(`${where}: description contains a statistic-like token (% $ billion million)`);
    }
    for (const key of ['horizon', 'effort', 'impact']) if (!has(key, r[key])) err(`${where}: invalid ${key} "${r[key]}"`);
    if (!isStrArray(r.steps) || r.steps.length < 3 || r.steps.length > 5) err(`${where}: steps must be 3-5 non-empty strings`);
    if (!isStrArray(r.successMetrics) || r.successMetrics.length < 1) err(`${where}: successMetrics must be a non-empty array of strings`);
    if (!Array.isArray(r.dependencies) || !r.dependencies.every(isStr)) err(`${where}: dependencies must be an array of strings`);
    else r.dependencies.forEach((d) => { if (/^rec-/.test(d) && !recIds.has(d)) err(`${where}: dependency "${d}" does not resolve to a recommendation`); if (d === r.id) err(`${where}: depends on itself`); });
    if (!isStrArray(r.audience) || r.audience.length < 1 || !r.audience.every((a) => ID_RE.test(a))) err(`${where}: audience must be a non-empty array of kebab-case strings`);
    if (!isIsoDate(r.lastUpdated)) err(`${where}: lastUpdated must be an ISO date`);
  }
  for (const id of trendIds) if (!covered.has(id)) err(`trend ${id}: has no linked recommendation`);

  return { errors, warnings };
}

export function loadDataDir(dir) {
  const read = (f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
  return { meta: read('meta.json'), taxonomy: read('taxonomy.json'), trends: read('trends.json'), recommendations: read('recommendations.json') };
}

// CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dir = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  let data;
  try { data = loadDataDir(dir); } catch (e) { console.error(`Cannot read data from ${dir}: ${e.message}`); process.exit(2); }
  const { errors, warnings } = validateDataset(data);
  warnings.forEach((w) => console.warn(`WARN  ${w}`));
  errors.forEach((e) => console.error(`ERROR ${e}`));
  console.log(`${data.trends.length} trends, ${data.recommendations.length} recommendations: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
