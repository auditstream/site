---
title: Hono & Express
description: Bind request actors and trace context once at your HTTP boundary using @auditstream/node/hono or @auditstream/node/express.
section: SDKs & Languages
parent: typescript
order: 3.4
eyebrow: TYPESCRIPT · HONO & EXPRESS
---

Register Auditstream middleware once after your authentication layer so every downstream [Prisma](/docs/typescript/prisma/) or [Drizzle](/docs/typescript/drizzle/) write runs inside an isolated `AsyncLocalStorage.run()` scope.

## Hono

Use `@auditstream/node/hono` on Node.js, Bun, Deno, or Cloudflare Workers (`nodejs_als` or compat date `>= 2026-08-04`):

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
    context: (req) => ({
      requestId: req.header("x-request-id") ?? undefined,
      source: "api",
    }),
  }),
);
```

## Public & nested scopes

- **Returning `undefined`:** Public or unauthenticated routes stay untagged — PostgreSQL still captures any audited write with `actor = NULL` and `db_user = session_user`.
- **Overriding inside a request:** Calling `audit.as(agentActor, fn)` inside a route handler temporarily replaces the active scope for that callback (for example, attributing an AI tool call `onBehalfOf` the signed-in user) and restores the outer request scope automatically when it resolves.
