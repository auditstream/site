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
| `@auditstream/node` | `AsyncLocalStorage` (`run()` only), `audit.as()`, `audit.log()`, history helpers, `/express`, `/hono`, `/next` | `express`, `hono`, `next` (optional) |
| `@auditstream/prisma` | Prisma 7.1+ SQL comments plugin emitting one `auditstream` tag per statement + `set_config` fallback | `@prisma/client >=7.1.0 <8`, `@auditstream/node` |
| `@auditstream/drizzle` | Drizzle 1.x `.comment()` helper + Drizzle 0.45 wrappers for `pg` pool and `postgres.js` | `drizzle-orm ^0.45.2 \|\| >=1.0.0-rc.1 <2.0.0`, `@auditstream/node` |

## Why ESM-only?

A dual ESM/CommonJS build can load `@auditstream/node` twice in the same process, creating two separate `AsyncLocalStorage` instances and silently dropping the actor. Shipping ESM-only with `@auditstream/node` as a peer dependency eliminates that hazard.

## Critical concurrency rules (proven by tests)

- **Always await inside `audit.as()`.** Prisma queries are lazy and only execute when awaited. Returning an unawaited query from `als.run()` lost the actor in 7 of 7 tested operations; `audit.as()` awaits its callback inside the scope.
- **Read the actor at `pool.query` entry.** `pg-pool` can invoke a queued `client.query` callback on whichever request released a connection. Reading the actor inside `client.query` attributed 4 of 20 concurrent writes to the wrong actor; reading at `pool.query` entry yielded **0 wrong actors across 60+ concurrent writes**.
- **Runtime boundaries.** Uses `AsyncLocalStorage.run()` exclusively (`enterWith()` does not exist on Cloudflare Workers). In Next.js 16, wrap Route Handlers and Server Actions rather than relying on `proxy` shared state.
- **App-only events.** Adapters never construct database audit rows. Non-DB events (such as exports or logins) call `audit.log()`, which invokes `auditstream.log_event(action, target, data)`.
