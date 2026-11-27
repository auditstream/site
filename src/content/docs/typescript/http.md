---
title: Hono & Express
description: Attribute PostgreSQL audit trails in Hono and Express apps by binding the request actor once at your HTTP boundary with @auditstream/node.
section: SDKs & Languages
parent: typescript
order: 3.4
eyebrow: TYPESCRIPT · HONO & EXPRESS
---

Auditstream is an open-source database audit trail engine written in Rust. Its CLI generates PostgreSQL triggers that record who changed which row, with before and after values; `@auditstream/node` is a pure-ESM TypeScript package that binds the request actor (a signed-in user, API key, service, or AI agent) once per request so your database adapter tags downstream SQL with it.

## Before you start

> **Requirements:** PostgreSQL 15–19 (the only supported database in v0.1) · ESM-only SDK · Node.js 22.12+, Bun, Deno, or Cloudflare Workers (`nodejs_als` flag or compatibility date `>= 2026-08-04`).

1. **Generate and apply the capture migration.** Install the [`auditstream` CLI](/docs/getting-started/), run `auditstream init` for the tables you want to audit (use `--exclude` for secret columns such as `password_hash`), apply the generated migration in a **single transaction** on a direct (non-pooled) connection (for example Prisma Migrate, Drizzle Kit over `pg` or `postgres.js`, or `psql --single-transaction` — not autocommit HTTP runners such as Drizzle's Neon HTTP migrator), then run `auditstream verify`. `auditstream init` only writes migration files and `auditstream.toml`; nothing is captured until the migration is applied, and `auditstream verify` checks PostgreSQL triggers and schema health (not app-layer attribution).
2. **Install the SDK and your database adapter.**

```bash
pnpm add @auditstream/node @auditstream/drizzle   # or @auditstream/prisma
```

3. **Wire one database adapter.** Middleware only opens the actor scope; the adapter attaches it to each query. Configure [Drizzle](/docs/typescript/drizzle/) (`wrapPgPool` from `@auditstream/drizzle/pg`, `wrapPostgresJs` from `@auditstream/drizzle/postgres-js`, `wrapNeonHttp` from `@auditstream/drizzle/neon-http`, or Drizzle 1.x `auditComment()`), [Prisma 7.1+](/docs/typescript/prisma/) (`comments: [auditstream()]`), or `tagSql()` from `@auditstream/node` for [plain SQL drivers](/docs/plain-sql/). Without an adapter, audited writes are still captured, but with `actor = NULL`.
4. **Register the middleware after authentication.** Mount `auditstream()` below your authentication middleware on the same routes (shown below) so every downstream write runs inside an isolated `AsyncLocalStorage.run()` scope.

## Hono

Register `@auditstream/node/hono` **after** your authentication middleware on the routes it protects (runs on Node.js, Bun, Deno, and Cloudflare Workers with `nodejs_als` or compatibility date `>= 2026-08-04`):

```ts
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { auditstream } from "@auditstream/node/hono";

const app = new Hono();

// 1. Verify authentication first on protected routes
app.use("/api/*", jwt({ secret: process.env.JWT_SECRET!, alg: "HS256" }));

// 2. Bind the verified actor for all downstream database writes
app.use(
  "/api/*",
  auditstream({
    actor: (c) => {
      const payload = c.get("jwtPayload");
      if (typeof payload !== "object" || payload === null || !("sub" in payload)) {
        return undefined;
      }
      const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
      return sub.length > 0 ? { type: "user", id: sub } : undefined;
    },
    context: (c) => {
      const requestId = c.req.header("x-request-id");
      return requestId !== undefined && /^[A-Za-z0-9._-]{1,64}$/.test(requestId)
        ? { requestId, source: "api" }
        : { source: "api" };
    },
  }),
);
```

- **Middleware order matters:** Mounting `auditstream()` *before* authentication (or on `"*"` while `jwt()` runs on `"/api/*"`) silently records `actor = NULL` and skips `context`. On strictly authenticated route prefixes, fail closed (for example, throw `new HTTPException(401)`) if an expected identity claim is missing.
- **Opaque IDs only:** Ensure `sub` is an opaque identifier rather than an email address or PII — trailing SQL comments appear in `pg_stat_activity` and PostgreSQL logs.
- **Other auth providers & `async` resolvers:** Using Better Auth, Clerk, Supabase, or custom session middleware? `actor` may be `async` (for example `async (c) => { ... }`) or read any verified `c.get(...)` variable set by upstream middleware.
- **Full example:** See the runnable [Hono + Drizzle demo](https://github.com/auditstream/auditstream-js/tree/main/examples/hono-drizzle) in the SDK monorepo for pool wrapping, migrations, and transaction savepoints (it uses a demo-only `x-demo-user` header for local `curl` testing — replace it with verified authentication in production).

## Express

Register `@auditstream/node/express` **after** your session or JWT middleware populates `req.user`:

```ts
import express, { type Request } from "express";
import { auditstream } from "@auditstream/node/express";
import { authMiddleware } from "./auth";

interface AuthedRequest extends Request {
  user?: { id?: string | number };
}

const app = express();

// 1. Verify authentication first
app.use("/api", authMiddleware);

// 2. Bind the verified actor for all downstream database writes
app.use(
  "/api",
  auditstream({
    actor: (req) => {
      const rawId = (req as AuthedRequest).user?.id;
      const id =
        typeof rawId === "number"
          ? String(rawId)
          : typeof rawId === "string"
            ? rawId.trim()
            : "";
      return id.length > 0 ? { type: "user", id } : undefined;
    },
    context: (req) => {
      const requestId = req.header("x-request-id");
      return requestId !== undefined && /^[A-Za-z0-9._-]{1,64}$/.test(requestId)
        ? { requestId, source: "api" }
        : { source: "api" };
    },
  }),
);
```

## Request context & validation

`context` is optional and is only invoked when `actor` returns an `Actor`.

> **Validate actor and context values:** `actor` (`id`, `tenant`, `onBehalfOf`) and `context` (`requestId`, `source`, opt-in `ip` and `userAgent`) share one **512-byte serialized UTF-8 JSON limit** and reject NUL (`\u0000`) or unpaired UTF-16 surrogates. Violating those rules throws `AuditstreamError` (`INVALID_ACTOR`, `INVALID_CONTEXT`, or `PAYLOAD_TOO_LARGE`) and aborts the request with **HTTP 500** before route handlers run. Always bound client headers such as `x-request-id` (and overwrite them at a trusted proxy/gateway if relied on for correlation), and map long federated OIDC/SAML `sub` claims to internal opaque IDs so `actor` + `context` stays well under 512 bytes.

## Public & nested scopes

- **Returning `undefined`:** Public or unauthenticated routes stay untagged — PostgreSQL still captures any audited write with `actor = NULL` and `db_user = session_user`.
- **Overriding inside a request:** Calling [`audit.as(agentActor, fn)`](/docs/typescript/#scope-binding-auditas) from `@auditstream/node` inside a route handler temporarily replaces the entire outer scope for that callback (for example, attributing an AI tool call `onBehalfOf` the signed-in user) and restores the outer request scope automatically when it resolves. Pass `{ context: audit.current()?.context }` to preserve `requestId` and `source`, copy `tenant` onto `agentActor` if needed, and keep `onBehalfOf` strictly one level deep.

## Verify attribution

After sending an authenticated write request, confirm `actor` is populated (not `NULL`) with the CLI — and assert `actor IS NOT NULL` in your integration tests:

```bash
auditstream history --table public.invoice --limit 10
```
