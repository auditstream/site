---
title: Evidence & Benchmarks
description: Primary benchmarks on PostgreSQL 16.15, hot-path optimizations on PostgreSQL 19.0 and Node 26.13, and compatibility verification across PostgreSQL 15–19, PgBouncer, Neon, and Supabase.
section: Evidence
order: 6
eyebrow: EVIDENCE · VERIFIED 2026-11-24
---

Every load-bearing architectural claim in Auditstream was measured directly on PostgreSQL 16.15 (`pgbench`, 4 clients, 12–15 s per scenario, 4 vCPUs, local socket) and re-verified across PostgreSQL 15–19, PgBouncer 1.26.1, Neon (PG 18.7), and Supabase Supavisor (PG 17.12).

## Write throughput benchmarks (PostgreSQL 16.15)

| Scenario | Baseline (no capture) | Auditstream result | Key takeaway |
| :--- | :--- | :--- | :--- |
| **10,000-row bulk INSERT** | 26 ms | **155–180 ms** (statement-level) vs 541–550 ms (row-level) | Statement-level transition tables are **3× faster** |
| **Single-row INSERT** | 9,572 tps | **7,906 tps** (statement-level) vs 6,913 tps (row-level) | Statement-level wins even on single rows |
| **Single-row UPDATE (worst case)** | 11,105 tps | **6,630 tps** with comment (**−40%**) vs **5,825 tps** with `set_config` (**−48%**) | Trailing SQL comment beats `set_config` by 8 points |
| **Lookup index shape** | — | Dropping wide composite B-tree `(table_name, record_id, occurred_at)` raised UPDATE tps from 6,269 to 7,436 | BRIN on `occurred_at` + partial `HASH` index `USING hash (record_id) WHERE record_id IS NOT NULL` adopted in `auditstream#97` |

## Hot-path optimizations (PostgreSQL 19.0)

Following the initial PostgreSQL 16.15 study, two engine optimizations landed on `main`: adopting the partial `HASH` lookup index (`auditstream#97`) and removing POSIX regexes, correlated PK subqueries, and empty `TG_ARGV` work from `capture()` / `resolve_actor()` (`auditstream#102`).

Measured with `cargo xtask bench --quick` on PostgreSQL 19.0 (`tmpfs`, `pgbench -M prepared -c 8 -j 4 -T 5`, 3-run medians, 0 failed transactions, exact captured row counts). Because this harness runs on `tmpfs` with 8 prepared clients to isolate CPU/PL/pgSQL cost from disk `fsync`, compare before/after deltas within this table rather than absolute TPS against the disk-backed PG 16.15 study above.

| Workload (Default schema) | Pre-opt `main` (3-run median) | After `#97` (`HASH` index) | After `#97` + `#102` (3-run median) | Gain vs pre-opt `main` |
| :--- | ---: | ---: | ---: | :--- |
| **Single-row UPDATE (comment)** | 54,288 tps (`+13.2 µs/row`) | 59,008 tps (`+12.2 µs/row`) | **67,018 tps (`+9.8 µs/row`)** | **+23.4% tps** (−25.8% extra µs) |
| **Single-row UPDATE (`set_config`)** | 26,565 tps (`+32.4 µs/row`) | 35,433 tps (`+23.5 µs/row`) | **38,095 tps (`+21.2 µs/row`)** | **+43.4% tps** (−34.6% extra µs) |
| **Single-row INSERT (comment)** | 69,879 tps (`+9.8 µs/row`) | 69,857 tps (`+9.8 µs/row`) | **86,060 tps (`+7.0 µs/row`)** | **+23.2% tps** (−28.6% extra µs) |
| **10,000-row bulk INSERT** | 66.1 ms (`+5.3 µs/row`) | 54.3 ms (`+4.1 µs/row`) | **49.1 ms (`+3.6 µs/row`)** | **−25.7% total** (−32.1% extra µs) |

## TypeScript adapter micro-benchmarks (`Node v26.13.1`)

`@auditstream/node` (`auditstream-js#64`) caches canonical JSON, UTF-8 bytes, base64url tags, and comment suffixes per immutable `audit.as()` scope via a process-wide `WeakMap`, replaces `isTagged()` regex scanning with a bounded `O(1)` tail scan, and uses an `Int8Array(128)` LUT for base64url decoding.

| Operation | Pre-opt `main` (ns/op) | After `#64` (ns/op) | Speedup | Throughput after `#64` |
| :--- | ---: | ---: | ---: | ---: |
| `tagSql()` inside `audit.as()` (10 queries/req, `user`) | 790.1 | **157.2** | **5.03×** | 6.36M ops/s |
| `tagSql()` inside `audit.as()` (10 queries/req, `ai_agent` + `context`) | 1,531.0 | **240.3** | **6.37×** | 4.16M ops/s |
| `encodeScope(audit.current())` (Prisma plugin path) | 1,395.2 | **10.4** | **134.4×** | 96.3M ops/s |
| `setConfigValue(audit.current())` | 619.6 | **9.3** | **66.6×** | 107.5M ops/s |
| `isTagged()` untagged short SQL (64 chars) | 16.1 | **1.7** | **9.24×** | 573.4M ops/s |
| `isTagged()` untagged long SQL (>4,096 chars) | 271.4 | **4.8** | **56.9×** | 209.7M ops/s |
| `isTagged()` already-tagged SQL (shared sqlcommenter) | 74.8 | **55.9** | **1.34×** | 17.9M ops/s |
| `decodeScope()` tagged SQL | 922.4 | **829.7** | **1.11×** | 1.21M ops/s |

## Multi-version & cloud pooler matrix

| Platform / Runtime | Result | Details |
| :--- | :--- | :--- |
| **PostgreSQL 15.20, 16.15, 17.12, 18.7, 19.0** | **Pass (identical)** | 17/17 audit rows matched row-for-row; identical tamper denials, `DEFAULT`-partition checks, and `xid8` cursor behavior |
| **PgBouncer 1.26.1 (transaction mode)** | **Pass** | Prisma 7.10 (80 concurrent updates, 0 wrong), Drizzle 0.45 & 1.0 (0 wrong), leak test over 15 s: **9,436 `set_config` + 9,312 actor-less rows, 0 crossed** |
| **Neon (PG 18.7, AWS us-east-1)** | **Pass** | Pooler + direct, HTTP & WebSocket drivers, 24 and 64 pgbench clients, 0 actor leaks |
| **Supabase Supavisor (PG 17.12)** | **Pass** | SQL suite, Prisma 7.10, Drizzle 0.45 (`pg` & `postgres.js`) and 1.0 `.comment()`, 24 pgbench clients on pool of 15, 0 actor leaks |

## Honest limits (where v0.1 does not run)

- **Aurora DSQL:** does not support triggers.
- **CockroachDB:** triggers are in preview and `current_query()` behavior is unverified.
- **Prisma Accelerate:** SQL comments plugins do not receive SQL under Accelerate; use the `set_config` fallback until verified.
- **AWS RDS Proxy:** AWS documents that `set_config(..., true)` pins the session while comments do not; live RDS Proxy testing is deferred until requested by users.
