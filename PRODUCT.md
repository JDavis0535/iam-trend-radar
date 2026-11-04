# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

IAM engineers and architects, and IAM / security leaders. They work inside identity and access management programs and open the site to see what is changing in the field, how mature and impactful each change is, and what to do about it: engineers and architects to decide what to adopt and shape a technical roadmap, leaders to prioritize a backlog and brief others.

## Product Purpose

IAM Trend Radar helps identity and access management teams stay current on industry trends and innovate from concrete recommendations. Success is a visitor leaving with a prioritized, sourced set of actions for their own program, not just awareness of a topic.

## Positioning

Trends are tied to recommendations: each trend links to specific, ranked actions (with a computed priority score) rather than stopping at commentary. And the content is sourced and honest about gaps: every trend cites its sources, and claims that could not be confirmed are flagged or left out instead of being smoothed over.

## Operating Context

A visitor scans the maturity-by-impact landscape or filters trends, opens a trend to read why it matters, its risks, key standards and sources, and works through the linked recommendations in the Playbook. They can keep a watchlist and export it as Markdown to share in a briefing. A Latest page lists headlines from official sources (FIDO Alliance, OpenID Foundation, NIST, CISA, W3C), refreshed on a schedule. The site is public, hosted on GitHub Pages, and republished every six hours.

## Capabilities and Constraints

- Ten curated trends and twenty recommendations in JSON (`data/trends.json`, `data/recommendations.json`) with taxonomy scales for maturity, impact, momentum, effort and horizon. Maturity, impact and momentum are editorial judgments, not measurements, and the site says so.
- Views: Dashboard (landscape plus filters), trend detail, Playbook, Latest feed, Watchlist with Markdown export, About.
- Binding: no tracking and no third parties. The site loads only its own files, the watchlist and preferences stay in the visitor's browser, and fonts are self-hosted.
- Binding: no unsourced statistics. A claim that cannot be confirmed is flagged "Needs verification" or omitted.
- Currently true but not confirmed as binding: the site is static HTML/CSS/JS with no build step and also opens from disk; text contrast meets 4.5:1 in light and dark, it works at 360px and respects reduced motion. Whether these are requirements for future work is undecided.

## Brand Commitments

The name "IAM Trend Radar". No other brand assets, voice rules or visual commitments have been made binding.

## Evidence on Hand

- Ten trends, each with cited sources and a review record in `docs/CONTENT-REVIEW.md` (primary-source checks done 2026-11-04; the IGA and ITDR entries were reworded where no primary source existed).
- Twenty recommendations with steps, success metrics and dependencies.
- A live feed in `data/feed.json` from five official feeds.
- Absent, and not to be fabricated: customers, testimonials, usage metrics, benchmarks, and analyst-report citations (no Gartner or similar source has been retrieved).

## Product Principles

1. A claim earns its place with a source; gaps are shown, not hidden.
2. A trend is only useful when it leads to an action, so every trend connects to ranked recommendations.
3. The visitor's privacy is not traded for convenience: nothing leaves their browser and no third party is involved.
4. One page serves practitioners and leaders: scannable first, depth on demand.
5. Editorial judgment is labelled as judgment and never presented as measurement.
