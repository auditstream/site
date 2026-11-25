# auditstream.dev

[![CI][ci-badge]][ci-url] [![MIT License][license-badge]][license-url]

Source for the [Auditstream](https://auditstream.dev) website and documentation — built with Astro 5 (static output), Content Collections (`src/content/docs/`), build-time Shiki dual-theme highlighting, and Pagefind static search.

## Repositories

| Repository | Role |
| :--- | :--- |
| [`auditstream/auditstream`](https://github.com/auditstream/auditstream) | Rust CLI & engine (`init`, `status`, `verify`, `history`, `export`), generated PostgreSQL triggers, and normative `spec/` |
| [`auditstream/auditstream-js`](https://github.com/auditstream/auditstream-js) | ESM-only TypeScript adapters (`@auditstream/node`, `@auditstream/prisma`, `@auditstream/drizzle`) and runnable examples |
| [`auditstream/.github`](https://github.com/auditstream/.github) | Organization profile, community health files, and shared security & contribution defaults |

## Development

Requires Node.js 22.12+ and pnpm 12+.

```bash
pnpm install
pnpm dev       # local dev server on http://localhost:4321
pnpm check     # Astro & TypeScript diagnostics (astro check)
pnpm build     # static build + Pagefind search index in dist/
pnpm preview   # preview dist/ locally (including live Pagefind search)
```

## Deployment

Deploy `dist/` as a static site (Cloudflare Pages, Netlify, or GitHub Pages):

- **Build command:** `pnpm build`
- **Output directory:** `dist`

[ci-badge]: https://img.shields.io/github/actions/workflow/status/auditstream/site/ci.yml?branch=main&style=flat&label=CI
[ci-url]: https://github.com/auditstream/site/actions/workflows/ci.yml
[license-badge]: https://img.shields.io/github/license/auditstream/site?style=flat
[license-url]: LICENSE
