---
title: Hono & Express
description: Bind request actors and trace context once at your HTTP boundary using @auditstream/node/hono or @auditstream/node/express.
section: SDKs & Languages
parent: typescript
order: 3.4
eyebrow: TYPESCRIPT · HONO & EXPRESS
---

Auditstream is an open-source database audit trail engine written in Rust. Generated triggers record who changed which row, with before and after values. This middleware sets the actor (a signed-in user, API key, service, or AI agent) once per request, and your database adapter tags that request's SQL with it.

## Before you start

PostgreSQL 15–19 is the only supported database in v0.1.

1. **Generate and apply the capture migration.** Install the [`auditstream` CLI](/docs/getting-started/), run `auditstream init` for the tables you want to audit, apply the generated migration on a direct (non-pooled) connection with your migration tool, then run `auditstream verify`. `auditstream init` only writes migration files; nothing is captured until the migration is applied.
2. **Wire one database adapter.** The middleware only sets the actor; the adapter attaches it to each query. Use [Drizzle](/docs/typescript/drizzle/) (`wrapPgPool`, `wrapPostgresJs`, or `wrapNeonHttp`) or [Prisma 7.1+](/docs/typescript/prisma/) (`comments: [auditstream()]`). Without an adapter, audited writes are still captured, but with `actor = NULL`.
3. **Install the SDK with your adapter**, for example `pnpm add @auditstream/node @auditstream/drizzle`.
4. **Register the middleware after your authentication middleware**, as shown below, so every downstream write runs inside an isolated `AsyncLocalStorage.run()` scope. A runnable [Hono + Drizzle demo](https://github.com/auditstream/auditstream-js/tree/main/examples/hono-drizzle) lives in the SDK monorepo.

## Hono

Use `@auditstream/node/hono` on Node.js, Bun, Deno, or Cloudflare Workers (`nodejs_als` or compat date `>= 2026-08-04`):

```ts
import { Hono } from "hono";
import { auditstream } from "@auditstream/node/hono";

const app = new Hono();

app.use(
  "*",
  auditstream({
    // Register after your auth middleware. hono/jwt stores verified claims in `jwtPayload`.
    actor: (c) => {
      const sub = (c.get("jwtPayload") as { sub?: unknown } | undefined)?.sub;
      return typeof sub === "string" && sub ? { type: "user", id: sub } : undefined;
    },
    context: (c) => {
      const requestId = c.req.header("x-request-id");
      return requestId && /^[A-Za-z0-9._-]{1,64}$/.test(requestId)
        ? { requestId, source: "api" }
        : { source: "api" };
    },
  }),
);
```

## Express

Use `@auditstream/node/express` after your session or JWT middleware populates `req.user`:

```ts
import express from "express";
import { auditstream } from "@auditstream/node/express";

const app = express();

app.use(
  auditstream({
    actor: (req) =>
      req.user ? { type: "user", id: req.user.id } : undefined,
    context: (req) => {
      const requestId = req.header("x-request-id");
      return requestId && /^[A-Za-z0-9._-]{1,64}$/.test(requestId)
        ? { requestId, source: "api" }
        : { source: "api" };
    },
  }),
);
```

> **Validate client headers:** Always validate and bound client-supplied headers such as `x-request-id` (and opt-in `userAgent`) before placing them in `context`. Empty, malformed (NUL or unpaired surrogate), or oversized headers can trigger `INVALID_CONTEXT` or exceed the 512-byte serialized actor+context payload limit (`PAYLOAD_TOO_LARGE`).

## Public & nested scopes

- **Returning `undefined`:** Public or unauthenticated routes stay untagged — PostgreSQL still captures any audited write with `actor = NULL` and `db_user = session_user`.
- **Overriding inside a request:** Calling `audit.as(agentActor, fn)` inside a route handler temporarily replaces the active scope for that callback (for example, attributing an AI tool call `onBehalfOf` the signed-in user) and restores the outer request scope automatically when it resolves.
