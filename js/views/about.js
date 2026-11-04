// views/about.js - methodology, scales (rendered from taxonomy.json), priority score, data policy and contribution notes.

import { state } from '../store.js';
import { esc } from '../ui.js';

function scale(title, list) {
  return `<h3>${esc(title)}</h3><dl class="scale">${list.map((x) => `<dt>${esc(x.label)}</dt><dd>${esc(x.description || '')}</dd>`).join('')}</dl>`;
}

export function renderAbout() {
  const tx = state.taxonomy;
  const m = state.meta;
  return {
    title: 'About',
    html: `<h1 tabindex="-1">About this radar</h1>
<section aria-labelledby="h-method"><h2 id="h-method">Methodology</h2>
  <p>Trends are curated by hand from public standards, government publications and primary documentation. Maturity, impact and momentum are editorial judgments, not measurements. Each trend lists its sources and the date they were accessed.</p>
  <p>Dataset version <strong>${esc(m.datasetVersion)}</strong>, last updated <strong>${esc(m.lastUpdated)}</strong>. Items not updated for more than 180 days show a "May be stale" hint.</p></section>
<section aria-labelledby="h-scales"><h2 id="h-scales">Scales</h2>
  ${scale('Maturity (least to most mature)', tx.maturity)}
  ${scale('Impact (lowest to highest)', tx.impact)}
  ${scale('Momentum', tx.momentum)}
  ${scale('Effort', tx.effort)}
  ${scale('Horizon', tx.horizon)}</section>
<section aria-labelledby="h-score"><h2 id="h-score">Priority score</h2>
  <p>Each recommendation gets a score computed in your browser: <code>impact rank x 2 - effort rank</code>, where impact is low=1, medium=2, high=3, transformative=4 and effort is low=1, medium=2, high=3. Higher is better. Ties are broken by horizon (now before next before later), then by title. The Quick wins preset shows recommendations with low effort and high or transformative impact.</p></section>
<section aria-labelledby="h-policy"><h2 id="h-policy">Data policy</h2>
  <ul>
    <li>No unsourced statistics. Where a claim could not be confirmed, the item is flagged "Needs verification" with notes on what to check.</li>
    <li>Source types are labelled (standard, government, vendor, analyst, research, news). Vendor material is not used to make recommendations vendor-specific.</li>
    <li>${esc(m.disclaimer)}</li>
    <li>Everything stays in your browser. The site makes no network requests, and your watchlist is stored only in this browser's local storage.</li>
  </ul></section>
<section aria-labelledby="h-contrib"><h2 id="h-contrib">Contributing data</h2>
  <p>Data lives in the <code>data/</code> folder as JSON. Edit <code>trends.json</code> or <code>recommendations.json</code>, run <code>node scripts/validate-data.mjs</code>, then <code>node scripts/build-data.mjs</code> to regenerate the bundle used when the site is opened directly from disk. See <code>docs/CONTRIBUTING-DATA.md</code> for details.</p></section>`
  };
}
