---
title: Prisma
description: Attach Auditstream actors to Prisma 7 queries with the official SQL comments plugin or transaction-local set_config fallback for Accelerate.
section: SDKs & Languages
parent: typescript
order: 3.1
eyebrow: TYPESCRIPT · PRISMA
---

`@auditstream/prisma` integrates with Prisma 7's official SQL comments plugin so every awaited query inside an `audit.as()` scope carries the active actor into PostgreSQL triggers — with zero explicit transaction wrapper.

## 1. Generate Prisma migrations

Generate the `auditstream` schema, partitioned history table, and capture triggers directly inside your Prisma migrations directory:

```bash
auditstream init \
  --migrations prisma \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

Apply the generated migration on a direct (non-pooled) PostgreSQL connection via `prisma migrate deploy` or `prisma migrate dev`.

## 2. Install packages

`@auditstream/prisma` targets Prisma `7.1+` (`>=7.1.0 <8`) with a driver adapter such as `@prisma/adapter-pg`:

```bash
pnpm add @auditstream/node @auditstream/prisma @prisma/adapter-pg pg
```

## 3. Wire `PrismaClient`

Pass `auditstream()` to `comments` on `PrismaClient`, then wrap awaited writes in `audit.as()` (or bind per request with [Next.js](/docs/typescript/nextjs/) or [Hono & Express](/docs/typescript/http/)):

```ts
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { audit } from "@auditstream/node";
import { auditstream } from "@auditstream/prisma";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  comments: [auditstream()],
});

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

> **Prepared statement rule:** Never set `statementNameGenerator` on `PrismaPg` when using SQL comments — per-actor comments would allocate a distinct named prepared statement per actor.

## Prisma Accelerate fallback

Prisma Accelerate bypasses client-side SQL comment plugins. Use `auditTransaction()` from `@auditstream/prisma` to inject the current actor via transaction-local `set_config('auditstream.actor', ..., true)`:

```ts
import { audit } from "@auditstream/node";
import { auditTransaction } from "@auditstream/prisma";

await audit.as({ type: "user", id: "usr_42" }, async () => {
  await auditTransaction(db, async (tx) => {
    await tx.invoice.update({
      where: { id: "inv_901" },
      data: { status: "paid" },
    });
  });
});
```

## Compatibility

| Requirement | Supported | Notes |
| :--- | :--- | :--- |
| **Prisma** | `7.1+` (`7.x`) | Prisma 6 is unsupported (no SQL comments plugin) |
| **Driver adapters** | `@prisma/adapter-pg` | Verified across PgBouncer 1.26, Neon, and Supabase Supavisor |
| **Accelerate** | Via `auditTransaction()` | Uses transaction-local `set_config(..., true)` |
| **End-to-end example** | [`examples/next-prisma`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma) | Full Next.js 16 + Prisma 7 reference app |
