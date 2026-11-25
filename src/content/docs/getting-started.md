---
title: Getting Started
description: Install the Auditstream CLI, run a 60-second PostgreSQL demo, wire your TypeScript adapter, and review supported versions.
section: Get Started
order: 2
eyebrow: GET STARTED · QUICKSTART
---

Current releases: CLI v0.1.0 · TypeScript SDKs v0.2.0 · PostgreSQL 15–19

## 1. Install the CLI

Install the prebuilt `auditstream` v0.1.0 binary through any supported channel:

```bash
# Shell (macOS and Linux)
BASE="https://github.com/auditstream/auditstream/releases/latest/download"
curl --proto '=https' --tlsv1.2 -LsSf "$BASE/auditstream-installer.sh" \
  | sh

# Homebrew (macOS and Linux)
brew install auditstream/tap/auditstream

# npm
npm install -g auditstream

# Docker (multi-arch linux/amd64 + linux/arm64, distroless non-root)
docker run --rm ghcr.io/auditstream/auditstream:latest --version
```

On Windows PowerShell:

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

Try it end-to-end in 60 seconds against a disposable PostgreSQL container (including `--exclude` PII redaction):

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

Expected output (wrapped across two lines for readability; `password_hash` is never recorded in `before` or `after`):

```text
OCCURRED_AT                  OP      TABLE           RECORD_ID
  ACTOR        ACTOR_SOURCE  CHANGED

2026-11-24T15:22:00.000000Z  INSERT  public.invoice  {"id":1}
  user:usr_42  comment       -
```

For Prisma or Drizzle projects, generate migrations directly into your project's migration directory:

```bash
auditstream init \
  --migrations prisma \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

`auditstream init` inspects your schema and generates migrations for Prisma, Drizzle, or plain SQL containing:
- The `auditstream` schema and `auditstream_owner` `NOLOGIN` role;
- Monthly partitions for `auditstream.changes` created three months ahead plus a `DEFAULT` partition;
- A BRIN index on `occurred_at` and a partial HASH lookup index on `record_id` (`WHERE record_id IS NOT NULL`);
- Statement-level INSERT and DELETE triggers, row-level UPDATE triggers, and TRUNCATE triggers;
- SELECT-only grants for your application role (see [Cloud, Poolers & Security](/docs/cloud-and-security/) for managed database role setup).

## 2. Wire an adapter

Install `@auditstream/node` v0.2.0 alongside your ORM adapter and PostgreSQL driver adapter:

```bash
pnpm add @auditstream/node @auditstream/prisma @prisma/adapter-pg pg
```

Pass the `PrismaPg` adapter and `auditstream()` SQL comments plugin to `PrismaClient`, then wrap requests or mutations with `audit.as(actor, fn)` — always awaiting queries inside the callback:

```ts
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { audit } from "@auditstream/node";
import { auditstream } from "@auditstream/prisma";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
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

Never configure `statementNameGenerator` on `PrismaPg` alongside SQL comments. Using Drizzle, Hono, Express, or Next.js 16? See [TypeScript](/docs/adapters/). Using Python (Django / Flask / `psycopg`)? See [Python](/docs/python/). Using Go, Ruby, Java, or `psql`? See [Plain SQL](/docs/plain-sql/).

## 3. Verify and export

```bash
# Check for missing/disabled triggers or rows stuck in DEFAULT partition
auditstream verify

# Inspect recent changes and diffs in your terminal (<schema>.<table>)
auditstream history --table public.invoice --limit 20

# Export immutable batches using the commit-safe xid8 cursor
auditstream export \
  --format jsonl \
  --output audit.jsonl \
  --cursor-file cursor.json
```

## Supported versions

| Dependency | Supported | Notes |
| :--- | :--- | :--- |
| **PostgreSQL** | 15–19 | PostgreSQL 14 reached EOL on 2026-11-12; identical suite output verified on 15.20, 16.15, 17.12, 18.7, and 19.0 |
| **Node.js** | 22.12+ | Tested on Node 22, 24, and 26; ESM-only packages |
| **Prisma** | 7.1+ (`7.x`) | `@prisma/client` official SQL comments plugin; Prisma 6 is unsupported; Prisma 8 awaits stable release |
| **Drizzle** | 0.45 and 1.x | `auditComment()` on Drizzle 1.x; `/pg`, `/postgres-js`, and `/neon-http` driver wrappers on 0.45 |
| **Runtimes** | Node.js, Bun, Deno, Workers | Uses `AsyncLocalStorage.run()` only (`nodejs_als` flag or compatibility date 2026-08-04 or later on Cloudflare Workers) |

## Next steps

- Wire request-level middleware and query feeds in [TypeScript](/docs/adapters/) or attribute writes from [Python](/docs/python/) and [Plain SQL](/docs/plain-sql/).
- Automate CI drift checks, redaction rules, and scheduled exports with [CLI & Day-2 Operations](/docs/cli/).
- Review pooler behavior, least-privilege roles, and Neon/Supabase guidance in [Cloud, Poolers & Security](/docs/cloud-and-security/).
- Inspect verified PostgreSQL 19 overhead and limits in [Benchmarks & Limits](/docs/evidence/).
