---
title: TypeScript
description: ESM-only packages (v0.2.1) for Node.js, Prisma 7, Drizzle, Next.js 16, Hono, and Express — built around AsyncLocalStorage.run() with zero capture logic in JavaScript.
section: SDKs & Languages
order: 3
eyebrow: SDKS & LANGUAGES · TYPESCRIPT
---

[`auditstream-js`](https://github.com/auditstream/auditstream-js) ships three ESM-only packages (v0.2.1): `@auditstream/node` manages actor scope while ORM and HTTP adapters forward it to PostgreSQL.

> **Triggers live in PostgreSQL:** Adapters never create audit tables or triggers. Apply migrations first with the CLI ([Getting Started](/docs/getting-started/)).

## Pick an adapter

<div class="docs-cards">
  <a class="docs-card" href="/docs/typescript/prisma/">
    <div class="docs-card-tag">ORM Adapter</div>
    <div class="docs-card-title">Prisma</div>
    <div class="docs-card-desc">Prisma 7 SQL comments plugin plus transaction-local set_config fallback for Accelerate.</div>
  </a>
  <a class="docs-card" href="/docs/typescript/drizzle/">
    <div class="docs-card-tag">ORM Adapter</div>
    <div class="docs-card-title">Drizzle</div>
    <div class="docs-card-desc">Driver wrappers for node-postgres, postgres.js, and Neon HTTP plus Drizzle 1.x auditComment().</div>
  </a>
  <a class="docs-card" href="/docs/typescript/nextjs/">
    <div class="docs-card-tag">Framework</div>
    <div class="docs-card-title">Next.js</div>
    <div class="docs-card-desc">Bind verified sessions in Next.js 16 Route Handlers and Server Actions with withAudit and auditAction.</div>
  </a>
  <a class="docs-card" href="/docs/typescript/http/">
    <div class="docs-card-tag">Framework</div>
    <div class="docs-card-title">Hono &amp; Express</div>
    <div class="docs-card-desc">Attach authenticated actors and request trace metadata once at your HTTP middleware boundary.</div>
  </a>
  <a class="docs-card" href="/docs/typescript/activity-feed/">
    <div class="docs-card-tag">Pattern</div>
    <div class="docs-card-title">Activity Feed (BFF)</div>
    <div class="docs-card-desc">Expose allowlisted, keyset-paginated user timelines safely without leaking raw HistoryEntry rows.</div>
  </a>
</div>

## Packages (v0.2.1)

```bash
# Core runtime + HTTP/Next.js middlewares
pnpm add @auditstream/node

# Add your ORM adapter
pnpm add @auditstream/prisma   # Prisma 7.1+
pnpm add @auditstream/drizzle  # Drizzle 0.45 or 1.x
```

| Package (v0.2.1) | Responsibility | Peer dependencies |
| :--- | :--- | :--- |
| `@auditstream/node` | `AsyncLocalStorage` (`run()`), `audit.as()`, `audit.log()`, `audit.history()`, `audit.query()`, codec, `/express`, `/hono`, `/next` | `express`, `hono`, `next` (optional) |
| `@auditstream/prisma` | `auditstream()` SQL comments plugin (Prisma 7.1+) and `auditTransaction()` `set_config` fallback | `@prisma/client` `>=7.1.0 <8`, `@auditstream/node` |
| `@auditstream/drizzle` | Drizzle 1.x `auditComment()` plus `/pg` (`wrapPgPool`), `/postgres-js` (`wrapPostgresJs`), and `/neon-http` (`wrapNeonHttp`) | `drizzle-orm` `^0.45.2` or `1.x`, `@auditstream/node` |

> **Why ESM-only?** Dual ESM/CJS builds can load `@auditstream/node` twice and split `AsyncLocalStorage`, silently dropping actors. Shipping ESM-only with `@auditstream/node` as a peer dependency — and sharing state via `Symbol.for(...)` — eliminates that hazard across server bundles.

## Core API (`@auditstream/node`)

### Scope binding (`audit.as`)

Wrap awaited database work in `audit.as(actor, fn)` (or bind once per request via [Next.js](/docs/typescript/nextjs/) or [Hono & Express](/docs/typescript/http/) middleware):

```ts
import { audit } from "@auditstream/node";

await audit.as(
  {
    type: "ai_agent",
    id: "billing-agent",
    onBehalfOf: { type: "user", id: "usr_42" },
    tenant: "org_acme",
  },
  async () => {
    await db.invoice.update({
      where: { id: "inv_901" },
      data: { status: "paid" },
    });
  },
);
```

### History & app events

Read timelines and log non-database domain events with `@auditstream/node`:

```ts
import { audit, tagSql } from "@auditstream/node";

// Forward active actor comment when calling audit.log() on a raw pg.Pool
const exec = (sql: string, values: unknown[]) =>
  pool.query(tagSql(sql), values);

// Read a timeline from auditstream.changes (SELECT-only role)
const entries = await audit.history(exec, {
  table: "invoice",
  recordId: { id: "inv_901" },
  limit: 25,
});

// Record a non-DB domain event via auditstream.log_event()
await audit.log(exec, {
  action: "invoice.exported",
  target: { table: "invoice", id: "inv_901" },
  data: { format: "jsonl" },
});
```

### Paginated feeds

Use `audit.query()` for keyset-paginated feeds (zero `COUNT(*)`) across database rows (`source: "db"`) and app events (`source: "app"`):

```ts
import {
  type AuditQuery,
  type AuditQueryPage,
  audit,
} from "@auditstream/node";

const query: AuditQuery = {
  tenant: "org_acme",
  source: "app",
  opPrefix: "invoice.",
  since: "2026-11-01T00:00:00Z",
  limit: 25,
};

const page: AuditQueryPage = await audit.query(exec, query);
// Pass page.nextCursor as `cursor` when page.hasMore is true
```

> **Backend-only API:** `audit.query()` returns raw `HistoryEntry` rows with internal DB metadata (`db_user`, `xact_id`, `table_oid`, `actor_source`) and raw `before`/`after` payloads. Enforce auth and tenant checks on the server and project rows into an allowlisted DTO before sending to browsers — see the [Activity Feed (BFF) guide](/docs/typescript/activity-feed/) and [`examples/next-prisma`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma).

## Concurrency rules

Verified against live PostgreSQL concurrency tests:

- **Always await inside `audit.as()`.** Prisma and Drizzle queries are lazy; unawaited returns dropped the actor in 7/7 tests, so `audit.as()` awaits its callback inside the scope.
- **Read actors at `pool.query` entry.** Reading inside `client.query` misattributed 4/20 queued writes; reading at `pool.query` entry produced **0 wrong actors across 60+ concurrent writes**.
- **Use `AsyncLocalStorage.run()` only.** `enterWith()` is unavailable on Cloudflare Workers (`nodejs_als` or compat ≥ 2026-08-04); in Next.js 16, wrap handlers with `withAudit` and `auditAction`.
- **Keep app events explicit.** Adapters never build DB audit rows; log non-DB events (exports, logins) via `audit.log(exec, event)` calling `auditstream.log_event()`.

## Hot-path caching

`audit.as()` deeply freezes each `AuditScope` and caches encoded tags in a `WeakMap` (mutable scopes are never cached), while `isTagged()` runs an O(1) tail scan. On Node v26.13.1, `encodeScope()` takes **10.4 ns** (**134× faster**) and `tagSql()` runs **5.0×–6.4× faster** ([Benchmarks & Limits](/docs/evidence/)).
