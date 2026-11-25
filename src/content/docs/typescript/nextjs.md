---
title: Next.js
description: Bind authenticated users and AI agents in Next.js 16 Route Handlers and Server Actions with @auditstream/node/next.
section: SDKs & Languages
parent: typescript
order: 3.3
eyebrow: TYPESCRIPT · NEXT.JS
---

`@auditstream/node/next` provides `withAudit` for Route Handlers and `auditAction` for Server Actions so every awaited [Prisma](/docs/typescript/prisma/) or [Drizzle](/docs/typescript/drizzle/) mutation automatically inherits the verified session actor.

## Install

```bash
pnpm add @auditstream/node
# Plus your ORM adapter (@auditstream/prisma or @auditstream/drizzle)
```

## Handlers & Actions

Bind the verified session at the handler or action boundary:

```ts
import { withAudit, auditAction } from "@auditstream/node/next";
import { db } from "@/lib/db";
import { getVerifiedSessionActor } from "@/lib/auth";

export const POST = withAudit(
  async (request: Request) => {
    const body = await request.json();
    await db.invoice.update({
      where: { id: body.invoiceId },
      data: { status: "paid" },
    });
    return Response.json({ ok: true });
  },
  {
    actor: async () => await getVerifiedSessionActor(),
    context: (request) => ({
      requestId: request.headers.get("x-request-id") ?? undefined,
      source: "next-route",
    }),
  },
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

> **Why not Next.js `proxy`?** `AsyncLocalStorage` does not propagate across the Next.js 16 `proxy` boundary into Route Handlers or Server Actions. Always bind the verified session inside `withAudit` and `auditAction`.

## Exposing audit feeds safely

When rendering an activity log in a Next.js page or API route, never return raw `audit.query()` or `audit.history()` rows directly to the client. Raw `HistoryEntry` objects include internal PostgreSQL metadata (`db_user`, `xact_id`, `table_oid`, `actor_source`) and full `before`/`after` JSONB payloads.

- Enforce authentication and `tenant` filtering on the server.
- Project each entry into an explicit allowlisted DTO before serialization.
- Follow the copy-paste [Activity Feed (BFF) guide](/docs/typescript/activity-feed/) or inspect the full working integration in [`examples/next-prisma`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma).
