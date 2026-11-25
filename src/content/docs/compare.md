---
title: Comparisons
description: Honest architectural comparison of Auditstream against pgaudit, Debezium / logical replication, and hand-rolled application logging.
section: Reference
order: 11
eyebrow: REFERENCE · COMPARISONS
---

How Auditstream compares against `pgaudit`, Debezium logical replication, and hand-rolled application logging for PostgreSQL 15–19 audit trails.

## Feature comparison

| Requirement | Auditstream | pgaudit | Debezium CDC | App&nbsp;logging |
| :--- | :--- | :--- | :--- | :--- |
| **Row diffs** | `before`/`after` `jsonb` + `changed` | SQL text logs only (no diffs) | Needs `REPLICA IDENTITY` `FULL` | Misses direct SQL & migrations |
| **Actor & AI** | Trailing comment + `onBehalfOf` | DB role (`session_user`) only | Explicit tx + `emit_message` | Per-ORM glue; leaks in pools |
| **Infra & WAL** | Zero daemon · any PG 15–19 | Extension + log pipeline | `wal_level` `logical` + 24/7 consumer | None (you own schema & ops) |
| **Poolers** | Pool-safe (0 leaks / 2.4M tx) | Safe (no per-user context) | Dedicated replication slot | Session vars pin RDS Proxy |
| **Drift & ops** | `auditstream` `verify` `--fix` in CI | Manual log retention rules | Slot lag alerts (disk-full risk) | Silent drift on schema changes |
| **Overhead** | +3.2% (+5.1 µs) durable UPDATE · 211k/s bulk INSERT | Text log I/O overhead | Lower write CPU · higher WAL | Varies; often slow row-by-row |

## Choosing another tool

- **Choose `pgaudit`** if compliance requires logging raw `SELECT` reads or full DDL into PostgreSQL server logs and you already run a log pipeline.
- **Choose Debezium / logical replication** if you already operate Kafka Connect, need real-time multi-consumer streaming, or run single-statement bulk UPDATEs above ~15k rows/s.
- **Choose hand-rolled app logging** if you only need coarse product analytics and no migrations, scripts, or direct SQL touch audited tables.
- **Choose Auditstream** if you want structured `before`/`after` diffs plus user and AI-agent attribution inside PostgreSQL with zero new infrastructure and CI drift gating.
