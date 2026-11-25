---
title: Getting Started
description: Install the CLI, run a 60-second PostgreSQL demo, and wire your first application.
section: Get Started
order: 2
eyebrow: GET STARTED · QUICKSTART
---

<div class="docs-meta-pills" aria-label="Current releases">
  <span class="docs-meta-pill"><strong>CLI</strong> v0.1.0</span>
  <span class="docs-meta-pill"><strong>TypeScript SDK</strong> v0.2.0</span>
  <span class="docs-meta-pill"><strong>PostgreSQL</strong> 15–19</span>
</div>

## 1. Install the CLI

Install the prebuilt `auditstream` v0.1.0 binary:

```bash
# Shell (macOS and Linux)
REPO="https://github.com/auditstream/auditstream"
curl --proto '=https' --tlsv1.2 -LsSf \
  "$REPO/releases/latest/download/auditstream-installer.sh" | sh

# Homebrew (macOS and Linux)
brew install auditstream/tap/auditstream

# npm
npm install -g auditstream

# Docker (multi-arch linux/amd64 + linux/arm64, distroless non-root)
docker run --rm ghcr.io/auditstream/auditstream:latest --version
```

Windows PowerShell:

```powershell
$url = "https://github.com/auditstream/auditstream/releases" +
  "/latest/download/auditstream-installer.ps1"
powershell -ExecutionPolicy Bypass -c "irm $url | iex"
```

Or build from source with Cargo:

```bash
git clone https://github.com/auditstream/auditstream \
  && cd auditstream \
  && cargo install --path crates/auditstream --locked
```

Run a 60-second local demo against PostgreSQL (with `--exclude` PII redaction):

```bash
export DB="postgres://postgres:postgres@127.0.0.1:5432/postgres"

docker run -d --rm --name as-demo \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:18

psql "$DB" -c "CREATE TABLE public.invoice (
  id int PRIMARY KEY, status text NOT NULL, password_hash text
);"

auditstream --database-url "$DB" init --migrations sql \
  --table public.invoice --exclude public.invoice.password_hash

psql "$DB" -v ON_ERROR_STOP=1 -f migrations/*_auditstream.sql

psql "$DB" -c "INSERT INTO public.invoice VALUES (1, 'draft', 'secret')
  /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;"

auditstream --database-url "$DB" \
  history --table public.invoice --record-id 1
```

Expected output (`password_hash` is stripped before capture):

```text
OCCURRED_AT                  OP      TABLE           RECORD_ID
  ACTOR        ACTOR_SOURCE  CHANGED

2026-11-24T15:22:00.000000Z  INSERT  public.invoice  {"id":1}
  user:usr_42  comment       -
```

For Prisma or Drizzle projects, write migrations directly into your project folder:

```bash
auditstream init \
  --migrations prisma \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

`auditstream init` generates idempotent Prisma, Drizzle, or SQL migrations containing:

- **Schema & role:** `auditstream` schema, `auditstream_owner` (`NOLOGIN`), and SELECT-only app grants ([Cloud & Security](/docs/cloud-and-security/)).
- **Partitioned history:** Monthly `auditstream.changes` partitions three months ahead plus a `DEFAULT` partition.
- **Indexes:** A BRIN index on `occurred_at` and a partial HASH index on `record_id` (`IS NOT NULL`).
- **Hybrid triggers:** Statement-level INSERT/DELETE triggers, row-level UPDATE triggers, and TRUNCATE triggers.

## 2. Wire an adapter

Install `@auditstream/node` v0.2.0 with your ORM and PostgreSQL driver adapter:

```bash
pnpm add @auditstream/node @auditstream/prisma @prisma/adapter-pg pg
```

Attach `auditstream()` to `PrismaClient` and wrap awaited queries in `audit.as(actor, fn)`:

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
  { type: "user", id: "usr_42", tenant: "org_acme" },
  async () => {
    await db.invoice.update({
      where: { id: "inv_901" },
      data: { status: "paid" },
    });
  },
);
```

Never set `statementNameGenerator` on `PrismaPg` with SQL comments. Using Drizzle, Hono, Express, or Next.js 16? See [TypeScript](/docs/adapters/), [Python](/docs/python/), or [Plain SQL](/docs/plain-sql/).

## 3. Verify and export

```bash
# Check for missing/disabled triggers or rows in DEFAULT partition
auditstream verify

# Inspect recent changes and diffs (<schema>.<table>)
auditstream history --table public.invoice --limit 20

# Export immutable batches via the commit-safe xid8 cursor
auditstream export \
  --format jsonl \
  --output audit.jsonl \
  --cursor-file cursor.json
```

## Supported versions

| Dependency | Supported | Notes |
| :--- | :--- | :--- |
| **PostgreSQL** | 15–19 | Verified on 15.20, 16.15, 17.12, 18.7, and 19.0 (PG 14 EOL 2026-11-12) |
| **Node.js** | 22.12+ | Tested on Node 22, 24, and 26; ESM-only packages |
| **Prisma** | 7.1+ (`7.x`) | Official SQL comments plugin; Prisma 6 unsupported |
| **Drizzle** | 0.45 and 1.x | `auditComment()` on 1.x; `/pg`, `/postgres-js`, `/neon-http` on 0.45 |
| **Runtimes** | Node, Bun, Deno, Workers | `AsyncLocalStorage.run()` only (Workers: `nodejs_als` or compat ≥ 2026-08-04) |

See also: [CLI & Day-2 Operations](/docs/cli/), [Cloud, Poolers & Security](/docs/cloud-and-security/), and [Benchmarks & Limits](/docs/evidence/).
