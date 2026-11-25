---
title: TypeScript
description: ESM-only packages (v0.2.0) for Node.js, Hono, Express, Next.js 16, Prisma 7, and Drizzle — built around AsyncLocalStorage.run() with zero capture logic in JS.
section: SDKs & Languages
order: 3
eyebrow: SDKS & LANGUAGES · TYPESCRIPT
---

[`auditstream-js`](https://github.com/auditstream/auditstream-js) ships three ESM-only packages (v0.2.0): `@auditstream/node` manages actor scope while ORM adapters forward it to PostgreSQL.

## Install

```bash
# Prisma 7.1+
pnpm add @auditstream/node @auditstream/prisma

# Drizzle 0.45 or 1.x
pnpm add @auditstream/node @auditstream/drizzle
```

> **Triggers live in PostgreSQL:** Adapters never create audit tables or triggers. Apply migrations first with the CLI ([Getting Started](/docs/getting-started/)).

| Package (v0.2.0) | Responsibility | Peer dependencies |
| :--- | :--- | :--- |
| `@auditstream/node` | `AsyncLocalStorage` (`run()`), `audit.as()`, `audit.log()`, `audit.history()`, `audit.query()`, codec, `/express`, `/hono`, `/next` | `express`, `hono`, `next` (optional) |
| `@auditstream/prisma` | `auditstream()` SQL comments plugin (Prisma 7.1+) and `auditTransaction()` `set_config` fallback | `@prisma/client` `>=7.1.0 <8`, `@auditstream/node` |
| `@auditstream/drizzle` | Drizzle 1.x `auditComment()` plus `/pg` (`wrapPgPool`), `/postgres-js` (`wrapPostgresJs`), and `/neon-http` (`wrapNeonHttp`) | `drizzle-orm` `^0.45.2` or `1.x`, `@auditstream/node` |

> **Why ESM-only?** Dual ESM/CJS builds can load `@auditstream/node` twice and split `AsyncLocalStorage`, silently dropping actors. Shipping ESM-only with `@auditstream/node` as a peer dependency — and sharing state via `Symbol.for(...)` — eliminates that hazard across server bundles.

## Framework middleware

Bind the actor once at your HTTP or action boundary instead of wrapping every database call manually.

### Hono

Use `@auditstream/node/hono`:

```ts
import { Hono } from "hono";
import { auditstream } from "@auditstream/node/hono";

const app = new Hono();
app.use(
  "*",
  auditstream({
    actor: (c) => {
      const userId = c.get("authUserId");
      return userId ? { type: "user", id: userId } : undefined;
    },
    context: (c) => ({
      requestId: c.req.header("x-request-id") ?? undefined,
      source: "api",
    }),
  }),
);
```

### Express

Use `@auditstream/node/express`:

```ts
import express from "express";
import { auditstream } from "@auditstream/node/express";

const app = express();
app.use(
  auditstream({
    actor: (req) =>
      req.user ? { type: "user", id: req.user.id } : undefined,
  }),
);
```

### Next.js 16

`AsyncLocalStorage` does not cross Next.js `proxy`; bind the verified session inside `withAudit` and `auditAction`:

```ts
import { withAudit, auditAction } from "@auditstream/node/next";

export const POST = withAudit(
  async (request: Request) => {
    // Awaited Prisma / Drizzle writes here carry the actor
    return new Response("ok");
  },
  { actor: async () => await getVerifiedSessionActor() },
);

export const approveInvoice = auditAction(
  async (invoiceId: string) => {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "paid" },
    });
  },
  { actor: async () => await getVerifiedSessionActor() },
);
```

## ORM & query helpers

### Prisma 7

Use `@auditstream/prisma`:

```ts
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { auditstream, auditTransaction } from "@auditstream/prisma";

// Default: trailing sqlcommenter tag (no explicit transaction)
// Never set statementNameGenerator on PrismaPg with SQL comments
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  comments: [auditstream()],
});

// Fallback for Prisma Accelerate (transaction-local set_config):
await auditTransaction(db, async (tx) => {
  await tx.invoice.update({
    where: { id: "inv_901" },
    data: { status: "paid" },
  });
});
```

### Drizzle

Use `@auditstream/drizzle` for Drizzle 0.45 and 1.x:

```ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { wrapPgPool } from "@auditstream/drizzle/pg";
// Also: wrapPostgresJs (@auditstream/drizzle/postgres-js)
//       wrapNeonHttp   (@auditstream/drizzle/neon-http)
//       auditComment   (@auditstream/drizzle, Drizzle 1.x)

const pool = wrapPgPool(
  new pg.Pool({ connectionString: process.env.DATABASE_URL }),
);
const db = drizzle({ client: pool });
```

### History & app events

Read timelines and log non-database domain events with `@auditstream/node`:

```ts
import { audit } from "@auditstream/node";

const exec = (sql: string, values: readonly unknown[]) =>
  pool.query(sql, values);

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

> **Backend-only API:** `audit.query()` returns raw `HistoryEntry` rows with internal DB metadata (`db_user`, `xact_id`, `table_oid`, `actor_source`) and raw `before`/`after` payloads. Enforce auth and tenant checks on the server and project rows into an allowlisted DTO before sending to browsers (see [`examples/next-prisma`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma)).

## Concurrency rules

Verified against live PostgreSQL concurrency tests:

- **Always await inside `audit.as()`.** Prisma and Drizzle queries are lazy; unawaited returns dropped the actor in 7/7 tests, so `audit.as()` awaits its callback inside the scope.
- **Read actors at `pool.query` entry.** Reading inside `client.query` misattributed 4/20 queued writes; reading at `pool.query` entry produced **0 wrong actors across 60+ concurrent writes**.
- **Use `AsyncLocalStorage.run()` only.** `enterWith()` is unavailable on Cloudflare Workers (`nodejs_als` or compat ≥ 2026-08-04); in Next.js 16, wrap handlers with `withAudit` and `auditAction`.
- **Keep app events explicit.** Adapters never build DB audit rows; log non-DB events (exports, logins) via `audit.log(exec, event)` calling `auditstream.log_event()`.

## Hot-path caching

`audit.as()` deeply freezes each `AuditScope` and caches encoded tags in a `WeakMap` (mutable scopes are never cached), while `isTagged()` runs an O(1) tail scan. On Node v26.13.1, `encodeScope()` takes **10.4 ns** (**134× faster**) and `tagSql()` runs **5.0×–6.4× faster** ([Benchmarks & Limits](/docs/evidence/)).
