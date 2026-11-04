---
name: IAM Trend Radar
description: A standards-track register for IAM trends. Ink on cool paper, a teal maturity ladder, hairline rules, tables instead of cards.
colors:
  paper: "#f7f9fb"
  surface: "#ffffff"
  surface-sunk: "#eef2f6"
  ink: "#14202e"
  ink-muted: "#4c5b6b"
  hairline: "#d5dde6"
  control-edge: "#6b7686"
  shell-ink: "#14202e"
  shell-muted: "#b9c4d0"
  focus-blue: "#0b5cad"
  amber-flag: "#8f4506"
  amber-wash: "#fff3d6"
  amber-text: "#5a3300"
  amber-edge: "#b45309"
  status-0: "#cfd8e1"
  status-1: "#5fb3aa"
  status-2: "#2f9b90"
  status-3: "#14776f"
  status-4: "#0b5f58"
  dark-paper: "#0f1720"
  dark-surface: "#151f2b"
  dark-surface-sunk: "#1c2836"
  dark-ink: "#e6edf5"
  dark-ink-muted: "#a8b5c4"
  dark-hairline: "#2b3949"
  dark-control-edge: "#8493a6"
  dark-shell: "#0a1118"
  dark-focus-gold: "#ffd166"
  dark-amber-flag: "#f0b45a"
  dark-amber-wash: "#3a2e08"
  dark-amber-text: "#ffe3a0"
  dark-amber-edge: "#c9a227"
  dark-status-0: "#2c3a49"
  dark-status-1: "#3f8f87"
  dark-status-2: "#53b3a8"
  dark-status-3: "#79d0c5"
  dark-status-4: "#a9efe6"
typography:
  display:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.6vw, 2.375rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.75rem"
  xl: "3.5rem"
components:
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "44px"
  button-default-hover:
    backgroundColor: "{colors.surface-sunk}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
    height: "44px"
  chip-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.3rem 0.75rem"
    height: "2.25rem"
  chip-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  badge:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.1rem 0.55rem"
  badge-warn:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-text}"
    rounded: "{rounded.sm}"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.7rem"
    height: "44px"
  site-header:
    backgroundColor: "{colors.shell-ink}"
    textColor: "{colors.surface}"
    height: "56px"
  register-table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  preview-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "1.25rem"
  notice:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-text}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
---

# Design System: IAM Trend Radar

## Overview

**Creative North Star: "Standards-Track Status"**

The site reads like the status page of a standards body: a cool paper ground, an ink-navy shell and ink type, hairline rules, and a register of rows where a card grid might have been. Every decision serves scanning. Maturity is the one thing the page colors, and it does so on a four-step teal ladder; everything else is ink, paper and gray-blue.

Density is moderate and tabular. Trends, recommendations and feed items are rows in tables with fixed score columns on the right and readable prose on the left. Controls are square (4px) and panels barely rounded (6px). Depth comes from hairline borders and tonal steps between paper, white surface and sunk surface; nothing floats. Light and dark both ship and follow `prefers-color-scheme`; there is no manual toggle.

**Key Characteristics:**
- Ink (`{colors.ink}`) is the action color: primary buttons, selected chips, selected tabs, the current nav item.
- Teal appears only as the four-step maturity ladder.
- Amber appears only for unconfirmed claims (flag, warn badge, notice).
- Registers (tables) replace cards; mobile reflows rows into stacked bordered rows.
- Flat: no box-shadow anywhere.
- One authored motion moment: the route entrance.

## Colors

A restrained cool-neutral palette with two semantic accents, each locked to one meaning. Dark mode redefines the same roles (names prefixed `dark-` in the frontmatter) and is selected by `prefers-color-scheme`.

### Primary
- **Ink Navy** (`{colors.ink}`): body text, headings, links, primary buttons, selected states, and the nav underline. In dark mode this role flips to near-white (`{colors.dark-ink}`) with the button text dark.
- **Shell Ink** (`{colors.shell-ink}`): the header bar. Darker in dark mode (`{colors.dark-shell}`). Shell secondary text is `{colors.shell-muted}`.

### Secondary
- **Maturity Teal ladder** (`{colors.status-1}` to `{colors.status-4}`, empty step `{colors.status-0}`): the four-step ladder, filled up to a trend's maturity. In dark mode the ramp inverts in lightness so the highest step is the lightest (`{colors.dark-status-4}`).

### Tertiary
- **Unconfirmed Amber** (`{colors.amber-flag}` text; wash `{colors.amber-wash}`, text `{colors.amber-text}`, edge `{colors.amber-edge}`): the "Needs verification" flag, warn badge and notice.

### Neutral
- **Cool Paper** (`{colors.paper}`): page ground.
- **White Surface** (`{colors.surface}`): tables, preview, inputs, footer.
- **Sunk Surface** (`{colors.surface-sunk}`): table header rows, hover fill, badges.
- **Slate Muted** (`{colors.ink-muted}`): secondary text, uppercase labels.
- **Hairline** (`{colors.hairline}`): decorative dividers and panel borders.
- **Control Edge** (`{colors.control-edge}`): borders of interactive controls only (inputs, buttons, chips, tabs), darker so they meet non-text contrast.
- **Focus Blue** (`{colors.focus-blue}`): the 3px focus outline; gold (`{colors.dark-focus-gold}`) in dark mode and on the shell.

### Named Rules
**The Teal-Means-Maturity Rule.** Teal is never used for links, buttons, success, or decoration. If it is teal, it states a maturity step.
**The Amber-Means-Unconfirmed Rule.** Amber marks a claim that could not be verified. It is never used for generic warnings, highlights or emphasis.
**The Ink-Is-Action Rule.** Anything the visitor can act on resolves to ink fill or ink text, selected or primary; selection is shown by inversion, not by a new hue.

## Typography

**Display, Body and Label Font:** Source Sans 3 Variable (self-hosted woff2, weights 200-900, Latin subset, `font-display: swap`), falling back to the system UI stack.
**Mono:** the system monospace stack, for code, pre and the import textarea only.

**Character:** One humanist sans does everything; hierarchy comes from weight (400, 550, 600, 650, 700), size and the uppercase label style, not from a second face. Tabular numerals are set on counts, dates and sources.

### Hierarchy
- **Display** (700, clamp 1.75rem to 2.375rem, 1.12, -0.02em): page h1.
- **Headline** (650, 1.3125rem, 1.25, -0.01em): h2 section titles.
- **Title** (650, 1.125rem, 1.3): h3, recommendation titles (1.0625rem), preview title (1.375rem).
- **Body** (400, 1.0625rem, 1.55): running text; prose measure 70ch, lead 62ch, feed summaries 80ch.
- **Label** (700, 0.8125rem, +0.06em, uppercase, muted): table column heads, field labels, spec-head terms, group titles, detail-aside headings. These label the data they sit over.
- Secondary sizes: 0.9375rem for meta and chips, 0.9063rem for badges.

### Named Rules
**The One Family Rule.** Source Sans 3 only. Do not add a display face or a second sans.
**The Label-Over-Data Rule.** Uppercase tracked labels appear only as column heads, field labels and definition terms attached to data, never as free-floating text above headings.

## Layout

Content sits in a 90rem max-width wrap with 1rem side padding; main has 1.75rem top and 3.5rem bottom padding. The dashboard is a three-column grid: 14rem filter rail, flexible table, 19rem preview (gap 1.75rem). The rail and preview are sticky at top 1rem. Trend detail is a readable main column (70ch measure) with a 16-22rem standards-and-sources aside (gap 2rem 3.5rem). The recommendation register caps at 76rem.

Spacing is rem-based and stepped: 0.25, 0.5, 1, 1.75, 3.5rem for structure; 0.3 to 0.9rem inside controls and cells. Breakpoints: below 88rem the preview drops; below 64rem the detail aside stacks and tables become stacked bordered rows; below 52rem the dashboard is one column and the rail collapses behind a filter toggle; below 48rem the nav scrolls horizontally and the landscape matrix becomes a stacked list; below 30rem the scale list is one column. Touch targets are 44px for buttons and inputs, 40px for tabs and compact buttons, 36px for table watch buttons.

## Elevation & Depth

Flat. There are no box-shadows. Depth is tonal and linear: paper ground, white surface for registers and panels, sunk surface for headers and hover, and 1px hairlines between. The Playbook filter bar is sticky with a 94 percent paper fill and a bottom hairline.

### Named Rules
**The No-Shadow Rule.** Separate with a hairline or a tonal step. Selection and hover are fill changes (ink inversion, a 3 to 7 percent ink tint), never lift.

## Shapes

Square and exact. Controls, chips, badges, tabs, the nav-less buttons and dots use a 4px radius; panels, tables, the preview, notices and empty states use 6px. The ladder and meter segments are near-square (1px). Borders are 1px; the nav current item gets a 3px underline; empty states use a dashed 1px border, as do empty matrix cells. Tabs are a joined segmented control with a single outer border.

## Components

### Shell and navigation
Ink bar, 56px high, bold wordmark with a mark icon at left, flat text nav at right. Nav links are shell-muted, semibold, with a 3px transparent bottom border; hover brightens to white and the current page keeps a 3px white underline. On narrow screens the nav is a single scrolling row at 44px.

### Buttons
Default is a white fill, control-edge border, 4px radius, 44px high, weight 600; hover fills with the sunk surface. Primary is an ink fill with inverse text. Compact is 40px. The watch button's pressed state gets a faint ink tint and an ink border and fills its icon. Disabled uses progress cursor and 0.7 opacity.

### Filter rail, chips and status radio rows
Chip radios are visually hidden inputs with a bordered 4px span (36px high, weight 550); selected inverts to ink with weight 650. Status radio rows are full-width rows containing the status ladder (10px steps), the label and a count; when selected the ladder recolors to inverse (full opacity for filled, 35 percent for empty). Focus draws the 3px outline on the span.

### Trend table (sortable)
A bordered 6px-radius table, sunk-surface header with label type, sortable headers as bare buttons with a rotating chevron, hairline row separators, a 99 percent-width trend column carrying a bold link and a muted category line, then fixed nowrap columns for status (ladder over text label), impact bars, source count, review date and a watch button. Hover is a 3 percent ink tint; selected row 7 percent.

### Preview block
A sticky bordered panel (6px, 1.25rem padding) showing title, a large ladder (28 by 12px steps), summary and a spec definition grid (8.5rem term column). It is hidden below 88rem and on the Landscape tab.

### Tabs (Table / Landscape)
Joined segmented buttons, 40px, white; the selected tab is ink-filled.

### Landscape matrix
An accessible table of maturity columns by impact rows, with 6px gaps between tinted cells (ink mixed into surface at 2, 4, 6 and 9 percent by impact), 6px radius and empty cells dashed and transparent. Each trend is a bordered 4px chip-link with a leading icon; rising trends use an ink icon. Column heads carry a ladder. On mobile it becomes labeled stacked blocks.

### Recommendation register
The same table language: a wide content column (title, paragraph at 70ch, chips) and nowrap score columns for horizon, effort, impact, updated and priority. Priority is a tabular number preceded by a 2.25rem by 0.5rem bar on a status-0 track filled in muted slate.

### Feed register
Date, source and headline columns; headline is a bold ink link underlined on hover, with a two-line clamped muted summary. Groups have label-style titles. Skeleton rows use a shimmering sunk-to-hairline gradient on 2px-radius lines.

### Spec-head
A bordered-block header on trend detail (top and bottom hairlines) with inline definition pairs: label-style term over its value, including a large ladder. Actions sit at the right.

### Badges, chips and flag
Badges and chips are 4px-radius bordered tags with sunk fill, always accompanied by text. The "new" badge is ink-filled. The warn badge and the inline flag use amber. Impact and effort meters are four ascending 3px bars at currentColor, filled bars at full opacity and the rest at 25 percent.

### Notice and empty states
Notice: amber wash, amber edge, 6px radius. Empty: white surface, dashed control-edge border, centered text.

### Route entrance motion
Views entering on a route change fade in and rise 6px over 0.34s with cubic-bezier(0.16, 1, 0.3, 1); in-place updates do not animate. Skeleton shimmer is the only other animation. Reduced motion disables all animation and transitions.

## Do's and Don'ts

### Do:
- **Do** keep teal for the maturity ladder and nothing else.
- **Do** keep amber for unconfirmed claims and pair it with the words ("Needs verification").
- **Do** use ink fill with inverse text for primary, selected and current states.
- **Do** present repeated records as registers: wide content column left, fixed nowrap score columns right, hairline row rules.
- **Do** use 4px radius for controls and 6px for panels and tables; use control-edge borders on anything interactive and hairline borders on anything that is only a container.
- **Do** pair every mark (ladder, bars, icons) with text.
- **Do** keep the 3px focus outline (blue in light, gold in dark and on the shell).

### Don't:
- **Don't** add box-shadows, gradients on surfaces, or glass; the only gradient is the skeleton shimmer.
- **Don't** turn registers into card grids.
- **Don't** introduce a second typeface or a new accent hue.
- **Don't** use teal or amber as decoration, hover color or link color.
- **Don't** rely on color alone to carry status or priority.
- **Don't** animate anything beyond the route entrance and skeleton.
