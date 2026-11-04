---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["css/styles.css","js/views/dashboard.js","js/views/trend.js","js/views/playbook.js","js/views/feed.js","js/views/watchlist.js","js/views/about.js"]
---

# Surface brief: IAM Trend Radar (whole site)

## Scope and visitor mode

Whole site redesign: Dashboard, trend detail, Playbook, Latest, Watchlist, About. Mode: Operate (the visitor scans, compares and decides); trend detail and About read as Read surfaces inside the same world. Content, data and behavior are preserved; the visual world is replaced.

## Audience, job, task, proof, constraints

IAM engineers and architects, and IAM / security leaders. Task: see where each trend stands, trust that status, open a trend, and leave with ranked recommendations. Proof on hand: ten sourced trends with review dates and source counts, twenty ranked recommendations, a live official feed. Constraints: no third parties or tracking (fonts self-hosted), no unsourced statistics, existing routes and behavior kept, accessible contrast in light and dark.

## Chosen direction and memorable moment

Standards-Track Status: every trend carries a publication-style status shown as a four-step ladder, with a dated review line. Memorable moment: the status ladder replaces the maturity badge everywhere, so a visitor reads maturity at a glance down a column.

## Unresolved decisions

None blocking. Light-versus-dark default follows the system setting.

## Direction contract

THESIS: Every trend carries a publication-style status, like a specification moving from draft to recommendation, and the site reads as a dated register of entries rather than a grid of cards; it refuses the blue-accent security-dashboard template.

OWN-WORLD: Cool paper-white ground, ink-navy shell and type, one sequential teal ladder from pale to deep that only ever means maturity, amber only for unconfirmed or needs-verification, a workhorse humanist sans with tabular numerals, square 4px controls, hairline rules, metadata in definition lists (This review, Sources, Status), no decorative shadows.

STORY: The visitor sees where each trend stands, trusts the status because every row shows its review date and source count, opens a trend, and leaves with ranked recommendations for their roadmap.

FIRST VIEWPORT: 1440x900. A 56px ink top bar with the brand and five nav items. A 260px left rail with search and filters: a four-step status ladder with counts, impact, momentum, category, watchlist-only. A centre column with the heading, a summary line, Table and Landscape tabs, and a trend table with sortable headers (Status ladder, Trend, Impact, Momentum, Reviewed, Sources). A 340px right block in spec-metadata style for the selected row. The primary action is opening a trend from its title link.

FORM: Standards-Track Status, position 6 of 7 on the ordered list (NIST control catalog, technology radar print, ATT&CK matrix heat, auditor tick-and-tie, ratings research note, standards-track status, civic service manual). seed: f1c968d7fe6121a6

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
