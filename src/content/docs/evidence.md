---
title: Benchmarks & Limits
description: Live PostgreSQL 19.0 and PgBouncer 1.26 stress benchmarks, durable disk overhead, 500k-row CLI timings, Node 26 adapter micro-benchmarks, and honest limits.
section: Reference
order: 10
eyebrow: REFERENCE · BENCHMARKS
---

All figures below were measured on live PostgreSQL instances (`pgbench`, `xtask bench`, `--release` CLI) with **0 failed transactions**, **100% row-count verification**, and **0 actor leaks**.

<div class="docs-kpis">
  <div class="docs-kpi">
    <div class="docs-kpi-val">+3.2%</div>
    <div class="docs-kpi-label">Durable PG 19 UPDATE (+5.1 µs/row)</div>
  </div>
  <div class="docs-kpi">
    <div class="docs-kpi-val">2.4M tx</div>
    <div class="docs-kpi-label">PgBouncer 1.26 · 0&nbsp;failed · 0&nbsp;leaks</div>
  </div>
  <div class="docs-kpi">
    <div class="docs-kpi-val">0.101 ms</div>
    <div class="docs-kpi-label">500k-row hash lookup · 157k QPS</div>
  </div>
  <div class="docs-kpi">
    <div class="docs-kpi-val">~15k/s</div>
    <div class="docs-kpi-label">Honest bulk UPDATE cap (row-level)</div>
  </div>
</div>

## High-stress benchmarks

<dl class="docs-spec-grid" aria-label="Benchmark environment">
  <div class="docs-spec-item">
    <dt>Host &amp; Run Date</dt>
    <dd>
      <strong>AMD Ryzen 9 9950X3D · 2026-11-24</strong>
      <span>8 vCPUs (Linux) · 32.7 GB RAM</span>
    </dd>
  </div>
  <div class="docs-spec-item">
    <dt>PostgreSQL 19.0</dt>
    <dd>
      <strong>Docker postgres:19</strong>
      <span>shared_buffers=512MB · max_wal_size=4GB · synchronous_commit=on</span>
    </dd>
  </div>
  <div class="docs-spec-item">
    <dt>PgBouncer 1.26.1</dt>
    <dd>
      <strong>edoburu/pgbouncer:v1.26.1-p0</strong>
      <span>POOL_MODE=transaction · 64 clients → 8 server conns</span>
    </dd>
  </div>
  <div class="docs-spec-item">
    <dt>Builds Tested</dt>
    <dd>
      <strong>CLI v0.1.0 · TS SDK v0.2.0 · Spec v0.1.1</strong>
      <span>auditstream (--release) · auditstream-js (Node v26.13.1)</span>
    </dd>
  </div>
</dl>

### Durable disk (PG 19)

Durable storage (`fsync=on`, `synchronous_commit=on`, 16 clients, 8 jobs, 10 s runs, 5 bulk runs). WAL commit latency (~150 µs/row) dominates, leaving **+3.2% (+5.1 µs/row)** on UPDATE and **−0.2%** on INSERT:

| Workload | Throughput | µs/row | Overhead | +µs/row | Verified |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Single-row UPDATE (baseline) | 6,588.9 tps | 151.8 | baseline | — | 0/65,810 |
| Single-row UPDATE (comment) | **6,376.6 tps** | 156.8 | **+3.2%** | **+5.1 µs** | 63,691/63,691 |
| Single-row UPDATE (`set_config`) | **6,413.6 tps** | 155.9 | **+2.7%** | **+4.1 µs** | 64,063/64,063 |
| Single-row INSERT (baseline) | 6,443.1 tps | 155.2 | baseline | — | 0/64,369 |
| Single-row INSERT (comment) | **6,458.5 tps** | 154.8 | **−0.2%** | **−0.4 µs** | 64,532/64,532 |
| 10k bulk INSERT (baseline) | 22.3 ms/stmt | 2.2 | baseline | — | 0/50,000 |
| 10k bulk INSERT (comment) | **60.5 ms/stmt** | 6.1 | +171.5% | **+3.8 µs** | 50,000/50,000 |

<p class="table-caption-cmd">Command: xtask bench --clients 16 --jobs 8 --duration 10 --bulk-runs 5</p>

### CPU ceiling & bulk DML

In-memory `tmpfs` (`-M prepared`, 8–64 clients) isolates PL/pgSQL cost across 2-column and wide 15-column `invoice` tables with a 368-byte AI-agent actor:

| Single-row workload (`tmpfs`) | Clients | Throughput | Overhead | +µs/row |
| :--- | ---: | ---: | ---: | ---: |
| Narrow UPDATE, small comment (36 B) | 32 | **72,013 tps** | −67.5% | +9.4 µs |
| Narrow UPDATE, small comment (36 B) | 64 | **64,346 tps** | −71.3% | +11.1 µs |
| Narrow UPDATE, heavy AI agent (368 B) | 32 | **51,988 tps** | −76.6% | +14.7 µs |
| Narrow UPDATE, heavy AI agent (368 B) | 64 | **45,953 tps** | −79.5% | +17.3 µs |
| Wide 15-col `invoice` UPDATE, small comment | 16 | **52,872 tps** | −75.2% | +14.2 µs |
| Wide 15-col `invoice` UPDATE, heavy AI agent | 16 | **39,245 tps** | −81.6% | +20.8 µs |
| Wide 15-col `invoice` UPDATE, heavy AI agent | 32 | **39,739 tps** | −81.8% | +20.6 µs |
| Wide 15-col `invoice`, excluded `password_hash` (0 rows) | 16 | **208,027 tps** | **−2.2%** | **+0.1 µs** |

Bulk DML on `tmpfs` (1 client, 368 B AI agent):

| Bulk DML (`tmpfs`) | Baseline | Captured | Throughput | +µs/row |
| :--- | ---: | ---: | ---: | ---: |
| **100k bulk INSERT** (statement-level) | 99.9 ms | **473.1 ms** | **211,372/s** | **+3.7 µs** |
| **10k bulk DELETE** (statement-level) | 7.0 ms | **46.9 ms** | **213,220/s** | **+4.0 µs** |
| **10k bulk UPDATE** (row-level) | 19.7 ms | **665.1 ms** | **15,035/s** | **+64.5 µs** |

> **Zero validation overhead:** Direct `tmpfs` (`-c 8 -j 4`) runs with full enum, `onBehalfOf`, `tenant`, `context`, and CHECK validation showed **0 µs/row regression** (63.0k vs 60.0k tps UPDATE; 76.5k vs 72.5k tps INSERT; 53.2 vs 53.1 ms 10k INSERT).

### PgBouncer 1.26

Transaction mode with 64 clients on 8 server connections (8× oversubscribed): **2,407,659 captured tx**, **0 failed**, **0 missing**, **0 actor leaks**.

| Protocol | Comment | `set_config` | Speedup | Captured (0 failed) |
| :--- | ---: | ---: | ---: | ---: |
| `simple` | **53,452.4 tps** | 22,526.6 tps | **2.37×** | 756,962 tx |
| `extended` | **49,957.2 tps** | 22,637.9 tps | **2.21×** | 722,863 tx |
| `prepared` | **42,457.4 tps** | 23,391.1 tps | **1.82×** | 655,781 tx |

> **Mixed leak test (`extended`):** **272,053 interleaved tx** (136,051 `set_config` + 136,002 actor-less), **0 leaks**, **0 failed** (**2,407,659 tx** total). Comments sustain **1.8×–2.4× higher throughput** because auto-commit avoids holding a pool slot across `BEGIN … COMMIT`.

### 500k-row CLI scale

Measured with the `--release` CLI against 500,000 rows (348 MB across 3 monthly partitions):

| Operation | Result | Notes |
| :--- | ---: | :--- |
| `export` JSONL (`--batch-size 5000`) | **29,316/s** | 19.0 MB/s, 17.06 s, 323.2 MB output, 30-digit `numeric` passthrough |
| `export` JSONL + streaming redaction | **28,774/s** | 17.1 MB/s, 17.38 s; `mask` + `remove` rules add only **1.8%** overhead |
| `export` CSV (`--batch-size 5000`) | **29,062/s** | 15.7 MB/s, 17.20 s, 269.5 MB RFC 4180 CRLF output |
| Single `record_id` SQL lookup | **0.101 ms** | `EXPLAIN (ANALYZE, BUFFERS)`: 22 shared buffer hits via partial HASH index |
| Concurrent `record_id` lookups (16c) | **157,459 QPS** | `pgbench -c 16 -j 8`: 0.102 ms avg, 1,258,163 queries in 8 s, 0 failures |
| `history --record-id` (40 CLI runs) | **36.4 ms** p50 | 48.8 ms p95, 50.1 ms p99; full process spawn + PG connect + `--format json` |
| `verify` / `status` (`--format json`) | **12.6 / 9.8 ms** | Full trigger, function, and partition catalog audit |

## Adapter micro-benchmarks

Node v26.13.1 timings for `@auditstream/node` (`WeakMap` scope caching per immutable `audit.as()` scope and bounded O(1) tail scan in `isTagged()`):

| Operation | Latency | Ops/sec | Notes |
| :--- | ---: | ---: | :--- |
| `encodeScope()` (Prisma plugin, cached) | **10.4 ns** | 96.3M | **134.4×** faster than uncached encoding (1,395 ns) |
| `setConfigValue()` (cached) | **9.3 ns** | 107.5M | **66.6×** faster than uncached serialization (620 ns) |
| `tagSql()` cached (368 B AI agent) | **24 ns** | **40.9M** | Single-query cached path (240 ns / 6.4× over 10-query batch) |
| `isTagged()` untagged SQL (> 4,096 chars) | **4.8 ns** | 209.7M | **56.9×** faster than regex scanning (271 ns) |
| `decodeScope()` user actor | **966 ns** | **1.03M** | Full enum, `onBehalfOf`, `tenant`, and `context` validation |
| `decodeScope()` AI agent + context | **2,197 ns** | **455k** | Invalid `actor.type` rejected in **710 ns** (1.41M/s) |
| `parseExportRecord()` (30-digit `numeric`) | **9.3 µs** | **108k** | ES2025 `JSON.parse` raw-source decimal preservation + validation |

## Cloud pooler matrix

| Platform | Status | Verification details |
| :--- | :---: | :--- |
| **PostgreSQL&nbsp;15&#8288;–&#8288;19** | **Pass** | Identical 17/17 audit rows on 15.20, 16.15, 17.12, 18.7, and 19.0; matching tamper denials, `DEFAULT`-partition checks, and `xid8` cursor behavior |
| **PgBouncer&nbsp;1.26.1** | **Pass** | Transaction mode: **2,407,659** stress tx at 8× oversubscription (**0 failed, 0 actor leaks**); Prisma 7.10 & Drizzle 0.45/1.0 verified |
| **Neon** (PG&nbsp;18.7) | **Pass** | AWS `us-east-1` pooler + direct, HTTP & WebSocket drivers, 24 and 64 `pgbench` clients, 0 actor leaks |
| **Supabase Supavisor** | **Pass** | PG 17.12 SQL suite, Prisma 7.10, Drizzle 0.45 (`pg` & `postgres.js`) and 1.0 `.comment()`, 24 `pgbench` clients on pool of 15, 0 actor leaks |

## Honest limits

- **Bulk single-statement UPDATE (~15k rows/s):** Updating 10,000 rows in one statement runs row-by-row (665 ms, +64.5 µs/row) vs statement-level INSERT/DELETE (211k–213k/s, +3.7–4.0 µs/row), because transition tables cannot safely correlate changed PKs.
- **CPU ceiling vs. durable disk:** In-memory `tmpfs` percentages (−67% to −82%) reflect a 210k–224k tps baseline (4.5 µs/row); on durable storage (`fsync=on`), single-row UPDATE overhead drops to **+3.2% (+5.1 µs/row)**.
- **Aurora DSQL:** Unsupported; triggers are not available.
- **CockroachDB:** Unsupported; triggers are in preview and `current_query()` is unverified.
- **Prisma Accelerate:** SQL comment plugins are bypassed; use `auditTransaction()` (`set_config`) instead.
- **AWS RDS Proxy:** AWS docs state `set_config(..., true)` pins sessions while comments do not; live RDS Proxy tests are deferred.

## Reproduce

All `pgbench` scripts and pooler stress harnesses live in the engine repository:

- Capture & durable-disk benchmarks: [`bench/capture`](https://github.com/auditstream/auditstream/tree/main/bench/capture)
- PgBouncer, Neon, and Supavisor harnesses: [`bench/poolers`](https://github.com/auditstream/auditstream/tree/main/bench/poolers)
