// Browser smoke test via Chrome DevTools Protocol (Node built-ins only; Node >= 22 for global WebSocket).
// Usage: node tests/browser-smoke.mjs [file|http]   Needs Edge or Chrome installed; exits 0 and says SKIP if none found.
// Not part of `node --test` (it launches a browser). Mode "http" expects a server on http://localhost:8000/.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'file';
const base = mode === 'http' ? 'http://localhost:8000/index.html' : pathToFileURL(join(root, 'index.html')).href;
const cands = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];
const exe = cands.find(existsSync);
if (!exe) { console.log('SKIP: no Edge/Chrome found'); process.exit(0); }

const dir = mkdtempSync(join(tmpdir(), 'iam-br-'));
const port = 9222 + Math.floor(Math.random() * 500);
const br = spawn(exe, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let results = [], failed = 0;
const check = (name, ok, info = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  [' + info + ']' : ''}`); if (!ok) failed++; };

async function main() {
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {} await sleep(200); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description || ''));
    else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) logs.push(d.params.type + ' ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') logs.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  const go = async (hash) => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(250); };
  const nav = async (url) => { await send('Page.navigate', { url }); await sleep(900); };

  await nav(base);
  await ev('localStorage.clear()'); await nav(base);
  check('dashboard renders 10 cards', (await ev('document.querySelectorAll("#results .card").length')) === 10);
  check('IAM_DATA bundle used (no fetch needed)', (await ev('!!window.IAM_DATA')) === true);

  // --- watch toggle + focus (Builder-flagged risk)
  await ev('document.querySelector("button[data-watch]").focus()');
  const firstId = await ev('document.activeElement.dataset.watch');
  await ev('document.activeElement.click()'); await sleep(150);
  check('watch toggle: focus stays on same button after re-render', (await ev('document.activeElement && document.activeElement.dataset && document.activeElement.dataset.watch')) === firstId, 'active=' + await ev('document.activeElement.tagName + ":" + (document.activeElement.dataset.watch||"")'));
  check('watch toggle: aria-pressed true and persisted', (await ev(`document.querySelector('button[data-watch="${firstId}"]').getAttribute('aria-pressed')`)) === 'true' && (await ev('localStorage.getItem("iamradar.watchlist.v1")')).includes(firstId));
  await ev('window.scrollTo(0, 500)'); await sleep(100);
  const y0 = await ev('window.scrollY');
  await ev('document.querySelectorAll("button[data-watch]")[3].click()'); await sleep(150);
  const y1 = await ev('window.scrollY');
  check('watch toggle keeps scroll position', y0 > 0 && Math.abs(y1 - y0) < 5, y0 + ' -> ' + y1);
  await ev('document.querySelectorAll("button[data-watch]")[3].click()'); await sleep(100);

  // --- reload persistence
  await nav(base);
  check('watchlist persists across reload', (await ev(`document.querySelector('button[data-watch="${firstId}"]').getAttribute('aria-pressed')`)) === 'true');

  // --- filters
  await ev(`document.querySelector('input[name=impact][value=transformative]').click()`); await sleep(100);
  const cnt = await ev('document.getElementById("result-count").textContent');
  check('filter updates result count', /^1 of 10/.test(cnt), cnt);
  await ev(`(()=>{const s=document.getElementById('f-text'); s.value='zzzznomatch'; s.dispatchEvent(new Event('input',{bubbles:true}));})()`); await sleep(100);
  check('empty state offers Clear filters', (await ev('!!document.querySelector("#results [data-action=clear-filters]")')) === true);
  await ev('document.querySelector("#results [data-action=clear-filters]").click()'); await sleep(150);
  check('clear filters: focus moves to search box', (await ev('document.activeElement.id')) === 'f-text', await ev('document.activeElement.tagName+"#"+document.activeElement.id'));
  check('clear filters: all 10 shown, controls reset', (await ev('document.querySelectorAll("#results .card").length')) === 10 && (await ev('document.querySelector("input[name=impact]:checked").value')) === '');

  // --- filter persistence across detail nav + back
  await ev(`document.querySelector('input[name=maturity][value=growing]').click()`); await sleep(100);
  const n1 = await ev('document.querySelectorAll("#results .card").length');
  await ev('document.querySelector("#results .card a").click()'); await sleep(300);
  check('detail view opens, h1 focused', (await ev('location.hash')).startsWith('#/trend/') && (await ev('document.activeElement.tagName')) === 'H1');
  await ev('history.back()'); await sleep(300);
  check('filters persist after back (AC3)', (await ev('document.querySelector("input[name=maturity]:checked").value')) === 'growing' && (await ev('document.querySelectorAll("#results .card").length')) === n1);
  await ev('document.querySelector("#filter-form [data-action=clear-filters]").click()'); await sleep(150);

  // --- detail page links
  await go('#/trend/passkeys-passwordless');
  const links = await ev('[...document.querySelectorAll(".sources a")].map(a=>[a.href.startsWith("https://"),a.target,a.rel])');
  check('source links https + _blank + noopener noreferrer', links.length > 0 && links.every(([h, t, r]) => h && t === '_blank' && /noopener/.test(r) && /noreferrer/.test(r)), JSON.stringify(links[0]));
  check('detail has all sections', (await ev('[...document.querySelectorAll("h2")].map(h=>h.textContent).join("|")')).includes('Why it matters'));
  await go('#/trend/ghost');
  check('unknown trend -> 404 view', (await ev('document.querySelector("h1").textContent')) === 'Page not found');
  await go('#/nope');
  check('unknown route -> 404 view', (await ev('document.querySelector("h1").textContent')) === 'Page not found');

  // --- playbook
  await go('#/playbook');
  check('playbook lists 20 recs', (await ev('document.querySelectorAll("#results .card").length')) === 20);
  await ev(`(()=>{const c=document.getElementById('p-quick'); c.checked=true; c.dispatchEvent(new Event('input',{bubbles:true}));})()`); await sleep(100);
  const q = await ev('[...document.querySelectorAll("#results .card")].map(c=>c.textContent)');
  check('quick wins only low effort + high/transformative', q.length > 0 && q.every((t) => /Effort: Low/.test(t) && /Impact: (High|Transformative)/.test(t)), q.length + ' shown');
  await ev('document.querySelector("#rec-form [data-action=clear-rec-filters]").click()'); await sleep(150);
  check('playbook clear: focus moves to first filter', (await ev('document.activeElement.id')) === 'p-horizon');

  // --- watchlist view + export panel (Builder-flagged risk)
  await go('#/watchlist');
  check('watchlist shows watched trend', (await ev('document.querySelectorAll(".grid .card").length')) >= 2);
  await ev('document.querySelector("[data-action=export]").click()'); await sleep(150);
  check('export panel visible, textarea focused, has Markdown', (await ev('!document.getElementById("export-panel").hidden')) && (await ev('document.activeElement.id')) === 'export-text' && (await ev('document.getElementById("export-text").value')).startsWith('# IAM Trend Radar watchlist'));
  // unwatch from watchlist view: re-render must keep panel? record behaviour
  await ev('window.confirm = () => false'); await ev('document.querySelector("[data-action=clear-watchlist]").click()'); await sleep(150);
  check('clear watchlist cancelled keeps items', (await ev('JSON.parse(localStorage.getItem("iamradar.watchlist.v1")).length')) === 1);
  await ev('window.confirm = () => true'); await ev('document.querySelector("[data-action=clear-watchlist]").click()'); await sleep(200);
  check('clear watchlist confirmed empties; empty state shown', (await ev('document.body.textContent')).includes('Your watchlist is empty') && (await ev('document.activeElement.tagName')) === 'H1');

  // --- watching from the watchlist page: export panel state after re-render
  await go('#/'); await ev('document.querySelector("button[data-watch]").click()'); await sleep(100);
  await go('#/watchlist'); await ev('document.querySelector("[data-action=export]").click()'); await sleep(100);
  await ev('document.querySelector("button[data-watch]").click()'); await sleep(150);
  results.push('INFO  after un-watching on watchlist page: export panel hidden=' + await ev('(document.getElementById("export-panel")||{hidden:"n/a"}).hidden') + ', activeElement=' + await ev('document.activeElement.tagName+":"+(document.activeElement.id||document.activeElement.dataset.action||"")'));

  // --- accessibility basics on every route
  for (const h of ['#/', '#/trend/itdr', '#/playbook', '#/watchlist', '#/about', '#/zzz']) {
    await go(h);
    const a = await ev(`(()=>{
      const bad=[];
      document.querySelectorAll('input,select,textarea').forEach(e=>{ const l=(e.id&&document.querySelector('label[for="'+e.id+'"]'))||e.closest('label')||e.getAttribute('aria-label'); if(!l) bad.push('unlabelled '+e.id); });
      document.querySelectorAll('button').forEach(b=>{ if(!b.textContent.trim()&&!b.getAttribute('aria-label')) bad.push('empty button'); });
      document.querySelectorAll('img').forEach(i=>{ if(!i.hasAttribute('alt')) bad.push('img no alt'); });
      const hs=[...document.querySelectorAll('h1,h2,h3,h4,h5')].map(h=>+h.tagName[1]); let prev=0; hs.forEach(n=>{ if(prev&&n>prev+1) bad.push('heading skip '+prev+'->'+n); prev=n; });
      if(document.querySelectorAll('h1').length!==1) bad.push('h1 count '+document.querySelectorAll('h1').length);
      if(document.querySelectorAll('main').length!==1) bad.push('main count');
      const ids=[...document.querySelectorAll('[id]')].map(e=>e.id); ids.filter((x,i)=>ids.indexOf(x)!==i).forEach(x=>bad.push('dup id '+x));
      if(!document.documentElement.lang) bad.push('no lang');
      if(!document.title) bad.push('no title');
      return bad; })()`);
    check(`a11y basics ${h}`, a.length === 0, a.join('; '));
  }
  check('skip link targets focusable main', (await ev('(()=>{const a=document.querySelector(".skip-link"); const t=document.querySelector(a.getAttribute("href")); return t && t.tabIndex===-1;})()')) === true);
  check('exactly one aria-current nav link', (await ev('document.querySelectorAll("[aria-current]").length')) <= 1);

  // --- contrast (computed colors vs resolved backgrounds) in light and dark
  for (const scheme of ['light', 'dark']) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
    await go('#/'); await sleep(150);
    const c = await ev(`(()=>{
      const parse=s=>{const m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
      const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
      const bgOf=e=>{ while(e){ const c=parse(getComputedStyle(e).backgroundColor); if(c&&c.a>0.99) return c; e=e.parentElement;} return {r:255,g:255,b:255,a:1}; };
      const worst=[]; const seen=new Set();
      document.querySelectorAll('body *').forEach(e=>{ if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) return; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none') return; const fg=parse(cs.color), bg=bgOf(e); if(!fg) return; const L1=lum(fg),L2=lum(bg); const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); const key=e.tagName+'.'+e.className+'|'+cs.color+'|'+JSON.stringify(bg); if(seen.has(key)) return; seen.add(key); const size=parseFloat(cs.fontSize), bold=+cs.fontWeight>=700; const need=(size>=24||(size>=18.66&&bold))?3:4.5; if(ratio<need) worst.push(e.tagName+'.'+e.className+' '+ratio.toFixed(2)+' need '+need); });
      return worst; })()`);
    check(`contrast >= 4.5:1 (${scheme})`, c.length === 0, c.slice(0, 6).join('; '));
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

  // --- responsive: horizontal overflow at 360 / 768 / 1280
  for (const w of [360, 768, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700 });
    for (const h of ['#/', '#/trend/itdr', '#/playbook', '#/about']) {
      await go(h); await sleep(100);
      const o = await ev('document.documentElement.scrollWidth - document.documentElement.clientWidth');
      check(`no horizontal scroll ${w}px ${h}`, o <= 0, 'overflow=' + o);
    }
  }
  await send('Emulation.clearDeviceMetricsOverride');


  // --- dashboard filter bar: always-open panel on desktop, collapsible on mobile, sticky bar, active count
  await go('#/'); await sleep(150);
  check('desktop: Clear filters is not visible when nothing is filtered', (await ev(`getComputedStyle(document.getElementById('clear-filters')).display`)) === 'none');
  check('desktop: filter toggle hidden and panel visible', (await ev(`(()=>{const t=document.getElementById('filter-toggle'),p=document.getElementById('filter-panel');return getComputedStyle(t).display==='none'&&getComputedStyle(p).display!=='none'})()`)) === true);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  await go('#/'); await sleep(200);
  check('mobile: panel collapsed behind a visible toggle (aria-expanded=false)', (await ev(`(()=>{const t=document.getElementById('filter-toggle'),p=document.getElementById('filter-panel');return getComputedStyle(t).display!=='none'&&getComputedStyle(p).display==='none'&&t.getAttribute('aria-expanded')==='false'})()`)) === true);
  await ev(`document.getElementById('filter-toggle').click()`); await sleep(100);
  check('mobile: toggle opens the panel (aria-expanded=true)', (await ev(`(()=>{const t=document.getElementById('filter-toggle'),p=document.getElementById('filter-panel');return getComputedStyle(p).display!=='none'&&t.getAttribute('aria-expanded')==='true'})()`)) === true);
  await ev(`document.querySelector('input[name=impact][value=high]').click()`); await sleep(100);
  check('toggle label shows active filter count', (await ev(`document.getElementById('filter-toggle').textContent.trim()`)) === 'Filters (1)');
  check('chips filter the landscape too', (await ev(`document.querySelectorAll('#landscape-body .dot').length`)) === (await ev(`document.querySelectorAll('#results .card').length`)));
  check('Clear filters button appears when a filter is active', (await ev(`getComputedStyle(document.getElementById('clear-filters')).display`)) !== 'none');
  await ev(`window.scrollTo(0, 1200)`); await sleep(200);
  const barTop = await ev(`document.querySelector('.filter-bar').getBoundingClientRect().top`);
  check('filter bar stays stuck to the top while scrolling', Math.abs(barTop) < 2, 'top=' + barTop);
  await ev(`document.getElementById('clear-filters').click()`); await sleep(200);
  check('clear: count label and button reset', (await ev(`document.getElementById('filter-toggle').textContent.trim()`)) === 'Filters' && (await ev(`getComputedStyle(document.getElementById('clear-filters')).display`)) === 'none');
  await send('Emulation.clearDeviceMetricsOverride');

  // --- external requests
  const ext = await ev('performance.getEntriesByType("resource").map(r=>r.name).filter(n=>!n.startsWith(location.origin)&&!n.startsWith("file:"))');
  check('no external network requests', ext.length === 0, ext.join(','));
  check('no console errors/exceptions', logs.length === 0, logs.slice(0, 5).join(' | '));
  ws.close();
}

try { await main(); } catch (e) { check('harness', false, e.message); }
finally { br.kill(); await sleep(300); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(`mode=${mode}\n` + results.join('\n') + `\n${results.filter((r) => r.startsWith('PASS')).length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
