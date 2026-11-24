# auditstream.dev

Landing page and documentation site for [Auditstream](https://github.com/auditstream/auditstream), built with Astro (static output), build-time Shiki dual themes, self-hosted variable fonts, Lenis smooth scroll, and Pagefind static search.

## Stack

- **Framework:** Astro 5 (`output: "static"`) + Content Collections (`src/content/docs/`)
- **Syntax highlighting:** Shiki at build time (`auditstream-dark` / `auditstream-light` switched via CSS, 0 KB client highlighter)
- **Typography:** Self-hosted `@fontsource-variable/mona-sans` (`wdth 75–125`) and `@fontsource/ibm-plex-mono`
- **Motion:** CSS Scroll-Driven Animations (`animation-timeline`) + Lenis (respects `prefers-reduced-motion`)
- **Search:** Pagefind static index built after `astro build` (`⌘K` or `/`)

## Development

Requires Node.js 22.12+ and pnpm 12+.

```bash
pnpm install
pnpm dev       # local dev server on http://localhost:4321
pnpm build     # static build + Pagefind index in dist/
pnpm preview   # preview dist/ locally (including live Pagefind search)
```

## Deployment

Deploy `dist/` as a static site on Cloudflare Pages, Netlify, or GitHub Pages using:

- **Build command:** `pnpm build`
- **Output directory:** `dist`
