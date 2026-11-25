---
title: Evidence & Benchmarks
description: Live PostgreSQL 19.0 and PgBouncer 1.26 stress benchmarks, durable disk overhead, 500k-row CLI timings, Node 26 adapter micro-benchmarks, and honest limits.
section: Reference & Proof
order: 8
eyebrow: PROOF · VERIFIED 2026-11-24
---

Every load-bearing architectural claim in Auditstream was measured directly on live PostgreSQL instances (`pgbench`, `xtask bench`, and `--release` CLI binaries) with **0 failed transactions**, **100% row-count verification**, and **0 actor leaks**.

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
    <dt>Builds &amp; Contract</dt>
    <dd>
      <strong>Spec v0.1.1 Option A (#130, #79)</strong>
      <span>auditstream main@bb7215f (--release) · auditstream-js main@699521c (Node v26.13.1)</span>
    </dd>
  </div>
</dl>

### Durable disk (PG 19)

Durable storage with `fsync=on`, `synchronous_commit=on`, and 16 clients (8 jobs, 10 s runs, 5 bulk runs). WAL group-commit latency (~150 µs/row) dominates write time, so capture adds only **+3.2% (+5.1 µs/row)** on single-row UPDATE and noise-floor **−0.2%** on single-row INSERT:

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

Isolating CPU and PL/pgSQL cost on tmpfs (`-M prepared`, 8–64 clients) across narrow 2-column and realistic wide 15-column `invoice` tables with a heavy 368-byte AI-agent actor (`ai_agent` + `onBehalfOf` user with `tenant` + all 4 `context` fields):

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

> **Zero regression from Option A SQL validation (#130):** Direct tmpfs (`-c 8 -j 4`) comparison against pre-#130 ADR-0008 baselines confirmed **0 µs/row measurable regression** from full enum, `onBehalfOf`, `tenant`, and `context` validation plus 3 table CHECK constraints (63.0k vs 60.0k tps UPDATE comment; 76.5k vs 72.5k tps INSERT comment; 53.2 ms vs 53.1 ms for 10k bulk INSERT).

### PgBouncer 1.26

Transaction-mode contention with 64 clients multiplexed onto 8 server connections (8× oversubscribed). Total across all protocol modes (`simple`, `extended`, `prepared`, plus mixed leak test): **2,407,659 captured transactions**, **0 failed**, **0 missing**, and **0 actor leaks**.

| Protocol | Comment | `set_config` | Speedup | Captured (0 failed) |
| :--- | ---: | ---: | ---: | ---: |
| `simple` | **53,452.4 tps** | 22,526.6 tps | **2.37×** | 756,962 tx |
| `extended` | **49,957.2 tps** | 22,637.9 tps | **2.21×** | 722,863 tx |
| `prepared` | **42,457.4 tps** | 23,391.1 tps | **1.82×** | 655,781 tx |

Mixed leak test (`extended`): **272,053 interleaved transactions** (136,051 `set_config` + 136,002 actor-less) — **0 actor leaks**, **0 failed** (total **2,407,659 tx** across all four runs).

Trailing SQL comments sustain **1.8×–2.4× higher throughput** behind transaction-mode poolers because each `set_config` write holds a backend slot across `BEGIN` → `set_config` → `UPDATE` → `COMMIT` instead of one auto-commit statement.

### 500k-row CLI scale

Measured with the `auditstream` `--release` CLI against 500,000 rich rows totaling 348 MB across 3 monthly partitions:

| Operation | Result | Notes |
| :--- | ---: | :--- |
| `export` JSONL (`--batch-size 5000`) | **29,316/s** | 19.0 MB/s, 17.06 s, 323.2 MB output, 30-digit `numeric` passthrough |
| `export` JSONL + streaming redaction | **28,774/s** | 17.1 MB/s, 17.38 s; `mask` + `remove` rules add only **1.8%** overhead |
| `export` CSV (`--batch-size 5000`) | **29,062/s** | 15.7 MB/s, 17.20 s, 269.5 MB RFC 4180 CRLF output |
| Single `record_id` SQL lookup | **0.101 ms** | `EXPLAIN (ANALYZE, BUFFERS)`: 22 shared buffer hits via partial HASH index |
| Concurrent `record_id` lookups (16c) | **157,459 QPS** | `pgbench -c 16 -j 8`: 0.102 ms avg, 1,258,163 queries in 8 s, 0 failures |
| `history --record-id` (40 CLI runs) | **36.4 ms** p50 | 48.8 ms p95, 50.1 ms p99; full process spawn + PG connect + `--format json` |
| `verify` / `status` (`--format json`) | **12.6 / 9.8 ms** | Full trigger, function, and partition catalog audit |

<details class="docs-details">
<summary>Pre-v0.1 optimization history (partial HASH index &amp; pure-SQL actor parser)</summary>

Two targeted engine optimizations landed before v0.1.0: adopting the partial HASH lookup index (auditstream#97) and eliminating POSIX regexes, correlated PK subqueries, and empty `TG_ARGV` work from `capture()` and `resolve_actor()` (auditstream#102; PostgreSQL 19.0 tmpfs, `pgbench -M prepared -c 8 -j 4 -T 5`, 3-run medians):

| Workload | Pre-opt | After #97 | After #102 | Gain |
| :--- | ---: | ---: | ---: | ---: |
| UPDATE (comment) | 54,288 tps | 59,008 tps | **67,018 tps** | **+23.4%** |
| UPDATE (`set_config`) | 26,565 tps | 35,433 tps | **38,095 tps** | **+43.4%** |
| INSERT (comment) | 69,879 tps | 69,857 tps | **86,060 tps** | **+23.2%** |
| 10k bulk INSERT | 66.1 ms | 54.3 ms | **49.1 ms** | **−25.7%** |

Per-row capture overhead dropped from **+13.2 → +9.8 µs** (UPDATE comment, −25.8%), **+32.4 → +21.2 µs** (UPDATE `set_config`, −34.6%), **+9.8 → +7.0 µs** (INSERT comment, −28.6%), and **+5.3 → +3.6 µs** (10k bulk INSERT, −32.1%).

</details>

## Adapter micro-benchmarks

Measured on Node v26.13.1 after scope caching (auditstream-js#64) and Spec v0.1.1 Option A validation (auditstream-js#79). `@auditstream/node` caches canonical JSON, UTF-8 bytes, base64url tags, and comment suffixes per immutable `audit.as()` scope via a process-wide `WeakMap`, and uses a bounded O(1) tail scan in `isTagged()`:

| Operation | Latency | Ops/sec | Notes |
| :--- | ---: | ---: | :--- |
| `encodeScope()` (Prisma plugin, cached) | **10.4 ns** | 96.3M | **134.4×** faster than pre-#64 (1,395 ns) |
| `setConfigValue()` (cached) | **9.3 ns** | 107.5M | **66.6×** faster than pre-#64 (620 ns) |
| `tagSql()` cached (368 B AI agent) | **24 ns** | **40.9M** | Single-query cached path (240 ns / 6.4× over 10-query batch) |
| `isTagged()` untagged SQL (> 4,096 chars) | **4.8 ns** | 209.7M | **56.9×** faster than pre-#64 regex scan (271 ns) |
| `decodeScope()` user actor (Option A) | **966 ns** | **1.03M** | Full enum, `onBehalfOf`, `tenant`, and `context` checks |
| `decodeScope()` AI agent + context (Option A) | **2,197 ns** | **455k** | Invalid `actor.type` rejected in **710 ns** (1.41M/s) |
| `parseExportRecord()` (30-digit `numeric`) | **9.3 µs** | **108k** | ES2025 `JSON.parse` raw-source decimal preservation + Option A |

## Cloud pooler matrix

| Platform | Status | Verification details |
| :--- | :---: | :--- |
| **PostgreSQL&nbsp;15&#8288;–&#8288;19** | **Pass** | Identical 17/17 audit rows on 15.20, 16.15, 17.12, 18.7, and 19.0; matching tamper denials, `DEFAULT`-partition checks, and `xid8` cursor behavior |
| **PgBouncer&nbsp;1.26.1** | **Pass** | Transaction mode: **2,407,659** stress tx at 8× oversubscription (**0 failed, 0 actor leaks**); Prisma 7.10 & Drizzle 0.45/1.0 verified |
| **Neon** (PG&nbsp;18.7) | **Pass** | AWS `us-east-1` pooler + direct, HTTP & WebSocket drivers, 24 and 64 `pgbench` clients, 0 actor leaks |
| **Supabase Supavisor** | **Pass** | PG 17.12 SQL suite, Prisma 7.10, Drizzle 0.45 (`pg` & `postgres.js`) and 1.0 `.comment()`, 24 `pgbench` clients on pool of 15, 0 actor leaks |

## Honest limits

- **Bulk single-statement UPDATE ceiling (~15k rows/s):** Updating 10,000 rows in one SQL statement runs the UPDATE trigger row-by-row (665 ms, +64.5 µs/row) compared to statement-level INSERT and DELETE (211k–213k rows/s, +3.7–4.0 µs/row). Statement-level UPDATE transition tables cannot correlate rows safely when primary keys change, so Auditstream keeps UPDATE row-level by design.
- **CPU ceiling vs. durable storage:** In-memory tmpfs benchmarks show high relative percentages (−67% to −82%) because uncaptured PostgreSQL runs at 210k–224k tps (4.5 µs/row). On real durable storage (`fsync=on`), WAL commit latency dominates and real-world single-row UPDATE overhead drops to **+3.2% (+5.1 µs/row)**.
- **Aurora DSQL:** Does not support triggers.
- **CockroachDB:** Triggers are in preview and `current_query()` behavior is unverified.
- **Prisma Accelerate:** SQL comments plugins do not receive SQL under Accelerate; use the `auditTransaction()` `set_config` fallback until verified.
- **AWS RDS Proxy:** AWS documents that `set_config(..., true)` pins the session while comments do not; live RDS Proxy testing is deferred until requested by users.

## Reproduce

Every capture harness, `pgbench` script, and pooler stress configuration lives in the engine repository:

- Capture & durable-disk benchmarks: [`bench/capture`](https://github.com/auditstream/auditstream/tree/main/bench/capture)
- PgBouncer, Neon, and Supavisor pooler harnesses: [`bench/poolers`](https://github.com/auditstream/auditstream/tree/main/bench/poolers)
- Related guides: [Comparisons](/docs/compare/) · [Capture & Engine Architecture](/docs/capture/) · [Cloud, Poolers & Security](/docs/cloud-and-security/) (includes SonarCloud, CodeQL, OpenSSF Scorecard, and SLSA provenance)
