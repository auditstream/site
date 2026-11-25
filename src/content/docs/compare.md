---
title: Comparisons
description: Honest architectural comparison of Auditstream against supa_audit, Bemi, WorkOS Audit Logs, DIY PL/pgSQL triggers, pgaudit, Debezium CDC, and hand-rolled app logging.
section: Reference
order: 11
eyebrow: REFERENCE · COMPARISONS
---

How Auditstream compares against PostgreSQL-native tools (`supa_audit`, DIY PL/pgSQL triggers, `pgaudit`), logical-replication CDC (Bemi, Debezium), hosted compliance SaaS (WorkOS Audit Logs), and hand-rolled application logging.

## Trigger & PostgreSQL-native tools

| Requirement | Auditstream | `supa_audit` | DIY PL/pgSQL triggers | `pgaudit` |
| :--- | :--- | :--- | :--- | :--- |
| **Row diffs** | `before`/`after` `jsonb` + `changed` + column `--exclude` | `record` / `old_record` `jsonb` in `audit.record_version` | Whatever you author and maintain | SQL text logs only (no row diffs) |
| **Actor & AI** | Trailing SQL comment + `set_config` + `onBehalfOf` | `auth.uid()` / `auth.role()` on Supabase only (no app/AI transport) | Custom session vars (often pooler-unsafe) | DB role (`session_user`) only |
| **Storage & scale** | Monthly partitions + BRIN + partial HASH + `xid8` export | Single unpartitioned table (bloat/vacuum risk on heavy tables) | You build partitioning, indexes & export cursors | Server log files + external log pipeline |
| **Drift & CI** | `auditstream verify` in CI (`--fix` pre-creates future partitions) | None built in | Manual audits; silent drift on DDL changes | Config check only |
| **Deployment** | Plain SQL migrations on any PG 15–19 (no extension) | Pure-SQL extension / script (needs `uuid-ossp`; repo archived Feb 2025) | Plain SQL migrations | Requires `pgaudit` extension + log sink |

## CDC, SaaS, and application logging

| Requirement | Auditstream | Bemi (WAL / CDC) | Debezium CDC | WorkOS Audit Logs | App&nbsp;logging |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Capture layer** | In-DB hybrid triggers + optional `log_event()` | WAL logical replication + context trigger (`pg_logical_emit_message`) | WAL logical replication (`pgoutput`) | Hosted SaaS API (app events only) | Application code only |
| **Direct SQL & migrations** | Captured automatically | Captured automatically | Captured automatically | Missed unless emitted by app code | Missed (migrations, scripts, `psql`) |
| **Infra & WAL** | Zero daemon · standard PG 15–19 | `wal_level=logical` + `REPLICA IDENTITY FULL` + slot + worker | `wal_level=logical` + Kafka Connect / 24×7 consumer | Managed SaaS (zero DB load) | None (you own schema & ops) |
| **Poolers** | Pool-safe (0 leaks / 2.4M PgBouncer tx) | Comment context survives transaction poolers | Dedicated replication slot | N/A (HTTP API outside PG) | Pool-safe (standard app SQL or external logs) |
| **Compliance & UI** | `export` JSONL/CSV + copy-paste [BFF Activity Feed](/docs/typescript/activity-feed/) | Worker-managed storage & queries | Stream to Kafka/SIEM consumers | Turnkey admin portal & SIEM Log Streams | Build everything yourself |

## Performance nuance: durable disk vs. CPU ceiling

Trigger-based capture runs synchronously inside the write transaction, so the real trade-off depends on whether your workload is **disk-bound** or **CPU-bound**:

- **Durable storage (`fsync=on`, `synchronous_commit=on`):** WAL commit latency (~150 µs/row) dominates. Single-row `UPDATE` overhead measures **+3.2% (+5.1 µs/row)** and single-row `INSERT` measures **−0.2%** (within noise).
- **In-memory CPU ceiling (`tmpfs`, 210k–224k tps baseline):** Without disk flush latency, PL/pgSQL trigger work costs **+9.4 to +20.8 µs/row**, which reads as **−67% to −82% TPS** against an extreme 4.5 µs in-memory baseline.
- **Bulk DML (`tmpfs` vs. durable disk):** On `tmpfs`, statement-level transition-table triggers sustain **211k rows/s** bulk `INSERT` and **213k rows/s** bulk `DELETE` (+3.7–4.0 µs/row), while single-statement bulk `UPDATE` runs row-by-row and caps around **~15k rows/s** (+64.5 µs/row). On durable disk, 10k bulk `INSERT` completes in **60.5 ms/stmt** (+3.8 µs/row, ~165k rows/s).

See the full methodology and raw numbers on [Benchmarks & Limits](/docs/evidence/).

## Choosing another tool

- **Choose `supa_audit`** only as a minimal archived reference (`supabase/supa_audit` was archived read-only in February 2025) on low-write Supabase databases where `auth.uid()` is enough and you do not need monthly partitioning, PII exclusions, or AI-agent `onBehalfOf` attribution.
- **Choose Bemi** if you want PostgreSQL WAL-based change tracking with ORM context, already run (or want) `wal_level = logical` + an external worker daemon, and want to keep audit-table writes and JSONB diffing off the write transaction.
- **Choose Debezium / logical replication** if you already operate Kafka Connect, need real-time multi-consumer event streaming, or run single-statement bulk `UPDATE`s above ~15k rows/s.
- **Choose WorkOS Audit Logs** if you want a managed B2B SaaS compliance suite with hosted enterprise customer portals and turnkey SIEM Log Streams, and application-level semantic events are sufficient (no DB-level row diff requirement).
- **Choose DIY PL/pgSQL triggers** if you have highly bespoke database rules and prefer owning trigger generation, schema-drift verification, monthly partition lifecycle, and commit-safe export cursors in-house.
- **Choose `pgaudit`** if compliance requires logging raw `SELECT` reads or full DDL into PostgreSQL server logs and you already operate a log pipeline.
- **Choose hand-rolled app logging** if you only need coarse product analytics and no migrations, scripts, or direct SQL touch audited tables.
- **Choose Auditstream** if you want structured `before`/`after` row diffs plus user and AI-agent (`onBehalfOf`) attribution directly in PostgreSQL 15–19 with zero new daemons, pooler safety, commit-safe `xid8` export, and CI drift gating.
