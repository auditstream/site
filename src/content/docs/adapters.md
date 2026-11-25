---
title: TypeScript Adapters
description: ESM-only packages (v0.2.0) for Node.js, Prisma 7, and Drizzle — built around AsyncLocalStorage.run() with zero capture logic in JS.
section: Get Started
order: 3
eyebrow: GET STARTED · ADAPTERS
---

[`auditstream-js`](https://github.com/auditstream/auditstream-js) publishes three **ESM-only** packages (v0.2.0), versioned together as a fixed group. `@auditstream/node` manages actor context; ORM adapters only forward that actor to PostgreSQL.

## Install

```bash
# Prisma 7.1+
pnpm add @auditstream/node @auditstream/prisma

# Drizzle 0.45 or 1.x
pnpm add @auditstream/node @auditstream/drizzle
```

> **Triggers live in PostgreSQL:** Adapters never create audit tables or triggers. Generate and apply your capture migrations first with the `auditstream` CLI ([Getting Started](/docs/getting-started/)).

| Package (v0.2.0) | Responsibility | Peer dependencies |
| :--- | :--- | :--- |
| `@auditstream/node` | `AsyncLocalStorage` (`run()` only), `audit.as()`, `audit.log(exec, event)`, `audit.history(exec, query)`, `audit.query(exec, query)`, transport codec, `/express`, `/hono`, `/next` | `express`, `hono`, `next` (optional) |
| `@auditstream/prisma` | `auditstream()` SQL comments plugin (Prisma 7.1+) + `auditTransaction()` `set_config` fallback | `@prisma/client` `>=7.1.0 <8`, `@auditstream/node` |
| `@auditstream/drizzle` | Drizzle 1.x `auditComment()` helper + driver subpaths `/pg` (`wrapPgPool`), `/postgres-js` (`wrapPostgresJs`), and `/neon-http` (`wrapNeonHttp`) | `drizzle-orm` `^0.45.2` or `1.x`, `@auditstream/node` |

## Why ESM-only?

A dual ESM/CommonJS build can load `@auditstream/node` twice in the same process, creating two separate `AsyncLocalStorage` instances and silently dropping the actor. Shipping ESM-only with `@auditstream/node` as a peer dependency — and sharing both the `AsyncLocalStorage` store and scope cache via `Symbol.for(...)` — eliminates that hazard even across multi-chunk server bundles.

## Framework middleware

You do **not** need to wrap every database call manually with `audit.as()`. Wire the actor scope once at your HTTP or action boundary.

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

`AsyncLocalStorage` does not cross Next.js `proxy`. Derive the actor from your verified session inside Route Handlers (`withAudit`) and Server Actions (`auditAction`) using `@auditstream/node/next`:

```ts
import { withAudit, auditAction } from "@auditstream/node/next";

export const POST = withAudit(
  async (request: Request) => {
    // Awaited Prisma / Drizzle writes inside this handler carry the actor
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

// Default: trailing sqlcommenter tag (no explicit transaction required)
// Never set statementNameGenerator on PrismaPg alongside SQL comments
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  comments: [auditstream()],
});

// Fallback for Prisma Accelerate (uses transaction-local set_config):
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
// Also available: wrapPostgresJs from "@auditstream/drizzle/postgres-js"
//                 wrapNeonHttp   from "@auditstream/drizzle/neon-http"
//                 auditComment   from "@auditstream/drizzle" (Drizzle 1.x)

const pool = wrapPgPool(
  new pg.Pool({ connectionString: process.env.DATABASE_URL }),
);
const db = drizzle({ client: pool });
```

### History & app events

Read timelines and log non-database domain events directly from `@auditstream/node`:

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

Use `audit.query()` for filtered, keyset-paginated feeds (zero `COUNT(*)`) across both database trigger rows (`source: "db"`) and application events (`source: "app"`):

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
// Pass page.nextCursor back as `cursor` when page.hasMore is true
```

> **Backend-only API:** `audit.query()` returns raw `HistoryEntry` rows including internal database metadata (`db_user`, `xact_id`, `table_oid`, `actor_source`) and raw `before`/`after` payloads. Always enforce authentication and tenant authorization on the server and project each row into an allowlisted DTO before sending data to browsers. See the runnable **Next.js 16 + Prisma 7 Activity Feed** (`examples/next-prisma` in [`auditstream-js`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma)) for a copy-paste BFF pattern (Auditstream intentionally omits a styled React UI package — see [ADR-0009](https://github.com/auditstream/auditstream/blob/main/docs/decisions/0009-no-ui-package-or-in-db-partition-sealing.md)).

## Concurrency rules

Proven directly against live PostgreSQL concurrency tests:

- **Always await inside `audit.as()`.** Prisma and Drizzle queries are lazy and only execute when awaited. Returning an unawaited query from `als.run()` lost the actor in 7 of 7 tested operations; `audit.as()` awaits its callback inside the scope.
- **Read the actor at `pool.query` entry.** `pg-pool` can invoke a queued `client.query` callback on whichever request released a connection. Reading the actor inside `client.query` attributed 4 of 20 concurrent writes to the wrong actor; reading at `pool.query` entry yielded **0 wrong actors across 60+ concurrent writes**.
- **Runtime boundaries.** Uses `AsyncLocalStorage.run()` exclusively (`enterWith()` does not exist on Cloudflare Workers; enable `nodejs_als` or compatibility date 2026-08-04 or later). In Next.js 16, wrap Route Handlers (`withAudit`) and Server Actions (`auditAction`) from `@auditstream/node/next` rather than relying on `proxy` shared state.
- **App-only events.** Adapters never construct database audit rows. Non-DB events (such as exports or logins) call `audit.log(exec, event)`, which invokes `auditstream.log_event()`.

## Hot-path caching

Because `audit.as()` validates and deeply freezes each active `AuditScope`, `@auditstream/node` caches its canonical JSON, UTF-8 bytes, unpadded base64url tag, and trailing comment suffix in a process-wide `WeakMap` (auditstream-js#64), while `isTagged()` uses a bounded O(1) trailing-character scan instead of per-query regex matching. Caller-constructed mutable scopes passed directly to `encodeScope()` or `tagSql()` are never cached.

On Node v26.13.1, repeated `encodeScope(audit.current())` calls drop from 1,395 ns to **10.4 ns** (**134× faster**), and `tagSql()` inside `audit.as()` runs **5.0×–6.4× faster** (157–240 ns/op; see [Evidence & Benchmarks](/docs/evidence/)).

## Next steps

- Check wire encoding and actor validation rules in [Contract (Spec v0.1.1)](/docs/contract/).
- Review PgBouncer, Neon, Supabase, and Prisma Accelerate guidance in [Cloud, Poolers & Security](/docs/cloud-and-security/).
- Explore full runnable apps in [`auditstream/auditstream-js`](https://github.com/auditstream/auditstream-js).
