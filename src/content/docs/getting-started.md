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
| **Drizzle** | 0.45 and 1.x | `.comment()` on Drizzle 1.x; `pg` pool and `postgres.js` wrappers on 0.45 |
| **Runtimes** | Node.js, Bun, Deno, Cloudflare Workers | Uses `AsyncLocalStorage.run()` only (requires `nodejs_als` on older Workers dates) |

## 1. Install the CLI and generate migrations

The Rust CLI ships as a single static binary through npm (`auditstream`), Homebrew (`auditstream/tap`), shell/PowerShell installers, and `ghcr.io/auditstream/auditstream`.

```bash
auditstream init --format prisma --tables invoice,users
```

`auditstream init` inspects your schema and generates migrations for Prisma, Drizzle, or plain SQL containing:
- The `auditstream` schema and `auditstream_owner` `NOLOGIN` role;
- Monthly partitions for `auditstream.changes` created three months ahead plus a `DEFAULT` partition;
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
import { auditstreamPlugin } from "@auditstream/prisma";

const db = new PrismaClient({
  comments: [auditstreamPlugin()],
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

# Inspect recent changes and diffs directly in your terminal
auditstream history --table invoice --limit 20

# Export immutable batches using the commit-safe xid8 cursor
auditstream export --format jsonl --out audit.jsonl
```
