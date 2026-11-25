---
title: Overview
description: Start with Auditstream — PostgreSQL trigger-based audit trails paired with thin language SDKs and a single static Rust CLI.
section: Get Started
order: 1
eyebrow: GET STARTED · OVERVIEW
---

**PostgreSQL triggers capture every row change; your application only passes who acted.**

Application code never writes audit rows itself. A thin SDK (or plain SQL comment / `set_config` from any language) attaches the acting identity to each write, generated PostgreSQL triggers record `before`, `after`, `changed`, and actor metadata into monthly-partitioned `auditstream.changes` inside your database, and the static Rust CLI verifies trigger health, queries history, and exports commit-safe batches on demand.

Current releases: CLI v0.1.0 · TypeScript SDKs v0.2.0 · PostgreSQL 15–19

## Choose your path

<div class="docs-cards">
  <a class="docs-card" href="/docs/getting-started/">
    <div class="docs-card-tag">Get Started</div>
    <div class="docs-card-title">Getting Started</div>
    <div class="docs-card-desc">Install the CLI, run a 60-second PostgreSQL demo, generate migrations, and wire your first app.</div>
  </a>
  <a class="docs-card" href="/docs/adapters/">
    <div class="docs-card-tag">SDKs &amp; Languages</div>
    <div class="docs-card-title">TypeScript</div>
    <div class="docs-card-desc">Install @auditstream/* v0.2.0 for Hono, Express, Next.js 16, Prisma 7, and Drizzle.</div>
  </a>
  <a class="docs-card" href="/docs/python/">
    <div class="docs-card-head">
      <div class="docs-card-tag">SDKs &amp; Languages</div>
      <span class="docs-card-badge">Soon</span>
    </div>
    <div class="docs-card-title">Python</div>
    <div class="docs-card-desc">Django, Flask, and FastAPI SDK coming soon — plus working psycopg attribution today.</div>
  </a>
  <a class="docs-card" href="/docs/plain-sql/">
    <div class="docs-card-tag">SDKs &amp; Languages</div>
    <div class="docs-card-title">Plain SQL</div>
    <div class="docs-card-desc">Attribute writes from Go, Ruby, Java, or psql using trailing SQL comments or set_config.</div>
  </a>
  <a class="docs-card" href="/docs/cli/">
    <div class="docs-card-tag">Operate</div>
    <div class="docs-card-title">CLI &amp; Day-2 Operations</div>
    <div class="docs-card-desc">Run init, status, verify, history, and export, configure auditstream.toml, and gate CI with exit codes.</div>
  </a>
  <a class="docs-card" href="/docs/cloud-and-security/">
    <div class="docs-card-tag">Operate</div>
    <div class="docs-card-title">Cloud, Poolers &amp; Security</div>
    <div class="docs-card-desc">Deploy behind PgBouncer, Neon, Supabase, or RDS Proxy, harden roles, and review security checks.</div>
  </a>
  <a class="docs-card" href="/docs/capture/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">How Capture Works</div>
    <div class="docs-card-desc">Inspect the hybrid trigger strategy, actor resolution precedence, history schema, and xid8 export cursor.</div>
  </a>
  <a class="docs-card" href="/docs/contract/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Wire Format &amp; Spec</div>
    <div class="docs-card-desc">Review the actor JSON schema, unpadded base64url SQL comment format, and validation rules.</div>
  </a>
  <a class="docs-card" href="/docs/evidence/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Benchmarks &amp; Limits</div>
    <div class="docs-card-desc">Inspect live PostgreSQL 19 and PgBouncer 1.26 stress numbers, Node 26 timings, and honest limits.</div>
  </a>
  <a class="docs-card" href="/docs/compare/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Comparisons</div>
    <div class="docs-card-desc">Compare Auditstream honestly against pgaudit, Debezium logical replication, and hand-rolled app logging.</div>
  </a>
</div>

## How it works

1. **`auditstream init`** introspects your tables, validates `--exclude` PII columns, and generates idempotent Prisma, Drizzle, or plain SQL migrations for `auditstream.changes` and its triggers — with zero new daemons, no `wal_level = logical`, and no replication slot holding WAL on disk.
2. **Your app attaches the actor** via an SDK (`audit.as(actor, fn)`) or plain SQL comment / `set_config`, carrying the acting user, service, or delegated AI agent (`onBehalfOf`) safely behind any connection pooler.
3. **`auditstream verify`, `history`, and `export`** gate CI against silent trigger or partition drift, inspect row diffs in the terminal, and stream lossless JSON Lines or CSV batches via a commit-safe `xid8` cursor.

## Next steps

- Ready to run your first migration? Continue to [Getting Started](/docs/getting-started/).
- Wiring a TypeScript or Python backend? Jump to [TypeScript](/docs/adapters/) or [Python](/docs/python/).
- Evaluating for production PostgreSQL? Read [Benchmarks & Limits](/docs/evidence/) and [Comparisons](/docs/compare/).
