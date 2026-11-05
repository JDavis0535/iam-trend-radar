# Contributing data

All content lives in `data/` as UTF-8 JSON. Edit `trends.json` and `recommendations.json`. Change `taxonomy.json` only to add or rename an allowed value (the app and validator both read it).

## Workflow

1. Edit the JSON.
2. Run the validator from the project root:
   ```
   node scripts/validate-data.mjs
   ```
   Exit code 0 means valid, 1 means errors (listed as `ERROR ...`), 2 means the files could not be read. Warnings (`WARN ...`) do not fail the run. You can pass another folder as an argument: `node scripts/validate-data.mjs path/to/data`.
3. Regenerate the bundle the page actually loads:
   ```
   node scripts/build-data.mjs
   ```
   This validates again, then rewrites `data/data.js` and `dist/app.js`. Reload the page.
4. Update `data/meta.json`: set `lastUpdated` to today (YYYY-MM-DD) and bump `datasetVersion` (currently `2026.11.0`). `schemaVersion` must stay `1`.

Suggested cadence is a quarterly review of every item.

## Automated proposals

A weekly workflow proposes edits from the recent feed and merges them automatically when an independent check approves every one and none changes maturity or momentum; see the README. Anything else is left as a pull request (label `auto-content`) for a person. Automatically merged trends carry `needsVerification: true` with a note saying they were not reviewed by a person; clear the flag once you have checked them. When you review a held PR: open each linked headline and check that it supports the change, be sceptical of maturity and momentum changes, and look for unsourced numbers. Changed trends carry `needsVerification: true` with a note naming the feed items; once you have checked the claims, set `needsVerification` to `false` and clear `verificationNotes` in the same PR, then merge. Edit or delete any proposal you do not agree with before merging. When you add a trend, also add its keywords to `data/signal-rules.json`.

## Add or update a trend

Add an object to the array in `data/trends.json`. For an update, edit the fields and set `lastUpdated` to today.

```json
{
  "id": "passkeys-passwordless",
  "title": "Passkeys and passwordless authentication",
  "categories": ["authentication"],
  "maturity": "growing",
  "impact": "high",
  "momentum": "rising",
  "summary": "Up to 280 characters, plain text.",
  "whyItMatters": "Up to 500 characters, plain text.",
  "risks": ["Short strings"],
  "keyStandards": ["FIDO2 (WebAuthn + CTAP)"],
  "relatedTrends": ["zero-trust-identity"],
  "sources": [
    { "title": "...", "publisher": "...", "url": "https://...", "type": "standard", "published": "2021-04", "accessed": "2026-11-04" }
  ],
  "needsVerification": false,
  "verificationNotes": "",
  "lastUpdated": "2026-11-04"
}
```

| Field | Rule |
| :- | :- |
| `id` | Lowercase kebab-case (`a-z`, `0-9`, hyphens), unique, stable. Never reuse or rename an id: it is used in URLs (`#/trend/<id>`) and in saved watchlists. |
| `title` | Required. |
| `categories` | Non-empty array of category ids from `taxonomy.json`. |
| `maturity`, `impact`, `momentum` | One id each from the scales below. |
| `summary` | Required, at most 280 characters. |
| `whyItMatters` | Required, at most 500 characters. |
| `risks`, `keyStandards` | Arrays of non-empty strings (may be empty arrays). |
| `relatedTrends` | Array of existing trend ids, not including itself. Make links reciprocal; a one-way link produces a warning. |
| `sources` | At least 1 (2 or more preferred; one source produces a warning). See below. |
| `needsVerification`, `verificationNotes` | Boolean and string. See below. |
| `lastUpdated` | ISO date, YYYY-MM-DD. Items older than 180 days show a "May be stale" hint. |

Every trend needs at least one linked recommendation, so add one in the same change.

## Add or update a recommendation

Add an object to `data/recommendations.json`.

```json
{
  "id": "rec-passkey-pilot-workforce",
  "trendIds": ["passkeys-passwordless"],
  "title": "Pilot passkeys for a workforce population",
  "description": "Up to 400 characters, imperative voice.",
  "horizon": "now",
  "effort": "medium",
  "impact": "high",
  "steps": ["Three to five short action items", "...", "..."],
  "successMetrics": ["Qualitative or measurable, no invented targets"],
  "dependencies": [],
  "audience": ["iam-architect", "ciso"],
  "lastUpdated": "2026-11-04"
}
```

| Field | Rule |
| :- | :- |
| `id` | Lowercase kebab-case, unique. Existing ids all start with `rec-`. Any dependency that starts with `rec-` must be an existing recommendation id. |
| `trendIds` | Non-empty array of existing trend ids. |
| `title` | Required. |
| `description` | Required, at most 400 characters. Must not contain `%`, `$`, "billion" or "million". |
| `horizon`, `effort`, `impact` | One id each from the scales below. |
| `steps` | 3 to 5 non-empty strings. |
| `successMetrics` | At least 1 non-empty string. |
| `dependencies` | Array of strings: recommendation ids (starting `rec-`) or free text. May be empty. A recommendation cannot depend on itself. |
| `audience` | At least 1 lowercase kebab-case role, e.g. `iam-architect`, `security-manager`, `ciso`, `soc-analyst`, `app-owner`, `iga-engineer`, `compliance-lead`, `pam-engineer`. Not checked against a fixed list. |
| `lastUpdated` | ISO date. |

The priority score is not stored. It is computed in the browser as impact rank x 2 minus effort rank.

## Allowed values (`data/taxonomy.json`)

| Field | Values, in order |
| :- | :- |
| `categories` | `authentication`, `governance`, `privileged-access`, `threat-detection`, `workload-identity`, `cloud-entitlements`, `decentralized-identity`, `ai-identity`, `architecture`, `regulation` |
| `maturity` | `emerging` (early research or pilots), `growing` (early adopters; products shipping), `mainstream` (widely deployed), `established` (baseline expectation) |
| `impact` | `low` (incremental), `medium` (notable in a domain), `high` (significant change to risk or operations), `transformative` (reshapes how identity programs are designed) |
| `momentum` | `rising`, `steady`, `cooling` |
| `effort` | `low` (less than one quarter, small team), `medium` (one to two quarters), `high` (more than two quarters or a cross-org program) |
| `horizon` | `now` (0-3 months), `next` (3-9 months), `later` (9+ months) |

Ranks used for scoring and sorting: impact low=1 to transformative=4, effort low=1 to high=3. These are hard-coded in `js/filters.js` as well as listed in the taxonomy, so adding a new impact or effort value also requires a code change.

## Sources

Each source object needs:

- `title`, `publisher`: non-empty strings.
- `url`: must start with `https://` and parse as a URL. Prefer stable landing pages over deep links.
- `type`: one of `standard`, `vendor`, `analyst`, `government`, `research`, `news`. Label vendor and analyst material honestly and keep recommendations vendor-neutral.
- `published`: `YYYY-MM`, `YYYY-MM-DD` or `null` if unknown.
- `accessed`: ISO date you last checked the page.

Prefer standards bodies, government publications and primary documentation. The validator checks URL format only, not whether the link is reachable, so open each link yourself.

## No invented statistics

Do not write adoption percentages, breach costs, market sizes or growth figures from memory.

- The validator rejects `%`, `$`, "billion" and "million" in `summary` and `whyItMatters` unless `needsVerification` is `true` and the trend has a source. It rejects them outright in a recommendation `description`.
- Better: leave the number out, or link the source and flag the item.
- This check catches only those tokens. A figure written as "40 per cent" passes the validator but still breaks the policy, so review by eye.

## `needsVerification`

Set `needsVerification` to `true` when any claim is unconfirmed, the topic moves fast (AI agents, regulation dates, draft standards), or ratings are mostly editorial judgment. Then `verificationNotes` must say what to check; the validator errors if it is empty. When `needsVerification` is `false`, leave `verificationNotes` as an empty string (a non-empty value produces a warning). The UI shows a "Needs verification" badge with the notes, and the Markdown export includes them.

## Common validator errors

- `unknown category "x"` or `invalid impact "x"`: the value is not in `taxonomy.json`.
- `relatedTrends references unknown trend` or `trendIds references unknown trend`: typo in an id.
- `has no linked recommendation`: add a recommendation whose `trendIds` includes the trend.
- `url must start with https://`: fix the source URL.
- `steps must be 3-5 non-empty strings`: adjust the step count.
