# IAM Trend Radar - Project Plan

Author: Agent 1 (Architect). Plan date: 2026-11-04. Status: ready for Builder.

## 1. Audience and goals

**Audience:** IAM practitioners and leads (IAM architects, IGA/PAM engineers, security managers, CISOs' staff) at mid-to-large organizations who must keep a roadmap current without reading dozens of vendor/analyst feeds.

**Product promise:** one place to see what is changing in IAM, how mature and impactful each trend is, and a concrete "what should we do about it" recommendation with effort/impact.

**Non-goals (MVP):** accounts/login, backend, live news scraping, vendor comparison, real-time feeds, analytics/tracking.

## 2. User stories (MVP)

| ID | As an... | I want to... | So that... |
|----|----------|--------------|------------|
| U1 | IAM lead | see all trends on one dashboard with maturity, impact, momentum | I can scan the landscape in minutes |
| U2 | IAM architect | filter/search by category, maturity, impact, text | I can focus on my domain |
| U3 | IAM architect | open a trend and read summary, why it matters, risks, sources | I can brief my team with citations |
| U4 | IAM lead | see recommendations linked to trends, sorted by impact vs effort | I can build a roadmap |
| U5 | Any user | add/remove trends to a watchlist saved in my browser | I can track what matters to me |
| U6 | Any user | export my watchlist + its recommendations as Markdown | I can paste into a roadmap doc |
| U7 | Any user | see "last updated" and a "needs verification" flag on every item | I know how much to trust it |
| U8 | Keyboard/screen-reader user | use the whole site accessibly | it is usable by everyone |

## 3. MVP scope

In: 4 views (Dashboard, Trend detail, Playbook, Watchlist), filters, search, localStorage watchlist, Markdown export, light/dark theme via `prefers-color-scheme`, seed data of 10 trends and ~20 recommendations, data validation script.

Out (later): RSS ingestion, per-user notes sharing, charts library, i18n, maturity-over-time history, auth.

## 4. Technical approach

- Plain HTML/CSS/JS (ES modules), **no build step, no npm runtime dependencies**.
- Data in JSON under `data/`. Because `fetch()` of local JSON fails on `file://`, the app MUST support both:
  1. Served mode: `python -m http.server 8000` (primary, documented).
  2. `file://` fallback: `data/*.js` mirror files are NOT used; instead Builder provides `scripts/build-data.mjs` (Node, optional) that emits `data/data.js` (`window.IAM_DATA = {...}`) from the JSON. `index.html` loads `data/data.js` first; if `window.IAM_DATA` is absent, app falls back to `fetch`. Commit `data/data.js` so opening `index.html` directly works.
- Hash-based routing (`#/`, `#/trend/<id>`, `#/playbook`, `#/watchlist`) so it works on any static host and `file://`.
- Render with template literals; ALWAYS escape data via a shared `esc()` helper (no raw `innerHTML` of data fields). Links from data use `rel="noopener noreferrer"` and only `https://` URLs.
- Node (>=18) is used only for dev scripts (validate/build); the site itself needs none.

## 5. Information architecture

| Route | View | Contents |
|-------|------|----------|
| `#/` | Dashboard | Header stats (counts, data last-updated), filter bar (category, maturity, impact, momentum, text search, "watchlist only"), trend card grid; sort by impact / maturity / updated / title |
| `#/trend/<id>` | Trend detail | Title, category chips, maturity/impact/momentum badges, summary, why it matters, risks/challenges, key standards, linked recommendations, sources (title, publisher, URL, date accessed), verification flag, watch toggle, related trends |
| `#/playbook` | Playbook | All recommendations as a table/cards; filter by horizon, effort, impact, trend; sort by priority score; "Quick wins" preset (low effort + high impact) |
| `#/watchlist` | Watchlist | Watched trends + their recommendations; Export Markdown button; clear button (with confirm) |
| `#/about` | About | Methodology, scales, data policy, how to contribute data |

Shared: top nav, skip-link, footer with data version and disclaimer. Unknown route renders a friendly 404 view.

## 6. Data schema

All files UTF-8 JSON. IDs are lowercase kebab-case, unique, stable (never reused).

### 6.1 `data/meta.json`
```json
{ "schemaVersion": 1, "datasetVersion": "2026.11.0", "lastUpdated": "2026-11-04",
  "disclaimer": "Curated summary; verify before acting. Items flagged needsVerification have unconfirmed claims." }
```

### 6.2 `data/taxonomy.json`
Defines allowed enums so the validator and UI share one source.
- `categories`: array of `{id, label, description}` - use: `authentication`, `governance`, `privileged-access`, `threat-detection`, `workload-identity`, `cloud-entitlements`, `decentralized-identity`, `ai-identity`, `architecture`, `regulation`.
- `maturity` (ordered): `emerging` (1, early research/pilots), `growing` (2, early adopters, products shipping), `mainstream` (3, widely deployed), `established` (4, baseline expectation).
- `impact` (ordered): `low`, `medium`, `high`, `transformative`.
- `momentum`: `rising`, `steady`, `cooling`.
- `effort` (ordered): `low` (<1 quarter, small team), `medium` (1-2 quarters), `high` (>2 quarters or cross-org program).
- `horizon`: `now` (0-3 mo), `next` (3-9 mo), `later` (9+ mo).

### 6.3 `data/trends.json` - array of:
```json
{
  "id": "passkeys-passwordless",
  "title": "Passkeys and passwordless authentication",
  "categories": ["authentication"],
  "maturity": "growing",
  "impact": "high",
  "momentum": "rising",
  "summary": "<=280 chars, plain text",
  "whyItMatters": "<=500 chars",
  "risks": ["short strings"],
  "keyStandards": ["FIDO2 / WebAuthn"],
  "relatedTrends": ["zero-trust-identity"],
  "sources": [
    { "title": "...", "publisher": "...", "url": "https://...", "type": "standard|vendor|analyst|government|research|news",
      "published": "YYYY-MM or null", "accessed": "2026-11-04" }
  ],
  "needsVerification": false,
  "verificationNotes": "what is unconfirmed, or empty string",
  "lastUpdated": "2026-11-04"
}
```
Rules: at least 1 source per trend (>=2 preferred); `needsVerification` MUST be `true` if any quantitative claim lacks a source; no unsourced statistics anywhere in `summary`/`whyItMatters`.

### 6.4 `data/recommendations.json` - array of:
```json
{
  "id": "rec-passkey-pilot-workforce",
  "trendIds": ["passkeys-passwordless"],
  "title": "Pilot passkeys for a workforce population",
  "description": "<=400 chars, imperative voice",
  "horizon": "now",
  "effort": "medium",
  "impact": "high",
  "steps": ["3-5 short action items"],
  "successMetrics": ["qualitative or measurable, no invented targets"],
  "dependencies": ["rec-id or free text"],
  "audience": ["iam-architect", "ciso"],
  "lastUpdated": "2026-11-04"
}
```
**Priority score** (computed in JS, not stored): `impactRank*2 - effortRank` where impact low=1..transformative=4 and effort low=1..high=3; ties broken by horizon then title. Documented on the About page.

## 7. Seed dataset outline (10 trends, ~2 recs each)

Builder drafts content from well-known, citable primary sources (standards bodies, government publications, vendor docs). Do NOT invent adoption percentages, breach costs, or market sizes. Where a figure would help, omit it or link to the source and set `needsVerification: true`.

| # | id | Category | Maturity | Impact | Momentum | Candidate sources (verify URLs at build time) |
|---|----|----------|----------|--------|----------|-----------------------------------------------|
| 1 | `passkeys-passwordless` | authentication | growing | high | rising | FIDO Alliance (fidoalliance.org), W3C WebAuthn spec, NIST SP 800-63B |
| 2 | `zero-trust-identity` | architecture | mainstream | high | steady | NIST SP 800-207, CISA Zero Trust Maturity Model |
| 3 | `itdr` | threat-detection | growing | high | rising | Analyst/vendor definitions (mark vendor), MITRE ATT&CK identity techniques |
| 4 | `non-human-identity` | workload-identity | growing | transformative | rising | OWASP Non-Human Identities Top 10, SPIFFE docs |
| 5 | `iga-modernization` | governance | mainstream | medium | steady | NIST SP 800-53 AC family, vendor/analyst IGA overviews (mark type) |
| 6 | `pam-just-in-time` | privileged-access | mainstream | high | steady | NIST SP 800-53 AC-6, CISA guidance on privileged access |
| 7 | `ciem-cloud-entitlements` | cloud-entitlements | growing | medium | steady | Cloud provider IAM docs (AWS IAM Access Analyzer, Azure Entra Permissions Mgmt, GCP IAM Recommender) |
| 8 | `decentralized-identity-wallets` | decentralized-identity | emerging | medium | rising | W3C Verifiable Credentials 2.0, W3C DID Core, EU eIDAS 2.0 / EUDI Wallet |
| 9 | `ai-agent-identity` | ai-identity | emerging | high | rising | OAuth 2.x / IETF drafts, OWASP agentic guidance, MCP authorization spec; set `needsVerification: true` (fast-moving) |
| 10 | `identity-regulation` | regulation | mainstream | high | rising | NIS2, DORA, EU eIDAS 2.0, NIST SP 800-63-4 status; verify current dates |
| 11 (optional) | `continuous-access-evaluation` | architecture | growing | medium | rising | OpenID Shared Signals Framework / CAEP |
| 12 (optional) | `post-quantum-identity` | authentication | emerging | medium | rising | NIST FIPS 203/204/205 |

Cross-link `relatedTrends` (e.g. 4<->9, 2<->11, 1<->2, 3<->6). Every trend must have at least one linked recommendation; every recommendation at least one valid trend.

## 8. File and folder layout

```
E:\Claude\OrchestrateTest\
  index.html                # shell: nav, <main id="app">, footer; loads css + js
  README.md                 # (Scribe) quickstart
  css/
    styles.css              # tokens (CSS vars), layout, components, dark mode
  js/
    app.js                  # entry: load data, init router
    router.js               # hash routing, 404
    store.js                # data load + localStorage watchlist (safe try/catch)
    filters.js              # pure filter/sort/score functions (unit-testable)
    views/
      dashboard.js  trend.js  playbook.js  watchlist.js  about.js
    ui.js                   # esc(), badge(), card(), a11y helpers
    export.js               # watchlist -> Markdown
  data/
    meta.json  taxonomy.json  trends.json  recommendations.json
    data.js                 # generated bundle for file:// use (committed)
  scripts/
    validate-data.mjs       # schema + referential-integrity + URL-format checks
    build-data.mjs          # JSON -> data/data.js
  tests/
    filters.test.mjs        # node:test unit tests for filters.js/export.js
    TEST-PLAN.md            # (Validator) manual + automated results
  docs/
    PLAN.md  USER-GUIDE.md  DATA-GUIDE.md  ARCHITECTURE.md
```
Naming: kebab-case files, camelCase JS identifiers, ES modules with relative imports (include `.js` extensions). `filters.js` and `export.js` must be DOM-free so Node tests can import them.

localStorage keys: `iamradar.watchlist.v1` (array of trend ids), `iamradar.filters.v1` (optional last filters), `iamradar.theme.v1` (optional). All access wrapped in try/catch; app works with storage unavailable.

## 9. UI and quality requirements

- Responsive from 360px to desktop; no horizontal scroll.
- WCAG 2.1 AA target: semantic landmarks, visible focus, contrast >= 4.5:1, badges never color-only (include text), `aria-live` for filter result count, labels on all inputs, skip-link, keyboard-operable watch toggle (`aria-pressed`).
- Maturity/impact badges use text + icon/shape, not just hue.
- No external network requests at runtime (no CDNs, fonts, trackers). Source links open in a new tab with `noopener noreferrer`.
- Performance: first render < 1s locally; whole site < 250 KB excluding data.
- Empty states: no filter matches (offer "Clear filters"), empty watchlist, data-load failure (clear message + how to run a local server).
- Content policy: every trend/rec shows `lastUpdated`; flagged items show a visible "Needs verification" badge with `verificationNotes`.

## 10. Acceptance criteria

1. **AC1 Launch:** Site works by opening `index.html` directly AND via `python -m http.server`; no console errors in either.
2. **AC2 Dashboard:** Shows all seed trends; each card shows title, categories, maturity, impact, momentum, summary, updated date, watch toggle.
3. **AC3 Filters:** Category, maturity, impact, momentum, text search, and watchlist-only filters combine with AND; result count updates; Clear filters resets; filters persist across detail navigation (back button) .
4. **AC4 Detail:** Every trend id route renders all fields in 6.3, with working source links (https, new tab, noopener); unknown id shows 404 view.
5. **AC5 Playbook:** Lists every recommendation with computed priority; sorts by priority; Quick wins preset shows only low-effort + high/transformative impact; each rec links to its trend(s).
6. **AC6 Watchlist:** Toggle persists across reload; watchlist view shows watched trends and recs; works when localStorage throws; clear requires confirm.
7. **AC7 Export:** Markdown export contains each watched trend (title, maturity, impact, summary, sources) and its recommendations (title, horizon, effort, impact, steps); output is deterministic and matches a snapshot test.
8. **AC8 Data integrity:** `node scripts/validate-data.mjs` exits 0: enums valid, ids unique, all references resolve, every trend has >=1 source and >=1 rec, URLs start with `https://`, dates are ISO, field length limits hold, `needsVerification:true` has non-empty notes.
9. **AC9 Accessibility:** Keyboard-only walkthrough of all views succeeds; axe/Lighthouse accessibility score >= 90 (if tooling available; else documented manual checklist).
10. **AC10 Security:** No data field is inserted as unescaped HTML (test with a fixture containing `<img onerror>` and `"` characters); no inline event handlers; no external requests.
11. **AC11 Responsive:** Usable at 360, 768, 1280 px widths.
12. **AC12 Content honesty:** No unsourced numeric statistic in trends/recs (validator regex flags `%`, `$`, "billion", "million" in summary/whyItMatters unless `needsVerification` is true and a source is present).

## 11. Test plan outline (Validator)

**Automated (Node, no deps; `node --test tests/`):**
- `filters.test.mjs`: each filter alone and combined; sort orders; priority score and tie-breaks; quick-win preset; empty results.
- `export.test.mjs`: snapshot of Markdown for 0, 1, and 3 watched trends; special characters.
- `validate-data.mjs` negative tests: fixtures with bad enum, dangling ref, duplicate id, http URL, missing sources.
- `ui.esc` test with hostile strings.

**Manual / browser (document results in `tests/TEST-PLAN.md`):**
- Smoke each route on file:// and http://; reload on a deep link `#/trend/<id>`.
- Watchlist persistence; private-window / storage-disabled behavior.
- Keyboard-only pass; screen-reader spot check of card, filter bar, toggle.
- Widths 360 / 768 / 1280; light and dark.
- Link check: every source URL reachable (record status and date; unreachable -> flag for content fix, not a code defect).
- Content review: sample 5 items against their cited sources; confirm claims match.

**Reporting:** Validator records pass/fail per AC1-AC12, with defects as `ID | severity | steps | expected | actual` and returns to Builder; re-test after fixes.

## 12. Docs outline (Scribe)

- `README.md`: purpose, screenshot placeholder, quickstart (open file / `python -m http.server`), folder map, commands (`validate`, `build-data`, `test`), license placeholder.
- `docs/USER-GUIDE.md`: dashboard and filters, reading a trend, using the playbook and priority score, watchlist and export, interpreting maturity/impact/effort scales, what "Needs verification" means, privacy (everything stays in your browser).
- `docs/DATA-GUIDE.md`: how to add/update a trend or recommendation, schema field reference, source quality rules (prefer standards bodies, government, primary docs; label vendor/analyst content), refresh cadence (suggest quarterly review; bump `datasetVersion` and `lastUpdated`), run validator before committing.
- `docs/ARCHITECTURE.md`: module responsibilities, routing, data flow, file:// fallback rationale, security notes (escaping), accessibility notes, extension ideas.

## 13. Build order for Builder

1. `taxonomy.json`, `meta.json`, schema-conformant seed `trends.json`/`recommendations.json`.
2. `validate-data.mjs` and `build-data.mjs`; get validator green.
3. `filters.js`, `export.js`, `ui.js` (pure/testable) with unit tests.
4. `index.html`, `styles.css`, router, views (Dashboard -> Detail -> Playbook -> Watchlist -> About).
5. A11y/responsive polish, then hand off to Validator; Scribe works in parallel from sections 5, 6, 12.

## 14. Risks and flags

- **Fast-moving topics** (AI-agent identity, regulation dates, NIST SP 800-63-4 status) - set `needsVerification: true` and state what to check; do not assert specific dates or versions from memory.
- **URL rot** - validator checks format only; link reachability is a manual Validator step. Prefer stable landing pages over deep links.
- **Vendor bias** - label source `type`; keep recommendations vendor-neutral.
- **Stale content** - show age of `lastUpdated`; items older than 180 days display a "May be stale" hint (computed at runtime).
- **file:// quirks** - ES modules do not load over `file://` in some browsers (Chrome blocks module imports from file origins). Builder must verify; if blocked, either bundle JS into a single classic script via `scripts/build-data.mjs` (extend to `dist/app.js`) or document the local-server requirement prominently and make AC1's file:// clause "data-load failure shows instructions". Decision rule: try modules first; fall back to the single-script bundle only if file:// fails.
- **Scope creep** - anything not in sections 3 and 5 is post-MVP.
