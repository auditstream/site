---
title: Drizzle
description: Attach Auditstream actors to Drizzle 0.45 and 1.x queries across node-postgres, postgres.js, and Neon HTTP with zero pooler leaks.
section: SDKs & Languages
parent: typescript
order: 3.2
eyebrow: TYPESCRIPT · DRIZZLE
---

`@auditstream/drizzle` appends Auditstream SQL comments at query dispatch time so Drizzle writes stay compatible with PgBouncer transaction pooling, Neon, and Supabase Supavisor.

## 1. Generate Drizzle migrations

Write idempotent SQL migrations directly into your Drizzle migrations folder:

```bash
auditstream init \
  --migrations drizzle \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

Apply the migration on a direct (non-pooled) PostgreSQL connection before serving app traffic.

## 2. Install packages

```bash
pnpm add @auditstream/node @auditstream/drizzle
```

## 3. Pick your driver wrapper

| Driver / Drizzle version | Entrypoint | Helper |
| :--- | :--- | :--- |
| `node-postgres` (`pg`, Drizzle `0.45` & `1.x`) | `@auditstream/drizzle/pg` | `wrapPgPool(pool)` |
| `postgres.js` (Drizzle `0.45` & `1.x`) | `@auditstream/drizzle/postgres-js` | `wrapPostgresJs(sql)` |
| Neon serverless HTTP (Drizzle `0.45` & `1.x`) | `@auditstream/drizzle/neon-http` | `wrapNeonHttp(sql)` |
| Drizzle `1.x` native comment helper | `@auditstream/drizzle` | `auditComment()` |

### `node-postgres` (`pg`)

Wrap `pg.Pool` once at startup and pass it to `drizzle()`:

```ts
import pg from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { audit } from "@auditstream/node";
import { wrapPgPool } from "@auditstream/drizzle/pg";
import { invoice } from "./schema";

const pool = wrapPgPool(
  new pg.Pool({ connectionString: process.env.DATABASE_URL }),
);
const db = drizzle({ client: pool });

await audit.as(
  {
    type: "ai_agent",
    id: "billing-agent",
    onBehalfOf: { type: "user", id: "usr_42" },
  },
  async () => {
    await db
      .update(invoice)
      .set({ status: "paid" })
      .where(eq(invoice.id, "inv_901"));
  },
);
```

### `postgres.js` & Neon HTTP

Swap only the driver entrypoint — actor scopes (`audit.as()` and [HTTP middleware](/docs/typescript/http/)) stay identical:

```ts
// postgres.js
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { wrapPostgresJs } from "@auditstream/drizzle/postgres-js";

const db = drizzle({ client: wrapPostgresJs(postgres(process.env.DATABASE_URL!)) });

// Neon HTTP
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { wrapNeonHttp } from "@auditstream/drizzle/neon-http";

const neonDb = drizzleNeon({
  client: wrapNeonHttp(neon(process.env.DATABASE_URL!)),
});
```

### Drizzle 1.x native `.comment()` helper

On Drizzle `1.x`, use `auditComment()` directly on query builders when you do not need a driver wrapper:

```ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { audit } from "@auditstream/node";
import { auditComment } from "@auditstream/drizzle";
import { invoice } from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

await audit.as({ type: "user", id: "usr_42" }, async () => {
  await db
    .update(invoice)
    .set({ status: "paid" })
    .where(eq(invoice.id, "inv_901"))
    .comment(
      auditComment({
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      }),
    );
});
```

> **Raw SQL & transactions on Drizzle 1.x:** `db.execute(sql)` and transaction control statements do not expose `.comment()`. Pair `auditComment()` with a driver wrapper (`wrapPgPool`, `wrapPostgresJs`, or `wrapNeonHttp`) when you also execute raw SQL — wrappers skip statements already tagged by `auditComment()`.

## Concurrency guarantee

`wrapPgPool` reads the active `AsyncLocalStorage` scope at **`pool.query` entry** — before a query waits in the connection queue. Reading at `client.query` misattributed 4/20 queued writes under load; capturing at `pool.query` entry produced **0 wrong actors across 60+ concurrent writes** and **2.4M PgBouncer transactions** ([Benchmarks & Limits](/docs/evidence/)).
