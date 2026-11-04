# IAM Trend Radar

A small static website that tracks identity and access management (IAM) trends. Each trend has a maturity, impact and momentum rating, cited sources and linked recommendations. IAM practitioners can filter the landscape, build a watchlist and export it as Markdown for a roadmap document.

There is no backend, no tracking and no runtime dependency. Everything stays in your browser. Node.js is only needed for the optional dev scripts.

The seed dataset is 10 trends and 20 recommendations, dated 2026-11-04. Items flagged "Needs verification" contain claims that were not confirmed against a source. Treat the content as a curated starting point and verify it before acting.

## Open it

**Option 1: open the file directly.** Double-click `index.html`, or open it from your browser's File menu (`file:///E:/Claude/OrchestrateTest/index.html` on this machine). This works because the repo ships two generated files, `data/data.js` and `dist/app.js`, which need no module loading or `fetch`.

**Option 2: serve it locally.** From the project root:

```
python -m http.server 8000
```

Then browse to `http://localhost:8000/`. Any static file server works.

If the data cannot load, the page shows an error with these same instructions.

## Features

- **Dashboard** (`#/`): trend cards with search and filters for category, maturity, impact and momentum, a "watchlist only" toggle and four sort orders. Filters combine with AND and are remembered in your browser.
- **Trend detail** (`#/trend/<id>`): summary, why it matters, risks, key standards, linked recommendations, dated sources, related trends and a verification notice where relevant.
- **Playbook** (`#/playbook`): all recommendations with a computed priority score, filters for horizon, effort, impact and trend, and a "Quick wins" preset.
- **Watchlist** (`#/watchlist`): your watched trends and their recommendations, with Markdown export (view, copy, download) and a confirmed clear.
- **About** (`#/about`): methodology, scales, priority score formula and data policy.
- Light and dark themes follow the system setting. Pages include a skip link, labelled inputs, text-based badges and a live result count.
- No external network requests at runtime. Source links open in a new tab with `rel="noopener noreferrer"`, and only `https://` links are rendered as links.

## Folder layout

```
index.html            Page shell: nav, <main id="app">, footer; loads the two scripts below
css/styles.css        Styles, CSS variables, dark mode
js/                   Source modules (ES modules)
  app.js              Entry point: loads data, starts the router
  router.js           Hash routing and the 404 view
  store.js            Data loading and the localStorage watchlist and filters
  filters.js          Pure filter, sort and priority-score functions
  export.js           Watchlist to Markdown
  ui.js               Escaping, badges, cards, option lists
  views/              dashboard, trend, playbook, watchlist, about
data/
  meta.json           Dataset version, last-updated date, disclaimer
  taxonomy.json       Allowed values for categories, maturity, impact, momentum, effort, horizon
  trends.json         Trends (edit this)
  recommendations.json  Recommendations (edit this)
  data.js             GENERATED bundle of the four JSON files for file:// use
dist/app.js           GENERATED single classic script built from js/
scripts/
  validate-data.mjs   Schema, reference and content-policy checks
  build-data.mjs      Validates, then regenerates data/data.js and dist/app.js
docs/                 PLAN.md, USAGE.md, CONTRIBUTING-DATA.md and project notes
```

`data/data.js` and `dist/app.js` are generated. Do not edit them by hand.

## Rebuild after changes

The page loads `data/data.js` and `dist/app.js`, not the files in `js/` or `data/*.json` directly. After editing anything in `js/` or `data/*.json`, run from the project root:

```
node scripts/build-data.mjs
```

This runs the data validator first and refuses to build if it finds errors. Use `node scripts/build-data.mjs --data-only` to regenerate only `data/data.js`. Commit the regenerated files. Node 18 or later is required.

To check data without building:

```
node scripts/validate-data.mjs
```

See [docs/CONTRIBUTING-DATA.md](docs/CONTRIBUTING-DATA.md) for how to add or update content, and [docs/USAGE.md](docs/USAGE.md) for a walkthrough of each view.

## Storage

The browser stores two small things in `localStorage`: the watchlist (`iamradar.watchlist.v1`) and your last dashboard filters (`iamradar.filters.v1`). If storage is blocked, the site still works for the current tab and the Watchlist view says it will not be saved.

## License

No license has been chosen yet.

## Latest feed and publishing

- **Latest feed (`#/feed`)**: headlines from official feeds (FIDO Alliance, OpenID Foundation, NIST, CISA, W3C), written to `data/feed.json` by `node scripts/fetch-feed.mjs`. Broad feeds (NIST, CISA, W3C) are filtered to identity-related items. If a source is down, its previous items are kept. The page re-checks the file every 15 minutes while open. The feed needs http(s); it does not load when `index.html` is opened from disk.
- **Public hosting**: `.github/workflows/pages.yml` publishes only `index.html`, `css/`, `dist/` and `data/` to GitHub Pages on every push to `main`, manually, and every 6 hours (refreshing the feed each time). Tests must pass before it deploys. The refreshed feed is deployed but not committed.
- **Before going public**: five trends are flagged `needsVerification`; review them (see `docs/CONTRIBUTING-DATA.md`).

## Fonts

The site uses Hanken Grotesk (variable, Latin subset), self-hosted in `css/fonts/` under the SIL Open Font License; the license text is `css/fonts/HankenGrotesk-OFL.txt`. No fonts are loaded from third parties.
