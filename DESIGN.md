---
name: Auditstream
description: Warm Architectural Paper (Light-Only) editorial design system for PostgreSQL audit trail engineering — crisp gallery surfaces, Editorial Cobalt, Committed Emerald, Diff Vermilion, and IBM Plex typography.
colors:
  editorial-cobalt: "#1d4ed8"
  editorial-cobalt-hover: "#1e40af"
  editorial-cobalt-soft: "#eff6ff"
  committed-emerald: "#047857"
  committed-emerald-soft: "#ecfdf5"
  diff-vermilion: "#b91c1c"
  diff-vermilion-soft: "#fef2f2"
  paper-ground: "#fafaf8"
  paper-ground-alt: "#f3f3ee"
  paper-code-tint: "#eeede7"
  paper-surface: "#ffffff"
  paper-rule: "#e6e6df"
  paper-rule-strong: "#d4d4ca"
  ink-primary: "#0f172a"
  ink-prose: "#334155"
  ink-secondary: "#475569"
  ink-muted: "#5b6676"
typography:
  display:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.85rem)"
    fontWeight: 600
    lineHeight: 1.07
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "clamp(2rem, 3.2vw, 2.85rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  kpi:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "1.35rem"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.02em"
  subhead:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.24
    letterSpacing: "-0.02em"
  title:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.32
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1rem, 1.1vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  body:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.72
    letterSpacing: "0em"
  body-sm:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  ui:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0em"
  code:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.84375rem"
    fontWeight: 400
    lineHeight: 1.68
    letterSpacing: "0em"
  code-sm:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  code-2xs:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.65rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  label:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
  code-xs:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.03em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "0.5rem"
  sm: "0.85rem"
  md: "1.35rem"
  lg: "2.25rem"
  xl: "3.25rem"
  section: "clamp(3.5rem, 6vw, 5.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.paper-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "0.65rem 1.25rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "0.65rem 1.25rem"
    height: "2.75rem"
  chip-action:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 0.65rem"
    height: "2rem"
  surface-frame:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "1.05rem 1.2rem"
  focal-card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "1.5rem 1.65rem"
  status-chip:
    backgroundColor: "{colors.committed-emerald-soft}"
    textColor: "{colors.committed-emerald}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.16rem 0.6rem"
  nav-bar:
    backgroundColor: "{colors.paper-ground}"
    textColor: "{colors.ink-primary}"
    height: "3.75rem"
---

# Design System: Auditstream

## Overview

**Creative North Star: "Warm Architectural Paper" (Light-Only)**

Auditstream's visual language prioritizes calm editorial restraint, generous whitespace, and zero visual friction. Every page — homepage, documentation, search modal, and error view — lives in a single cohesive Light-Only surface system built on warm gallery off-white (`#fafaf8`), pure white elevated frames (`#ffffff`), delicate warm stone hairlines (`#e6e6df` / `#d4d4ca`), and crisp slate ink (`#0f172a`).

Decorative clutter — dark-mode toggles, jarring light-to-dark section flips, uppercase kickers above headings, stacked card grids, corner brackets, and heavy client runtimes — is intentionally removed so PostgreSQL evidence, SQL attribution, and immutable diffs speak clearly on their own.

**Key Characteristics:**
- 100% Light-Only system across homepage, docs, search dialog, and 404 page with zero theme flash and single-theme Light Shiki syntax highlighting.
- Subtle architectural corner radii (`6px` controls, `10px` code and reference frames, `12px` focal cards, `999px` small status pills).
- Strict semantic color isolation: Editorial Cobalt (`#1d4ed8`) for navigation, focus, links, and active SQL comment tags; Committed Emerald (`#047857`) for verified persistence and added diffs; Diff Vermilion (`#b91c1c`) for removed values and 404/denial states.
- Self-hosted IBM Plex Sans paired with IBM Plex Mono (`tabular-nums`, ligatures disabled) at comfortable Retina reading sizes (`>= 12px` everywhere, `13.5px` monospace code).
- One single spacious focal micro-motion (`AuditPulseVisual`) synchronized on a calm `6.0s` master CSS clock rather than scattered animations or video payloads.

## Colors

Every foreground/background pair — including muted labels (`#5b6676`), syntax tokens, and tinted diff chips — is calibrated to pass WCAG 2.1 AA (`>= 4.5:1`) on `#fafaf8`, `#f3f3ee`, and `#ffffff`.

### Primary
- **Editorial Cobalt** (`#1d4ed8`, hover `#1e40af`, soft tint `#eff6ff`): Reserved for active links, keyboard focus rings, active tab indicators, trailing `/*auditstream='…'*/` SQL comment pills, and the live capture pulse.

### Secondary
- **Committed Emerald** (`#047857`, soft tint `#ecfdf5`): Signals verified persistence, `Recorded` confirmation chips, `PG Trigger` capture state, and `+` added JSONB/SQL diff lines.

### Tertiary
- **Diff Vermilion** (`#b91c1c`, soft tint `#fef2f2`): Exclusively denotes `−` removed diff values and error status badges.

### Neutral
- **Warm Architectural Paper surfaces:** Primary ground (`#fafaf8`), subtle alternating band & code bar surface (`#f3f3ee`), crisp white frame surface (`#ffffff`), delicate rule (`#e6e6df`), and strong structural rule (`#d4d4ca`).
- **Slate Ink hierarchy:** Primary heading ink (`#0f172a`), high-comfort long-form docs prose (`#334155`), secondary body copy (`#475569`), and muted metadata labels (`#5b6676`, `>= 5.1:1` even on `#f3f3ee`).

### Named Rules
**The Light-Only Cohesion Rule.** Every route, code block, modal, and visual uses the same Warm Architectural Paper palette. Never introduce dark sections, inverted theme bands, or dual-theme CSS overhead.

**The Channel Isolation Rule.** Editorial Cobalt is for identity and navigation; Committed Emerald is for verified persistence; Diff Vermilion is for removals and error markers. Never mix channels or apply semantic colors decoratively.

## Typography

**Display & UI Font:** IBM Plex Sans (`400`, `500`, `600` weights, self-hosted Latin WOFF2, system sans fallback)
**Code & Data Font:** IBM Plex Mono (`400`, `500`, `600` weights, self-hosted Latin WOFF2, `tabular-nums`, ligatures disabled)

### Hierarchy
- **Display** (`600`, `clamp(2.45rem, 5.2vw, 4rem)`, line-height `1.07`, tracking `-0.03em`): Centered two-line hero headline only.
- **Headline** (`600`, `clamp(1.75rem, 3vw, 2.5rem)`, line-height `1.12`, tracking `-0.025em`, `text-wrap: balance`): Landing section headings and documentation `h1` page titles.
- **Metric** (`600` mono, `clamp(2rem, 3.2vw, 2.85rem)`, line-height `1.04`, tracking `-0.03em`, `tabular-nums`): Measured proof strip figures (`+3.2%`, `2.4M`, `0.101 ms`).
- **Subhead & Title** (`600`, `1.375rem` / `1.0625rem`): Documentation `h2`/`h3` headings and borderless pillar headings.
- **Body & Prose** (`400`, `1rem` at `1.72` line-height in docs; `0.9375rem`–`1.125rem` on landing): Constrained to `64ch`–`68ch` for sustained reading comfort.
- **Code** (`400` mono, `0.84375rem` / `13.5px`, line-height `1.68`): Single-theme Light Shiki blocks and the Hero capture visual.
- **Label** (`500` mono, `0.75rem` / `12px`, tracking `0.04em`): Minimum size across the entire site — used for code headers, status pills, table column headers, and keyboard hints.

### Named Rules
**The Zero-Kicker Rule.** Headings carry their own authority. Never place uppercase eyebrows, kickers, or section-number prefixes above headings.

**The 12px Legibility Floor.** No visible text, badge, code label, or diagram annotation drops below `0.75rem` (`12px`).

## Layout

All pages share a calm container (`max-width: 76rem`) with responsive horizontal padding (`clamp(1.25rem, 4vw, 2.5rem)`). The centered Hero and `AuditPulseVisual` sit inside a focused `60rem` (`960px`) frame.

The homepage consists of five airy editorial blocks separated by generous vertical rhythm (`clamp(3.5rem, 6vw, 5.5rem)`) and single hairline borders: Hero + focal diagram, 3 borderless core pillars, `5fr / 7fr` code showcase, subtle `#f3f3ee` measured proof band, and a 3-line tabbed quickstart followed by a static minimal footer.

Documentation pages render a widened 3-column reading layout above `1280px` (`max-width: 84rem`, `14rem` permanent sidebar, `minmax(0, 52rem)` center column keeping prose at `68ch` while tables, code frames, KPI tiles, and path cards span full width, and `13.5rem` sticky TOC), collapsing gracefully to 2 columns (`>= 960px`) and single column (`< 960px`) with accessible `<details>` disclosures.

## Elevation & Depth

Surfaces remain completely flat at rest, separated by `1px` hairlines (`#e6e6df` / `#d4d4ca`) and tonal warmth (`#fafaf8`, `#f3f3ee`, `#ffffff`).

### Shadow Vocabulary
- **Focal Shadow** (`0 1px 2px rgba(15, 23, 42, 0.04), 0 18px 44px -16px rgba(15, 23, 42, 0.09)`): Reserved exclusively for the Hero focal visual (`AuditPulseVisual`) and the floating `SearchModal` dialog. Every other container on the site is flat.

## Shapes

- **Controls & Diffs (`6px`):** Primary/secondary buttons, action chips, tabs, inline code badges, install chip, and diff bands.
- **Frames (`10px`):** Code frames, documentation tables, blockquotes, mobile disclosures, and pagination links.
- **Focal Surfaces (`12px`):** Hero `AuditPulseVisual` card and `SearchModal` dialog.
- **Small Status Pills (`999px`):** `PG Trigger` bridge pill and `Recorded` / `404` status chips.

## Components

### Buttons
- **Primary:** Deep slate fill (`#0f172a`) with crisp white text (`#ffffff`), `6px` radius, `2.75rem` (`44px`) height, shifting to Editorial Cobalt (`#1d4ed8`) on hover.
- **Secondary:** Crisp white surface (`#ffffff`) with `#d4d4ca` border and `#0f172a` text, warming to `#f3f3ee` with `#0f172a` border on hover.

### Navigation
- **Desktop:** Sticky translucent warm paper header (`rgba(250, 250, 248, 0.88)` + `backdrop-filter: blur(12px)`), BrandMark + `Auditstream` on left, strictly 3 links (`Docs`, `Benchmarks`, `GitHub ↗`) + `Search ⌘K` chip on right.
- **Mobile (`<= 768px`):** `44×44px` Search and Menu drawer controls with `Escape` and outside-click dismissal.

### AuditPulseVisual (Single Focal Micro-Motion)
- **Structure:** Generous `960px` white focal card topped by a 3-step synced progress strip (`1. Tag query → 2. Trigger captures → 3. Diff recorded`), containing two spacious DOM panes (`APPLICATION WRITE` and `auditstream.changes`) joined by a crisp `112px` inline SVG vector bridge with moving cobalt/emerald packets and a decisive emerald `PG Trigger` pill (stacking vertically with a `48px` vertical SVG connector below `820px`).
- **Motion & Accessibility:** Single `6.0s` master CSS clock transitioning clearly from a quiet dashed "Waiting for commit…" ledger slot to a micro-staggered stamped audit diff row + stroke-drawn `✓ Recorded` badge with a calm `~2s` reading hold (`65%–92%`), automatic offscreen/hidden pause via `IntersectionObserver` + `visibilitychange`, and complete settled static rendering under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** keep the entire site 100% Light-Only on the Warm Architectural Paper palette.
- **Do** verify every foreground/background combination passes WCAG 2.1 AA (`>= 4.5:1`), including syntax tokens and tinted diff rows.
- **Do** reserve `--shadow-focal` strictly for `AuditPulseVisual` and `SearchModal`, keeping all other frames flat with 1px hairlines.
- **Do** use full 1px borders on rounded elements and keep every font size `>= 12px` (`0.75rem`).
- **Do** use IBM Plex Mono with `tabular-nums` and `font-variant-ligatures: none` strictly for code, SQL, CLI commands, and benchmark figures.

### Don't:
- **Don't** reintroduce dark mode CSS, theme toggles, dual-theme Shiki variables, or inverted dark sections.
- **Don't** place kickers, eyebrows, or section numbers above headings.
- **Don't** use one-sided accent bars on rounded boxes, corner registration brackets, sticky curtain footers, or decorative video files.
- **Don't** fabricate customer logos, testimonials, or unmeasured performance claims.
