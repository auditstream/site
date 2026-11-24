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
    <div class="docs-kpi-label">PgBouncer 1.26 · 0 failed · 0 leaks</div>
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

Measured on 2026-11-24 against Docker `postgres:19` (PostgreSQL 19.0, `shared_buffers=512MB`, `max_wal_size=4GB`, `synchronous_commit=on`) and `edoburu/pgbouncer:v1.26.1-p0` (`POOL_MODE=transaction`) on an AMD Ryzen 9 9950X3D host (8 vCPUs exposed to Linux, 32.7 GB RAM), using `auditstream` main@bb7215f (`--release`) and `auditstream-js` main@699521c (Node v26.13.1), including Spec v0.1.1 Option A validation (#130 and #79).

### Durable disk (PG 19)

Durable storage with `fsync=on`, `synchronous_commit=on`, and 16 clients (`xtask bench --clients 16 --jobs 8 --duration 10 --bulk-runs 5`). WAL group-commit latency (~150 µs/row) dominates write time, so capture adds only **+3.2% (+5.1 µs/row)** on single-row UPDATE and noise-floor **−0.2%** on single-row INSERT:

| Workload | Throughput | µs / row | Overhead | Extra / row | Verified |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Single-row UPDATE (baseline) | 6,588.9 tps | 151.8 | baseline | — | 0 / 65,810 |
| Single-row UPDATE (comment) | **6,376.6 tps** | 156.8 | **+3.2%** | **+5.1 µs** | 63,691 / 63,691 |
| Single-row UPDATE (`set_config`) | **6,413.6 tps** | 155.9 | **+2.7%** | **+4.1 µs** | 64,063 / 64,063 |
| Single-row INSERT (baseline) | 6,443.1 tps | 155.2 | baseline | — | 0 / 64,369 |
| Single-row INSERT (comment) | **6,458.5 tps** | 154.8 | **−0.2%** | **−0.4 µs** | 64,532 / 64,532 |
| 10k bulk INSERT (baseline) | 22.3 ms/stmt | 2.2 | baseline | — | 0 / 50,000 |
| 10k bulk INSERT (comment) | **60.5 ms/stmt** | 6.1 | +171.5% | **+3.8 µs** | 50,000 / 50,000 |

### CPU ceiling & bulk DML

Isolating CPU and PL/pgSQL cost on tmpfs (`-M prepared`, 8–64 clients) across narrow 2-column and realistic wide 15-column `invoice` tables with a heavy 368-byte AI-agent actor (`ai_agent` + `onBehalfOf` user with `tenant` + all 4 `context` fields):

| Workload | Clients | Throughput | Overhead | Extra / row |
| :--- | ---: | ---: | ---: | ---: |
| Narrow UPDATE, small comment (36 B) | 32 / 64 | **72,013** / **64,346 tps** | −67.5% / −71.3% | +9.4 / +11.1 µs |
| Narrow UPDATE, heavy AI agent (368 B) | 32 / 64 | **51,988** / **45,953 tps** | −76.6% / −79.5% | +14.7 / +17.3 µs |
| Wide 15-col `invoice` UPDATE, small comment | 16 | **52,872 tps** (0.303 ms) | −75.2% | +14.2 µs |
| Wide 15-col `invoice` UPDATE, heavy AI agent | 16 / 32 | **39,245** / **39,739 tps** | −81.6% / −81.8% | +20.8 / +20.6 µs |
| Wide 15-col `invoice`, excluded col (`password_hash`) | 16 | **208,027 tps** (0 rows) | **−2.2%** | **+0.1 µs** |
| **100k bulk INSERT** (statement-level, AI agent) | 1 | **473.1 ms** (**211,372/s**) | vs 99.9 ms | **+3.7 µs** |
| **10k bulk DELETE** (statement-level, AI agent) | 1 | **46.9 ms** (**213,220/s**) | vs 7.0 ms | **+4.0 µs** |
| **10k bulk UPDATE** (row-level, AI agent) | 1 | **665.1 ms** (**15,035/s**) | vs 19.7 ms | **+64.5 µs** |

> **Zero regression from Option A SQL validation (#130):** Direct tmpfs (`-c 8 -j 4`) comparison against pre-#130 ADR-0008 baselines confirmed **0 µs/row measurable regression** from full enum, `onBehalfOf`, `tenant`, and `context` validation plus 3 table CHECK constraints (63.0k vs 60.0k tps UPDATE comment; 76.5k vs 72.5k tps INSERT comment; 53.2 ms vs 53.1 ms for 10k bulk INSERT).

### PgBouncer 1.26

Transaction-mode contention with 64 clients multiplexed onto 8 server connections (8× oversubscribed). Total across all protocol modes (`simple`, `extended`, `prepared`, plus mixed leak test): **2,407,659 captured transactions**, **0 failed**, **0 missing**, and **0 actor leaks**.

| Protocol | Comment | `set_config` | Advantage | Verified |
| :--- | ---: | ---: | ---: | :---: |
| `simple` | **53,452.4 tps** (532,553 tx) | 22,526.6 tps (224,409 tx) | **2.37× faster** | 100% · 0 failed |
| `extended` | **49,957.2 tps** (497,388 tx) | 22,637.9 tps (225,475 tx) | **2.21× faster** | 100% · 0 failed |
| `prepared` | **42,457.4 tps** (422,963 tx) | 23,391.1 tps (232,818 tx) | **1.82× faster** | 100% · 0 failed |
| `extended` (leak test) | **272,053 interleaved tx** (136,051 `set_config` + 136,002 actor-less) | — | **0 actor leaks** | 100% · 0 failed |

Trailing SQL comments sustain **1.8×–2.4× higher throughput** behind transaction-mode poolers because each `set_config` write holds a backend slot across `BEGIN` → `set_config` → `UPDATE` → `COMMIT` instead of one auto-commit statement.

### 500k-row CLI scale

Measured with the `auditstream` `--release` CLI against 500,000 rich rows totaling 348 MB across 3 monthly partitions:

| Workload | Throughput / Latency | Notes |
| :--- | :--- | :--- |
| `auditstream export --format jsonl --batch-size 5000` | **29,316 events/s** (**19.0 MB/s**, 17.06 s) | 323.2 MB output, 30-digit `numeric` passthrough |
| `auditstream export --format jsonl` + streaming redaction | **28,774 events/s** (**17.1 MB/s**, 17.38 s) | `mask` + `remove` rules add only **1.8% overhead** |
| `auditstream export --format csv --batch-size 5000` | **29,062 events/s** (**15.7 MB/s**, 17.20 s) | 269.5 MB RFC 4180 CRLF output |
| `EXPLAIN (ANALYZE, BUFFERS)` single `record_id` lookup | **0.101 ms** execution (22 shared buffer hits) | Partial HASH index across all 3 partitions |
| Concurrent SQL `record_id` lookups (`pgbench -c 16 -j 8`) | **157,459 queries/s** (**0.102 ms** avg) | 1,258,163 queries in 8 s, 0 failures |
| `auditstream history --record-id ... --format json` (40 runs) | **36.4 ms p50** / **48.8 ms p95** / **50.1 ms p99** | Full CLI process spawn + PG connect + query |
| `auditstream verify --format json` / `status --format json` | **12.6 ms** / **9.8 ms** | Full trigger, function, and partition audit |

<details class="docs-details">
<summary>Pre-v0.1 optimization history (partial HASH index &amp; pure-SQL actor parser)</summary>

Two targeted engine optimizations landed before v0.1.0: adopting the partial HASH lookup index (auditstream#97) and eliminating POSIX regexes, correlated PK subqueries, and empty `TG_ARGV` work from `capture()` and `resolve_actor()` (auditstream#102; PostgreSQL 19.0 tmpfs, `pgbench -M prepared -c 8 -j 4 -T 5`, 3-run medians):

| Workload | Pre-opt main | After #97 (HASH) | After #97 + #102 | Gain |
| :--- | ---: | ---: | ---: | :--- |
| Single-row UPDATE (comment) | 54,288 tps (+13.2 µs) | 59,008 tps (+12.2 µs) | **67,018 tps (+9.8 µs)** | **+23.4% tps** (−25.8% extra µs) |
| Single-row UPDATE (`set_config`) | 26,565 tps (+32.4 µs) | 35,433 tps (+23.5 µs) | **38,095 tps (+21.2 µs)** | **+43.4% tps** (−34.6% extra µs) |
| Single-row INSERT (comment) | 69,879 tps (+9.8 µs) | 69,857 tps (+9.8 µs) | **86,060 tps (+7.0 µs)** | **+23.2% tps** (−28.6% extra µs) |
| 10k bulk INSERT | 66.1 ms (+5.3 µs) | 54.3 ms (+4.1 µs) | **49.1 ms (+3.6 µs)** | **−25.7% total** (−32.1% extra µs) |

</details>

## Adapter micro-benchmarks

Measured on Node v26.13.1 after scope caching (auditstream-js#64) and Spec v0.1.1 Option A validation (auditstream-js#79). `@auditstream/node` caches canonical JSON, UTF-8 bytes, base64url tags, and comment suffixes per immutable `audit.as()` scope via a process-wide `WeakMap`, and uses a bounded O(1) tail scan in `isTagged()`:

| Workload | Latency | Throughput | Notes |
| :--- | ---: | ---: | :--- |
| `encodeScope(audit.current())` (Prisma plugin path) | **10.4 ns** | 96.3M ops/s | **134.4×** faster than pre-#64 (1,395 ns) |
| `setConfigValue(audit.current())` | **9.3 ns** | 107.5M ops/s | **66.6×** faster than pre-#64 (620 ns) |
| `tagSql()` cached inside `audit.as()` (368 B AI agent) | **24 ns** | **40.9M ops/s** | Single-query cached path (240 ns / 6.4× across 10-query batch) |
| `isTagged()` untagged long SQL (> 4,096 chars) | **4.8 ns** | 209.7M ops/s | **56.9×** faster than pre-#64 regex scan (271 ns) |
| `decodeScope()` small user actor (Option A) | **966 ns** | **1.03M ops/s** | Full enum, `onBehalfOf`, `tenant`, and `context` checks |
| `decodeScope()` heavy AI agent + context (Option A) | **2,197 ns** | **455k ops/s** | Invalid `actor.type` rejected in **710 ns** (1.41M ops/s) |
| `parseExportRecord()` (30-digit `numeric` + Option A) | **9.3 µs** | **108k ops/s** | ES2025 `JSON.parse` raw-source decimal preservation |

## Cloud pooler matrix

| Platform | Verified | Details |
| :--- | :--- | :--- |
| **PostgreSQL 15.20, 16.15, 17.12, 18.7, 19.0** | **Pass (identical)** | 17/17 audit rows matched row-for-row; identical tamper denials, `DEFAULT`-partition checks, and `xid8` cursor behavior |
| **PgBouncer 1.26.1 (transaction mode)** | **Pass** | **2,407,659** stress transactions at 8× oversubscription (**0 failed, 0 actor leaks**); Prisma 7.10 & Drizzle 0.45/1.0 verified |
| **Neon (PG 18.7, AWS us-east-1)** | **Pass** | Pooler + direct, HTTP & WebSocket drivers, 24 and 64 `pgbench` clients, 0 actor leaks |
| **Supabase Supavisor (PG 17.12)** | **Pass** | SQL suite, Prisma 7.10, Drizzle 0.45 (`pg` & `postgres.js`) and 1.0 `.comment()`, 24 `pgbench` clients on pool of 15, 0 actor leaks |

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
