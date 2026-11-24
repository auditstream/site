---
title: Overview
description: Start with Auditstream — PostgreSQL trigger-based audit trails paired with thin TypeScript actor adapters and a single Rust CLI.
section: Get Started
order: 1
eyebrow: GET STARTED · OVERVIEW
---

**The Rust engine captures and exports; TypeScript adapters only tell PostgreSQL who acted.**

Application code never writes audit rows itself. An adapter (or plain SQL comment or `set_config` from any language) attaches the acting identity to each write, generated PostgreSQL triggers record `before`, `after`, `changed`, and actor metadata into monthly-partitioned `auditstream.changes` inside your database, and the static Rust CLI verifies trigger health, queries history, and exports commit-safe batches on demand.

Current releases: CLI v0.1.0 · TypeScript SDKs v0.2.0 · Spec v0.1.1 · PostgreSQL 15–19

## Choose your path

<div class="docs-cards">
  <a class="docs-card" href="/docs/getting-started/">
    <div class="docs-card-tag">Get Started</div>
    <div class="docs-card-title">Getting Started</div>
    <div class="docs-card-desc">Install the CLI, run a 60-second PostgreSQL demo, generate migrations, and wire your first adapter.</div>
  </a>
  <a class="docs-card" href="/docs/adapters/">
    <div class="docs-card-tag">Get Started</div>
    <div class="docs-card-title">TypeScript Adapters</div>
    <div class="docs-card-desc">Install @auditstream/* v0.2.0, wire Hono, Express, or Next.js 16 scopes, and connect Prisma 7 or Drizzle.</div>
  </a>
  <a class="docs-card" href="/docs/cli/">
    <div class="docs-card-tag">Operate</div>
    <div class="docs-card-title">CLI &amp; Day-2 Operations</div>
    <div class="docs-card-desc">Run init, status, verify, history, and export, configure auditstream.toml, and gate CI with exit codes.</div>
  </a>
  <a class="docs-card" href="/docs/cloud-and-security/">
    <div class="docs-card-tag">Operate</div>
    <div class="docs-card-title">Cloud, Poolers &amp; Security</div>
    <div class="docs-card-desc">Deploy behind PgBouncer, Neon, Supabase, or RDS Proxy, harden least-privilege roles, and inspect security verification.</div>
  </a>
  <a class="docs-card" href="/docs/capture/">
    <div class="docs-card-tag">Reference &amp; Proof</div>
    <div class="docs-card-title">Capture &amp; Engine Architecture</div>
    <div class="docs-card-desc">Inspect the hybrid trigger design, xid8 snapshot cursor, hexagonal Rust workspace, and EventSource/Sink traits.</div>
  </a>
  <a class="docs-card" href="/docs/contract/">
    <div class="docs-card-tag">Reference &amp; Proof</div>
    <div class="docs-card-title">Contract (Spec v0.1.1)</div>
    <div class="docs-card-desc">Review the normative actor schema, unpadded base64url SQL comment transport, and v0.1.1 validation rules.</div>
  </a>
  <a class="docs-card" href="/docs/evidence/">
    <div class="docs-card-tag">Reference &amp; Proof</div>
    <div class="docs-card-title">Evidence &amp; Benchmarks</div>
    <div class="docs-card-desc">Inspect live PostgreSQL 19 and PgBouncer 1.26 stress numbers, Node 26 micro-benchmarks, and honest limits.</div>
  </a>
  <a class="docs-card" href="/docs/compare/">
    <div class="docs-card-tag">Reference &amp; Proof</div>
    <div class="docs-card-title">Comparisons</div>
    <div class="docs-card-desc">Compare Auditstream honestly against pgaudit, Debezium logical replication, and hand-rolled app logging.</div>
  </a>
</div>

## How it works

1. **`auditstream init`** introspects your tables, validates `--exclude` PII columns, and generates idempotent Prisma, Drizzle, or plain SQL migrations for `auditstream.changes` and its triggers — with zero new daemons, no `wal_level = logical`, and no replication slot holding WAL on disk.
2. **`audit.as(actor, fn)`** (or a framework middleware) propagates the acting user, service, or delegated AI agent (`onBehalfOf`) through `AsyncLocalStorage` and attaches a compact base64url SQL comment to each outgoing query.
3. **`auditstream verify`, `history`, and `export`** gate CI against silent trigger or partition drift, inspect row diffs in the terminal, and stream lossless JSON Lines or CSV batches via a commit-safe `xid8` cursor.

## Next steps

- Ready to run your first migration? Continue to [Getting Started](/docs/getting-started/).
- Wiring an existing TypeScript app? Jump straight to [TypeScript Adapters](/docs/adapters/).
- Evaluating for production PostgreSQL? Read [Evidence & Benchmarks](/docs/evidence/) and [Comparisons](/docs/compare/).
