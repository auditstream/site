---
title: Getting Started
description: Supported PostgreSQL, Node.js, Prisma, and Drizzle versions plus the three-step v0.1 setup flow.
section: Start
order: 2
eyebrow: START · QUICKSTART
---

## Supported versions in v0.1

| Dependency | Supported range | Notes |
| :--- | :--- | :--- |
| **PostgreSQL** | 15 to 19 | PostgreSQL 14 reached EOL on 2026-11-12; identical suite output verified on 15.20, 16.15, 17.12, 18.7, and 19.0 |
| **Node.js** | 22.12 or newer | Tested on Node 22, 24, and 26; ESM-only packages |
| **Prisma** | `@prisma/client` 7.1+ (within 7.x) | Uses official SQL comments plugin; Prisma 6 is unsupported; Prisma 8 awaits stable release |
| **Drizzle** | 0.45 and 1.x | `auditComment()` on Drizzle 1.x; `/pg`, `/postgres-js`, and `/neon-http` driver wrappers on 0.45 |
| **Runtimes** | Node.js, Bun, Deno, Cloudflare Workers | Uses `AsyncLocalStorage.run()` only (`nodejs_als` flag or compatibility date `2026-08-04` or later on Workers) |

## 1. Install the CLI and try it in 60 seconds

Prebuilt binaries, npm (`auditstream`), Homebrew (`auditstream/tap/auditstream`), shell/PowerShell installers, and `ghcr.io/auditstream/auditstream` publish with the `v0.1.0` release. Until then, build and install from source with Cargo:

```bash
git clone https://github.com/auditstream/auditstream
cd auditstream
cargo install --path crates/auditstream --locked
```

Verify everything end-to-end against a disposable PostgreSQL container (including `--exclude` PII redaction):

```bash
docker run -d --rm --name as-demo -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:18
psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c \
  "CREATE TABLE public.invoice (id int PRIMARY KEY, status text NOT NULL, password_hash text);"
auditstream --database-url postgres://postgres:postgres@127.0.0.1:5432/postgres \
  init --migrations sql --table public.invoice --exclude public.invoice.password_hash
psql postgres://postgres:postgres@127.0.0.1:5432/postgres -v ON_ERROR_STOP=1 -f migrations/*_auditstream.sql
psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c \
  "INSERT INTO public.invoice VALUES (1, 'draft', 'secret') /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;"
auditstream --database-url postgres://postgres:postgres@127.0.0.1:5432/postgres \
  history --table public.invoice --record-id 1
```

Expected output (`password_hash` is never recorded in `before` or `after`):

```text
OCCURRED_AT                  OP      TABLE           RECORD_ID  ACTOR        ACTOR_SOURCE  CHANGED
2026-11-24T15:22:00.000000Z  INSERT  public.invoice  {"id":1}   user:usr_42  comment       -
```

For Prisma or Drizzle projects, generate migrations directly into your project's migration directory:

```bash
auditstream init --migrations prisma --table public.invoice --table public.users --exclude public.users.password_hash
```

`auditstream init` inspects your schema and generates migrations for Prisma, Drizzle, or plain SQL containing:
- The `auditstream` schema and `auditstream_owner` `NOLOGIN` role;
- Monthly partitions for `auditstream.changes` created three months ahead plus a `DEFAULT` partition;
- A BRIN index on `occurred_at` and a partial `HASH` lookup index on `record_id` (`WHERE record_id IS NOT NULL`);
- Statement-level `INSERT` / `DELETE` triggers, row-level `UPDATE` triggers, and `TRUNCATE` triggers;
- `SELECT`-only grants for your application role.

## 2. Wire an adapter in TypeScript

Install `@auditstream/node` alongside your ORM adapter:

```bash
pnpm add @auditstream/node @auditstream/prisma
```

Wrap requests or mutations with `audit.as(actor, fn)` — always awaiting queries inside the callback:

```ts
import { PrismaClient } from "@prisma/client";
import { audit } from "@auditstream/node";
import { auditstream } from "@auditstream/prisma";

const db = new PrismaClient({
  comments: [auditstream()],
});

await audit.as({ type: "user", id: "usr_42", tenant: "org_acme" }, async () => {
  await db.invoice.update({
    where: { id: "inv_901" },
    data: { status: "paid" },
  });
});
```

## 3. Verify, inspect, and export

```bash
# Check for missing/disabled triggers or rows stuck in the DEFAULT partition
auditstream verify

# Inspect recent changes and diffs directly in your terminal (<schema>.<table>)
auditstream history --table public.invoice --limit 20

# Export immutable batches using the commit-safe xid8 cursor
auditstream export --format jsonl --output audit.jsonl --cursor-file cursor.json
```
