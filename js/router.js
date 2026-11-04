// router.js - hash routing (#/, #/trend/<id>, #/playbook, #/feed, #/watchlist, #/about), 404 handling,
// focus management, scroll memory and nav highlighting. Views are supplied by app.js.

/** Pure: maps a location hash to { name, id? }. Unknown paths give { name: 'notfound' }. */
export function parseRoute(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const path = raw.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'dashboard' };
  if (path === '/playbook') return { name: 'playbook' };
  if (path === '/feed') return { name: 'feed' };
  if (path === '/watchlist') return { name: 'watchlist' };
  if (path === '/about') return { name: 'about' };
  const m = /^\/trend\/([^/]+)$/.exec(path);
  if (m) {
    try { return { name: 'trend', id: decodeURIComponent(m[1]) }; } catch { return { name: 'notfound' }; }
  }
  return { name: 'notfound' };
}

const scrollMemory = new Map();
let currentKey = null;
let current = null; // { route, views, root }

function routeKey(route) { return route.name + (route.id ? ':' + route.id : ''); }

function markNav(route) {
  const target = route.name === 'trend' ? 'dashboard' : route.name;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === target) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function draw(opts = {}) {
  const { route, views, root } = current;
  const view = views[route.name] || views.notfound;
  let result = view.render(route.id);
  let bind = view.bind;
  if (!result) { result = views.notfound.render(); bind = views.notfound.bind; }
  document.title = `${result.title} - IAM Trend Radar`;
  root.innerHTML = '<div class="view"></div>';
  const container = root.firstElementChild;
  if (opts.enter) container.classList.add('enter');
  container.innerHTML = result.html;
  markNav(route);
  const api = { refresh: (o) => refreshCurrent(o || {}) };
  if (bind) bind(container, api);
  return container;
}

/** Re-render the current view (e.g. after a watch toggle), keeping scroll and restoring focus. */
export function refreshCurrent(opts = {}) {
  if (!current) return;
  const y = window.scrollY;
  const container = draw(opts);
  window.scrollTo(0, y);
  let el = opts.focusSelector ? container.querySelector(opts.focusSelector) : null;
  if (!el) el = container.querySelector('h1');
  if (el) el.focus({ preventScroll: true });
}

function onRoute(isInitial) {
  if (current && currentKey !== null) scrollMemory.set(currentKey, window.scrollY);
  current.route = parseRoute(window.location.hash);
  currentKey = routeKey(current.route);
  const container = draw({ enter: !isInitial });
  window.scrollTo(0, scrollMemory.get(currentKey) || 0);
  if (!isInitial) {
    const h1 = container.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true });
  }
}

export function startRouter(root, views) {
  current = { route: { name: 'dashboard' }, views, root };
  window.addEventListener('hashchange', () => onRoute(false));
  onRoute(true);
}
