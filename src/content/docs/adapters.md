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
| `@auditstream/node` | `AsyncLocalStorage` (`run()` only), `audit.as()`, `audit.log(exec, event)`, `audit.history(exec, query)`, transport codec, `/express`, `/hono`, `/next` | `express`, `hono`, `next` (optional) |
| `@auditstream/prisma` | `auditstream()` SQL comments plugin (Prisma 7.1+) + `auditTransaction()` `set_config` fallback | `@prisma/client >=7.1.0 <8`, `@auditstream/node` |
| `@auditstream/drizzle` | Drizzle 1.x `auditComment()` helper + driver subpaths `/pg` (`wrapPgPool`), `/postgres-js` (`wrapPostgresJs`), and `/neon-http` (`wrapNeonHttp`) | `drizzle-orm ^0.45.2 \|\| >=1.0.0-rc.1 <2.0.0`, `@auditstream/node` |

## Why ESM-only?

A dual ESM/CommonJS build can load `@auditstream/node` twice in the same process, creating two separate `AsyncLocalStorage` instances and silently dropping the actor. Shipping ESM-only with `@auditstream/node` as a peer dependency — and sharing both the `AsyncLocalStorage` store and scope cache via `Symbol.for(...)` — eliminates that hazard even across multi-chunk server bundles.

## Critical concurrency rules (proven by tests)

- **Always await inside `audit.as()`.** Prisma and Drizzle queries are lazy and only execute when awaited. Returning an unawaited query from `als.run()` lost the actor in 7 of 7 tested operations; `audit.as()` awaits its callback inside the scope.
- **Read the actor at `pool.query` entry.** `pg-pool` can invoke a queued `client.query` callback on whichever request released a connection. Reading the actor inside `client.query` attributed 4 of 20 concurrent writes to the wrong actor; reading at `pool.query` entry yielded **0 wrong actors across 60+ concurrent writes**.
- **Runtime boundaries.** Uses `AsyncLocalStorage.run()` exclusively (`enterWith()` does not exist on Cloudflare Workers; enable `nodejs_als` or compatibility date `2026-08-04` or later). In Next.js 16, wrap Route Handlers (`withAudit`) and Server Actions (`auditAction`) from `@auditstream/node/next` rather than relying on `proxy` shared state.
- **App-only events.** Adapters never construct database audit rows. Non-DB events (such as exports or logins) call `audit.log(exec, { action, target, data })`, which invokes `auditstream.log_event($1::text, $2::jsonb, $3::jsonb)`.

## Transport hot-path caching (`@auditstream/node`)

Because `audit.as()` validates and deeply freezes each active `AuditScope`, `@auditstream/node` caches its canonical JSON, UTF-8 bytes, unpadded base64url tag, and trailing comment suffix in a process-wide `WeakMap` (`auditstream-js#64`), while `isTagged()` uses a bounded `O(1)` trailing-character scan instead of per-query regex matching. Caller-constructed mutable scopes passed directly to `encodeScope()` or `tagSql()` are never cached. On Node `v26.13.1`, repeated `encodeScope(audit.current())` calls drop from `1,395 ns` to **`10.4 ns`** (**134× faster**), and `tagSql()` inside `audit.as()` runs **5.0×–6.4× faster** (`157–240 ns/op`).
