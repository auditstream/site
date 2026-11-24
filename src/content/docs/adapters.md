---
title: TypeScript Adapters
description: ESM-only packages for Node.js, Prisma 7, and Drizzle — built around AsyncLocalStorage.run() with zero capture logic in JS.
section: Adapters
order: 5
eyebrow: ADAPTERS · AUDITSTREAM-JS
---

`auditstream-js` publishes three **ESM-only** packages versioned together as a fixed group. `@auditstream/node` manages actor context; ORM adapters only forward that actor to PostgreSQL.

| Package | Responsibility | Peer dependencies |
| :--- | :--- | :--- |
| `@auditstream/node` | `AsyncLocalStorage` (`run()` only), `audit.as()`, `audit.log(exec, event)`, `audit.history(exec, query)`, `audit.query(exec, query)`, transport codec, `/express`, `/hono`, `/next` | `express`, `hono`, `next` (optional) |
| `@auditstream/prisma` | `auditstream()` SQL comments plugin (Prisma 7.1+) + `auditTransaction()` `set_config` fallback | `@prisma/client >=7.1.0 <8`, `@auditstream/node` |
| `@auditstream/drizzle` | Drizzle 1.x `auditComment()` helper + driver subpaths `/pg` (`wrapPgPool`), `/postgres-js` (`wrapPostgresJs`), and `/neon-http` (`wrapNeonHttp`) | `drizzle-orm ^0.45.2 \|\| >=1.0.0-rc.1 <2.0.0`, `@auditstream/node` |

## Why ESM-only?

A dual ESM/CommonJS build can load `@auditstream/node` twice in the same process, creating two separate `AsyncLocalStorage` instances and silently dropping the actor. Shipping ESM-only with `@auditstream/node` as a peer dependency — and sharing both the `AsyncLocalStorage` store and scope cache via `Symbol.for(...)` — eliminates that hazard even across multi-chunk server bundles.

## Wire once per request (framework middlewares)

You do **not** need to wrap every database call manually with `audit.as()`. Wire the actor scope once at your HTTP or action boundary:

### Hono (`@auditstream/node/hono`)

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
    context: (c) => ({ requestId: c.req.header("x-request-id") ?? undefined, source: "api" }),
  }),
);
```

### Express (`@auditstream/node/express`)

```ts
import express from "express";
import { auditstream } from "@auditstream/node/express";

const app = express();
app.use(
  auditstream({
    actor: (req) => (req.user ? { type: "user", id: req.user.id } : undefined),
  }),
);
```

### Next.js 16 (`@auditstream/node/next`)

`AsyncLocalStorage` does not cross Next.js `proxy`. Derive the actor from your verified session inside Route Handlers (`withAudit`) and Server Actions (`auditAction`):

```ts
import { withAudit, auditAction } from "@auditstream/node/next";

export const POST = withAudit(
  async (request: Request) => {
    // All awaited Prisma / Drizzle writes inside this handler carry the actor
    return new Response("ok");
  },
  { actor: async () => await getVerifiedSessionActor() },
);

export const approveInvoice = auditAction(
  async (invoiceId: string) => {
    await db.invoice.update({ where: { id: invoiceId }, data: { status: "paid" } });
  },
  { actor: async () => await getVerifiedSessionActor() },
);
```

## ORM adapters & application helpers

### Prisma 7 (`@auditstream/prisma`)

```ts
import { PrismaClient } from "@prisma/client";
import { auditstream, auditTransaction } from "@auditstream/prisma";

// Default: trailing sqlcommenter tag (no explicit transaction required)
const db = new PrismaClient({ comments: [auditstream()] });

// Fallback for Prisma Accelerate (uses transaction-local set_config):
await auditTransaction(db, async (tx) => {
  await tx.invoice.update({ where: { id: "inv_901" }, data: { status: "paid" } });
});
```

### Drizzle 0.45 & 1.x (`@auditstream/drizzle`)

```ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { wrapPgPool } from "@auditstream/drizzle/pg";
// Also available: wrapPostgresJs from "@auditstream/drizzle/postgres-js"
//                 wrapNeonHttp   from "@auditstream/drizzle/neon-http"
//                 auditComment   from "@auditstream/drizzle" (Drizzle 1.x)

const pool = wrapPgPool(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const db = drizzle({ client: pool });
```

### Querying history & logging app events (`@auditstream/node`)

```ts
import { audit } from "@auditstream/node";

const exec = (sql: string, values: readonly unknown[]) => pool.query(sql, values);

// Read a record's audit timeline from auditstream.changes (SELECT-only role)
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

### Filtered, keyset-paginated feeds (`audit.query`)

Use `audit.query()` for filtered, keyset-paginated queries (zero `COUNT(*)`) across both database trigger rows (`source: "db"`) and application events (`source: "app"`):

```ts
import { type AuditQuery, type AuditQueryPage, audit } from "@auditstream/node";

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

> **Backend-only API:** `audit.query()` returns raw `HistoryEntry` rows including internal database metadata (`db_user`, `xact_id`, `table_oid`, `actor_source`) and raw `before`/`after` payloads. Always enforce authentication and tenant authorization on the server and project each row into an allowlisted DTO before sending data to browsers. See the runnable **Next.js 16 + Prisma 7 Activity Feed** (`examples/next-prisma` in [`auditstream-js`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma)) for a copy-paste BFF pattern (Auditstream intentionally omits a styled React UI package — see ADR-0009).

## Critical concurrency rules (proven by tests)

- **Always await inside `audit.as()`.** Prisma and Drizzle queries are lazy and only execute when awaited. Returning an unawaited query from `als.run()` lost the actor in 7 of 7 tested operations; `audit.as()` awaits its callback inside the scope.
- **Read the actor at `pool.query` entry.** `pg-pool` can invoke a queued `client.query` callback on whichever request released a connection. Reading the actor inside `client.query` attributed 4 of 20 concurrent writes to the wrong actor; reading at `pool.query` entry yielded **0 wrong actors across 60+ concurrent writes**.
- **Runtime boundaries.** Uses `AsyncLocalStorage.run()` exclusively (`enterWith()` does not exist on Cloudflare Workers; enable `nodejs_als` or compatibility date `2026-08-04` or later). In Next.js 16, wrap Route Handlers (`withAudit`) and Server Actions (`auditAction`) from `@auditstream/node/next` rather than relying on `proxy` shared state.
- **App-only events.** Adapters never construct database audit rows. Non-DB events (such as exports or logins) call `audit.log(exec, { action, target, data })`, which invokes `auditstream.log_event($1::text, $2::jsonb, $3::jsonb)`.

## Transport hot-path caching (`@auditstream/node`)

Because `audit.as()` validates and deeply freezes each active `AuditScope`, `@auditstream/node` caches its canonical JSON, UTF-8 bytes, unpadded base64url tag, and trailing comment suffix in a process-wide `WeakMap` (`auditstream-js#64`), while `isTagged()` uses a bounded `O(1)` trailing-character scan instead of per-query regex matching. Caller-constructed mutable scopes passed directly to `encodeScope()` or `tagSql()` are never cached. On Node `v26.13.1`, repeated `encodeScope(audit.current())` calls drop from `1,395 ns` to **`10.4 ns`** (**134× faster**), and `tagSql()` inside `audit.as()` runs **5.0×–6.4× faster** (`157–240 ns/op`).
