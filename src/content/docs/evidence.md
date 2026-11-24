---
title: Evidence & Benchmarks
description: Primary benchmarks on PostgreSQL 16.15 and compatibility verification across PostgreSQL 15–19, PgBouncer, Neon, and Supabase.
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
| **Lookup btree index impact** | — | Dropping `(table_name, record_id, occurred_at)` raised UPDATE tps from 6,269 to 7,436 | BRIN on `occurred_at` always; lookup index shape tuned separately |

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
