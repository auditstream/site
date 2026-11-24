---
title: Comparisons
description: Honest architectural comparison of Auditstream against pgaudit, Debezium / logical replication, and hand-rolled application logging.
section: Reference & Proof
order: 9
---

Auditstream is designed for teams that want structured `before`/`after` row diffs and user or AI-agent attribution inside PostgreSQL 15–19 without running new infrastructure, logical replication slots, or fragile per-ORM logging glue. Here is how it compares honestly against the three standard alternatives.

## Feature comparison

| Requirement | Auditstream | pgaudit | Debezium / CDC | App logging |
| :--- | :--- | :--- | :--- | :--- |
| **Row diffs** | `before`/`after` `jsonb` + `changed` | SQL text logs only (no diffs) | Needs `REPLICA IDENTITY FULL` | Misses direct SQL & migrations |
| **Actor & AI attribution** | Trailing comment + `onBehalfOf` | DB role (`session_user`) only | Explicit tx + `emit_message` | Per-ORM glue; leaks in pools |
| **Extra infra & WAL** | Zero daemon · any PG 15–19 | Extension + log pipeline | `wal_level = logical` + 24/7 consumer | None (you own schema & ops) |
| **Connection poolers** | Pool-safe (0 leaks / 2.4M tx) | Safe (no per-user context) | Dedicated replication slot | Session vars pin RDS Proxy |
| **Drift & retention** | `auditstream verify --fix` in CI | Manual log retention rules | Slot lag alerts (disk-full risk) | Silent drift on schema changes |
| **Write overhead** | +3.2% (+5.1 µs) durable UPDATE · 211k/s bulk INSERT | Text log I/O overhead | Lower write CPU · higher WAL | Varies; often slow row-by-row |

## Choosing another tool

- **Choose pgaudit** if your compliance program requires logging raw SELECT read queries or full DDL statements into PostgreSQL server logs, and you already operate a log-shipping pipeline.
- **Choose Debezium / logical replication** if you already run Kafka and Kafka Connect, need real-time multi-consumer event streaming across services, or routinely run massive single-statement bulk UPDATE jobs above ~15k rows/s.
- **Choose hand-rolled application logging** if you only need coarse product analytics events rather than database-level `before`/`after` integrity, and no migrations, scripts, or direct SQL touch audited tables.
- **Choose Auditstream** if you want structured `before`/`after` diffs plus user and delegated AI-agent attribution inside PostgreSQL with zero new infrastructure, pooler safety, and CI drift gating.

## Next steps

- Inspect the live PostgreSQL 19 and PgBouncer 1.26 numbers behind these trade-offs in [Evidence & Benchmarks](/docs/evidence/).
- Read how hybrid triggers and the commit-safe `xid8` cursor work in [Capture & Engine Architecture](/docs/capture/).
- Run the 60-second local PostgreSQL demo in [Getting Started](/docs/getting-started/).
