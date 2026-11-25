---
title: Overview
description: Database-level audit trails — triggers capture every row change; your application only passes who acted.
section: Get Started
order: 1
eyebrow: GET STARTED · OVERVIEW
---

<div class="docs-meta-pills" aria-label="Current releases">
  <span class="docs-meta-pill"><strong>CLI</strong> v0.1.0</span>
  <span class="docs-meta-pill"><strong>TypeScript SDK</strong> v0.2.0</span>
</div>

<div class="docs-steps">
  <div class="docs-step">
    <div class="docs-step-num">01 · Capture</div>
    <div class="docs-step-title">Generate DB triggers</div>
    <div class="docs-step-desc">One CLI command generates <code>auditstream.changes</code> and its capture triggers.</div>
  </div>
  <div class="docs-step">
    <div class="docs-step-num">02 · Attribute</div>
    <div class="docs-step-title">Attach the actor</div>
    <div class="docs-step-desc">Thin SDKs or plain SQL tag outgoing writes with user, service, or AI agent metadata.</div>
  </div>
  <div class="docs-step">
    <div class="docs-step-num">03 · Operate</div>
    <div class="docs-step-title">Verify &amp; export</div>
    <div class="docs-step-desc">Gate CI against trigger drift, inspect diffs in the terminal, and stream lossless batches.</div>
  </div>
</div>

## Support status

| Target | Status | Details |
| :--- | :--- | :--- |
| **PostgreSQL** | **Supported&nbsp;&amp;&nbsp;tested** | PostgreSQL 15–19 (verified 15.20–19.0), PgBouncer 1.26, Neon, and Supabase |
| **MySQL** | Evaluating | Not supported yet — PostgreSQL is the only engine in v0.1 |
| **TypeScript&nbsp;SDK** | **Supported** | `@auditstream/*` v0.2.0 for Prisma 7, Drizzle, Next.js 16, Hono, and Express |
| **Python&nbsp;SDK** | Planned | No native SDK yet — works today via `psycopg` and SQL comments |
| **Plain&nbsp;SQL** | **Supported** | Any language or driver (Go, Ruby, Java, `psql`) via SQL comments or `set_config` |

## Choose your path

<div class="docs-cards">
  <a class="docs-card" href="/docs/getting-started/">
    <div class="docs-card-tag">Get Started</div>
    <div class="docs-card-title">Getting Started</div>
    <div class="docs-card-desc">Install the CLI, run a 60-second local demo, and wire your first app.</div>
  </a>
  <a class="docs-card" href="/docs/typescript/">
    <div class="docs-card-tag">SDKs &amp; Languages</div>
    <div class="docs-card-title">TypeScript</div>
    <div class="docs-card-desc">Use @auditstream/* v0.2.0 with Prisma 7, Drizzle, Next.js 16, Hono, and Express.</div>
  </a>
  <a class="docs-card" href="/docs/python/">
    <div class="docs-card-tag">SDKs &amp; Languages</div>
    <div class="docs-card-title">Python</div>
    <div class="docs-card-desc">No native SDK yet — attribute database writes from psycopg today; native Python SDK planned.</div>
  </a>
  <a class="docs-card" href="/docs/plain-sql/">
    <div class="docs-card-tag">SDKs &amp; Languages</div>
    <div class="docs-card-title">Plain SQL</div>
    <div class="docs-card-desc">Attribute writes from Go, Ruby, Java, or psql using SQL comments or set_config.</div>
  </a>
  <a class="docs-card" href="/docs/cli/">
    <div class="docs-card-tag">Operate</div>
    <div class="docs-card-title">CLI &amp; Day-2 Operations</div>
    <div class="docs-card-desc">Run init, status, verify, history, and export, configure TOML, and gate CI.</div>
  </a>
  <a class="docs-card" href="/docs/cloud-and-security/">
    <div class="docs-card-tag">Operate</div>
    <div class="docs-card-title">Cloud, Poolers &amp; Security</div>
    <div class="docs-card-desc">Deploy behind PgBouncer, Neon, Supabase, or RDS Proxy with least-privilege roles.</div>
  </a>
  <a class="docs-card" href="/docs/capture/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">How Capture Works</div>
    <div class="docs-card-desc">Hybrid triggers, actor resolution precedence, history schema, and xid8 export cursors.</div>
  </a>
  <a class="docs-card" href="/docs/contract/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Wire Format &amp; Spec</div>
    <div class="docs-card-desc">Actor JSON schema, unpadded base64url comment format, and strict validation rules.</div>
  </a>
  <a class="docs-card" href="/docs/evidence/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Benchmarks &amp; Limits</div>
    <div class="docs-card-desc">Live PostgreSQL 19 and PgBouncer 1.26 stress numbers, Node 26 timings, and limits.</div>
  </a>
  <a class="docs-card" href="/docs/compare/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Comparisons</div>
    <div class="docs-card-desc">Compare Auditstream against pgaudit, Debezium CDC, and hand-rolled app logging.</div>
  </a>
  <a class="docs-card" href="/docs/roadmap/">
    <div class="docs-card-tag">Reference</div>
    <div class="docs-card-title">Roadmap</div>
    <div class="docs-card-desc">Capability milestones toward v1.0, demand-gated work, and explicit non-goals.</div>
  </a>
</div>
