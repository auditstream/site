---
name: Auditstream
description: Dual-theme editorial design system for database audit trail engineering — Warm Architectural Paper (Light) and Forensic Ledger Obsidian (Dark), paired with Editorial/Signal Cobalt, Committed Emerald, Diff Vermilion, and IBM Plex typography.
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
  paper-code-tint: "#f1f0eb"
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
  docs-title:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.85rem, 3vw, 2.35rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.028em"
  metric:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "clamp(1.85rem, 2.6vw, 2.35rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  kpi:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "1.35rem"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.02em"
  kpi-sm:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.02em"
  subhead:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.32
    letterSpacing: "-0.015em"
  docs-subhead:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "1.03125rem"
    fontWeight: 600
    lineHeight: 1.32
    letterSpacing: "-0.012em"
  lead:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1rem, 1.1vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0em"
  body:
    fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
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
  label:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
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

**Creative North Star: "Warm Architectural Paper" (Light) & "Forensic Ledger Obsidian" (Dark)**

Auditstream's visual language prioritizes calm editorial restraint, generous whitespace, and zero visual friction across both Light and Dark themes. Light mode rests on warm gallery off-white (`#fafaf8`), pure white elevated frames (`#ffffff`), delicate warm stone hairlines (`#e6e6df` / `#d4d4ca`), and crisp slate ink (`#0f172a`). Dark mode aligns directly to the official brand kit's Forensic Ledger Obsidian palette: `#0c0f13` ground, `#11161d` alternate bands, `#131820` elevated surfaces, `#222a36` / `#323d4f` structural hairlines, `#edf1f5` Mineral White ink, and `#6ba6ff` Signal Cobalt accents.

Decorative clutter — uppercase kickers above headings, stacked card grids, corner brackets, neon dark-mode glows, and heavy client runtimes — is intentionally avoided so database evidence, SQL attribution, and immutable diffs speak clearly on their own.

**Key Characteristics:**
- Cohesive dual-theme system (Light & Dark) across homepage, docs, search dialog, and 404 page with an inline `<head>` blocking script (`0ms` FOUC), `prefers-color-scheme` default + `localStorage` persistence, and zero-JS CSS fallback.
- Dual-theme build-time Shiki syntax highlighting (`auditstream-light` + `auditstream-dark`) with every syntax token verified `>= 5.3:1` WCAG AA in both themes.
- Signature `E4+ · Eco Duplo` `BrandMark` (`src/components/BrandMark.astro`): dual-master geometric vector automatically swapping between standard light geometry (`#0f172a` + `#1d4ed8`) and `-2.5%` optically-thinned dark geometry (`#edf1f5` + `#6ba6ff`) to prevent halation on `#0c0f13`.
- Subtle architectural corner radii (`6px` controls, `10px` code and reference frames, `12px` focal cards, `999px` small status pills).
- Strict semantic color isolation: Cobalt (`#1d4ed8` light / `#6ba6ff` dark) for navigation, focus, links, and active SQL comment tags; Committed Emerald (`#047857` light / `#34d399` dark) for verified persistence and added diffs; Diff Vermilion (`#b91c1c` light / `#f87171` dark) for removed values and 404/denial states.
- Self-hosted IBM Plex Sans paired with IBM Plex Mono (`tabular-nums`, ligatures disabled) at comfortable Retina reading sizes (`>= 12px` everywhere, `15px` / `0.9375rem` docs prose on a `47rem` reading rail, `13.5px` monospace code).
- One single spacious focal micro-motion (`AuditPulseVisual`) driven by a calm `7.8s` JS `data-phase` state machine (`2.4s` / `1.9s` / `3.5s`) with genuine `420–460ms` CSS transitions and separated two-layer one-shot SVG packet travel rather than scattered animations or video payloads.

## Colors

Every foreground/background pair — including muted labels (`#5b6676`), syntax tokens, and tinted diff chips — is calibrated to pass WCAG 2.1 AA (`>= 4.5:1`) on `#fafaf8`, `#f3f3ee`, and `#ffffff`.

### Primary
- **Editorial Cobalt** (`#1d4ed8`, hover `#1e40af`, soft tint `#eff6ff`): Reserved for active links, keyboard focus rings, active tab indicators, trailing `/*auditstream='…'*/` SQL comment pills, and the live capture pulse.

### Secondary
- **Committed Emerald** (`#047857`, soft tint `#ecfdf5`): Signals verified persistence, `Recorded` confirmation chips, `PG Trigger` capture state, and `+` added JSONB/SQL diff lines.

### Tertiary
- **Diff Vermilion** (`#b91c1c`, soft tint `#fef2f2`): Exclusively denotes `−` removed diff values and error status badges.

### Neutral
- **Warm Architectural Paper surfaces:** Primary ground (`#fafaf8`), subtle alternating band & code bar surface (`#f3f3ee`), quiet inline code tint (`#f1f0eb` via `--code-bg`), crisp white frame surface (`#ffffff`), delicate rule (`#e6e6df`), and strong structural rule (`#d4d4ca`).
- **Slate Ink hierarchy:** Primary heading ink (`#0f172a`), high-comfort long-form docs prose (`#334155`), secondary body copy (`#475569`), and muted metadata labels (`#5b6676`, `>= 5.1:1` even on `#f3f3ee`).

### Named Rules
**The Dual-Theme Cohesion Rule.** Every route, code block, modal, table, and diagram adapts cleanly between Warm Architectural Paper (Light) and Forensic Ledger Obsidian (Dark) via semantic CSS tokens — never jarring single-section dark inversions or uncalibrated gray text.

**The Channel Isolation Rule.** Cobalt is for identity and navigation; Committed Emerald is for verified persistence; Diff Vermilion is for removals and error markers. Never mix channels or apply semantic colors decoratively.

## Typography

**Display & UI Font:** IBM Plex Sans (`400`, `500`, `600` weights, self-hosted Latin WOFF2, system sans fallback)
**Code & Data Font:** IBM Plex Mono (`400`, `500`, `600` weights, self-hosted Latin WOFF2, `tabular-nums`, ligatures disabled)

### Hierarchy
- **Display** (`600`, `clamp(2.25rem, 5vw, 3.85rem)`, line-height `1.07`, tracking `-0.03em`): Centered two-line hero headline only.
- **Headline & Docs Title** (`600`, `clamp(1.75rem, 3vw, 2.5rem)` on landing; `clamp(1.85rem, 3vw, 2.35rem)`, tracking `-0.028em` for documentation `h1` page titles, line-height `1.12`, `text-wrap: balance`).
- **Metric** (`600` mono, `clamp(1.85rem, 2.6vw, 2.35rem)`, line-height `1.06`, tracking `-0.03em`, `tabular-nums`): Measured proof strip figures (`+3.2%`, `2.4M`, `0.101 ms`, `~15k/s`).
- **Subhead & Title** (`600`, `1.3125rem` docs `h2` at `1.25` line-height, `1.03125rem` docs `h3` at `-0.012em` tracking, and `1.0625rem` landing borderless pillar headings).
- **Body & Prose** (`400`, `0.9375rem` / `15px` at `1.7` line-height in docs with `1.03125rem` / `1.58` page descriptions; `0.9375rem`–`1.125rem` on landing): Flows across the unified `47rem` (`752px`) reading rail in docs with `text-wrap: pretty` for even visual rhythm with tables, steps, callouts, and code frames.
- **Code** (`400` mono, `0.84375rem` / `13.5px`, line-height `1.68`; inline code `0.84em` on `#f1f0eb`): Single-theme Light Shiki blocks and the Hero capture visual.
- **Label** (`500` mono, `0.75rem` / `12px`, tracking `0.04em`): Minimum size across the entire site — used for code headers, status pills, docs meta pills, step numbers, table column headers, and keyboard hints.

### Named Rules
**The Zero-Kicker Rule.** Headings carry their own authority. Never place uppercase eyebrows, kickers, or section-number prefixes above headings.

**The 12px Legibility Floor.** No visible text, badge, code label, or diagram annotation drops below `0.75rem` (`12px`).

## Layout

All pages share a calm container (`max-width: 76rem`) with responsive horizontal padding (`clamp(1.25rem, 4vw, 2.5rem)`). The centered Hero and `AuditPulseVisual` sit inside a focused `60rem` (`960px`) frame.

The homepage consists of five airy editorial blocks separated by generous vertical rhythm (`clamp(3.5rem, 6vw, 5.5rem)`) and single hairline borders: Hero + focal diagram, 3 borderless core pillars, `5fr / 7fr` code showcase, subtle `#f3f3ee` measured proof band, and a 3-line tabbed quickstart followed by a static minimal footer.

Documentation pages render a harmonious 3-column reading layout above `1280px` (`max-width: 84rem`, `13.5rem` permanent sidebar, unified full-width `minmax(0, 47rem)` / `752px` center reading rail across prose, tables, code frames, KPI tiles, spec grids, step flows, meta pills, callouts, and path cards, and `12.5rem` sticky TOC separated by generous `2.5rem` gutters), collapsing gracefully to 2 columns (`960px–1279px`, `12.75rem` sidebar + `47rem` rail with `2.25rem` gap) and single column (`< 960px`) with accessible `<details>` disclosures.

## Elevation & Depth

Surfaces remain completely flat at rest, separated by `1px` hairlines (`#e6e6df` / `#d4d4ca`) and tonal warmth (`#fafaf8`, `#f3f3ee`, `#ffffff`).

### Shadow Vocabulary
- **Focal Shadow** (`0 1px 2px rgba(15, 23, 42, 0.04), 0 18px 44px -16px rgba(15, 23, 42, 0.09)`): Reserved exclusively for the Hero focal visual (`AuditPulseVisual`) and the floating `SearchModal` dialog. Every other container on the site is flat.

## Shapes

- **Controls & Diffs (`6px`):** Primary/secondary buttons, action chips, tabs, inline code badges, install chip, and diff bands.
- **Frames (`10px`):** Code frames, documentation tables, blockquotes, mobile disclosures, and pagination links.
- **Focal Surfaces (`12px`):** Hero `AuditPulseVisual` card and `SearchModal` dialog.
- **Small Status Pills (`999px`):** `DB Trigger` bridge pill and `Recorded` / `404` status chips.

## Components

### Buttons
- **Primary:** Deep slate fill (`#0f172a`) with crisp white text (`#ffffff`), `6px` radius, `2.75rem` (`44px`) height, shifting to Editorial Cobalt (`#1d4ed8`) on hover.
- **Secondary:** Crisp white surface (`#ffffff`) with `#d4d4ca` border and `#0f172a` text, warming to `#f3f3ee` with `#0f172a` border on hover.

### Navigation & BrandMark
- **BrandMark (`E4+ · Eco Duplo`):** Geometric `256×256` SVG emblem (`src/components/BrandMark.astro`) combining a leading Editorial Cobalt (`var(--accent)`) tilted crescent echo with a primary slate (`currentColor`) monolith cut by two parallel ledger slots (`fill-rule="evenodd"`), paired with `Auditstream` in header and footer lockups.
- **Desktop:** Sticky translucent warm paper header (`rgba(250, 250, 248, 0.88)` + `backdrop-filter: blur(12px)`), `E4+ · Eco Duplo` BrandMark + `Auditstream` on left, strictly 3 links (`Docs`, `Benchmarks`, `GitHub ↗`) + `Search ⌘K` chip on right.
- **Mobile (`<= 768px`):** `44×44px` Search and Menu drawer controls with `Escape` and outside-click dismissal.

### Editorial Docs Components
- **Meta Pills (`.docs-meta-pills` / `.docs-meta-pill`):** Quiet pill-shaped monospace metadata badges (`#ffffff` surface, `1px solid var(--rule)`, `0.75rem`) replacing dense release/status prose.
- **Step Flow (`.docs-steps` / `.docs-step`):** Three-column (`>= 640px`) architectural step cards (`#ffffff` surface, `1px solid var(--rule)`, Editorial Cobalt monospace step index, `0.9375rem` title, `0.84375rem` description).
- **Info Callout & Blockquotes (`.docs-callout-info`, `blockquote`):** Soft Editorial Cobalt notice banners (`--accent-soft` fill + `--accent-border`) for key status notes, paired with flat gallery-white (`#ffffff`) hairline-bordered blockquotes (`0.875rem`).

### AuditPulseVisual (Single Focal Micro-Motion)
- **Structure:** Generous `960px` white focal card topped by an interactive 3-step button strip (`1. Tag query → 2. Trigger fires → 3. Diff recorded`) cycling Editorial Cobalt → Crisp Slate + emerald dot → Committed Emerald, containing two clean `#ffffff` DOM panes (`APPLICATION WRITE` and `auditstream.changes`, zero pane washes) joined by a crisp `112px` inline SVG vector bridge with separated two-layer cobalt/emerald packets and a soft Committed Emerald `DB Trigger` pill (mirroring the exact two-leg structure vertically in a `56px` SVG connector below `820px`).
- **Motion & Accessibility:** Interruptible `7.8s` JS `data-phase="1"|"2"|"3"` state machine (`2.4s` / `1.9s` / `3.5s`, initial `1.2s` hold on SSR-settled `data-phase="3"`), smooth `420–460ms` transitions, persistent fixed-width morphing status chip (`Pending` → `Capturing` → soft Committed Emerald `✓ Recorded` matching `status-chip`), quiet dashed waiting slot revealing reversible staggered diff rows, accurate pause/resume on hover, focus, offscreen (`IntersectionObserver`), and tab hidden (`visibilitychange`), and interactive step inspection even under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** keep both Light (`#fafaf8`) and Dark (`#0c0f13`) themes calibrated via semantic CSS tokens with zero FOUC.
- **Do** verify every foreground/background combination passes WCAG 2.1 AA (`>= 4.5:1`) in both themes, including syntax tokens and tinted diff rows.
- **Do** reserve `--shadow-focal` strictly for `AuditPulseVisual` and `SearchModal`, keeping all other frames flat with 1px hairlines.
- **Do** use full 1px borders on rounded elements and keep every font size `>= 12px` (`0.75rem`).
- **Do** use IBM Plex Mono with `tabular-nums` and `font-variant-ligatures: none` strictly for code, SQL, CLI commands, and benchmark figures.

### Don't:
- **Don't** hardcode light-only or dark-only hex colors in components or leave Shiki blocks un-themed in Dark Mode.
- **Don't** place kickers, eyebrows, or section numbers above headings.
- **Don't** use one-sided accent bars on rounded boxes, corner registration brackets, sticky curtain footers, neon glows, or decorative video files.
- **Don't** fabricate customer logos, testimonials, or unmeasured performance claims.
