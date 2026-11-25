---
title: Capture & Engine Architecture
description: Hybrid PostgreSQL triggers, four-step actor resolution, partitioned history layout, commit-safe xid8 cursors, and the hexagonal Rust Cargo workspace.
section: Reference & Proof
order: 6
eyebrow: REFERENCE · CAPTURE & ENGINE
---

In v0.1, Auditstream captures every mutation inside PostgreSQL using generated triggers that write to a monthly-partitioned `auditstream.changes` table, while keeping capture, database I/O, and export sinks decoupled behind strict Rust port traits.

## Trigger strategy

- **INSERT and DELETE are statement-level** using transition tables (`REFERENCING NEW TABLE` / `OLD TABLE`). The actor is resolved once per statement instead of once per row — sustaining **211k–213k rows/s** (+3.7–4.0 µs/row, 100k INSERT in **473 ms**, 10k DELETE in **46.9 ms**) with a heavy 368-byte AI-agent actor on PostgreSQL 19 tmpfs, and **60.5 ms** (+3.8 µs/row) for a 10k INSERT on durable disk (`fsync=on`; see [Evidence & Benchmarks](/docs/evidence/)).
- **UPDATE stays row-level** with `WHEN (OLD.* IS DISTINCT FROM NEW.*)` so no-op updates write nothing and single-row durable-disk updates add only **+3.2% (+5.1 µs/row)**. The honest trade-off is that single-statement bulk UPDATE statements (for example, 10,000 rows in one statement) cap at **~15k rows/s** (665 ms, +64.5 µs/row), because statement-level UPDATE transition tables split primary-key changes into two half-events and slowed single-row writes by 4%.
- **TRUNCATE** uses a dedicated `AFTER TRUNCATE FOR EACH STATEMENT` trigger recording the table and actor.
- **Excluded columns** (such as `password_hash`) are stripped before storing `before` and `after`; an update touching only excluded columns writes no audit row.

## Actor resolution order

Inside every trigger, PostgreSQL resolves the acting identity in strict precedence order (governed by [Contract (Spec v0.1.1)](/docs/contract/)):

1. `nullif(current_setting('auditstream.actor', true), '')` — set via `set_config(..., true)` inside the current transaction.
2. Trailing `/*auditstream='<base64url>'*/` comment at the end of `right(current_query(), 4096)` — parsed with pure PostgreSQL string builtins (`rtrim`, `reverse`, `strpos`, `substr`, zero POSIX regexes) with explicit ≤ 683-character / ≤ 512-byte validation (auditstream#102).
3. The `sub` claim from `request.jwt.claims` (Supabase and PostgREST callers).
4. `NULL` actor, recording `db_user = session_user`.

> **Safety rule:** A malformed payload never aborts the application's write. The change is still recorded with `actor = NULL` and `actor_source = 'invalid'`.

## Indexing & hot paths

- **Monthly BRIN + partial HASH lookup index:** every partition carries a BRIN index on `occurred_at` and a partial HASH index `USING hash (record_id)` with `WHERE record_id IS NOT NULL` (auditstream#97), accelerating `history --table ... --record-id ...` lookups to **0.101 ms** with far lower write amplification than a wide composite B-tree.
- **Zero-subquery single-PK path:** `capture()` builds single-column primary keys directly with `jsonb_build_object(...)`, skips empty `TG_ARGV` and excluded-column array work, and evaluates `resolve_actor()` only after excluded-column-only UPDATE no-ops return early (auditstream#102).

## History table

All captured changes land in monthly-partitioned `auditstream.changes`:

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `id` | `bigint identity` | Insert order (not commit order) |
| `event_id` | `uuid` | Stable deduplication ID for downstream sinks |
| `occurred_at` | `timestamptz` | Monthly partition key + BRIN index |
| `xact_id` | `xid8` | Default `pg_current_xact_id()` — lossless export cursor |
| `source` | `text` | `db` for trigger capture, `app` for `audit.log()` |
| `schema_name`, `table_name`, `table_oid` | `text`, `text`, `oid` | Target relation |
| `op` | `text` | `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, or app action |
| `record_id` | `jsonb` | Primary key values |
| `before`, `after` | `jsonb` | Row images minus excluded columns |
| `changed` | `text[]` | Keys that differed on UPDATE |
| `actor`, `context` | `jsonb` | Normalized contract objects |
| `actor_source` | `text` | `set_config`, `comment`, `jwt`, `invalid`, or `NULL` |
| `db_user` | `text` | `session_user` |
| `schema_version` | `smallint` | Table layout version |

## Commit-safe xid8 cursor

Each export reads the safe committed window:

```sql
SELECT *
FROM   auditstream.changes
WHERE  xact_id >= $1
  AND  xact_id < pg_snapshot_xmin(pg_current_snapshot())
ORDER BY xact_id, id;
```

In testing, a naive `id > last_id` cursor lost a row when an earlier transaction committed after a later one. Stopping at `pg_snapshot_xmin()` guarantees zero missed rows without running a continuous daemon or holding a WAL replication slot.

## Tamper resistance

Trigger functions run as `SECURITY DEFINER` owned by a `NOLOGIN` role (`auditstream_owner`) with `SET search_path = pg_catalog, pg_temp`, PostgreSQL 16+ managed clouds handle non-superuser `CREATEROLE` grants automatically, and application roles receive SELECT-only access on `auditstream.changes`. See [Cloud, Poolers & Security](/docs/cloud-and-security/) for the full grant SQL, pooler guidance, and superuser/replica-mode threat model.

## Rust workspace

The `auditstream` engine is structured as a hexagonal Cargo workspace where `auditstream-core` holds domain types and port traits with zero I/O dependencies:

| Crate | Owns | Depends on | Forbids |
| :--- | :--- | :--- | :--- |
| `auditstream-core` | Domain types, port traits (`EventSource`, `Sink`), transport codec, diff and redaction | `serde`, `thiserror` | `tokio`, `sqlx`, any I/O crate |
| `auditstream-pg` | Schema introspection, DDL and trigger generation, migration writers, `xid8` reader | `core`, `sqlx`, `tokio` | `export`, binary |
| `auditstream-export` | Sinks (JSON Lines and CSV in v0.1; heavy sinks behind Cargo features later) | `core`, `tokio` | `sqlx`, `pg` |
| `auditstream` | CLI commands (`init`, `verify`, `status`, `history`, `export`), config, logging | All crates above, `clap`, `anyhow` | Business logic of its own |

## Extension traits

Capture sources and export destinations plug in through `EventSource` and `Sink`:

```rust
pub trait EventSource: Send {
    fn next_batch(&mut self, max: usize)
        -> impl Future<Output = Result<Option<Batch>, SourceError>> + Send;
    fn ack(&mut self, upto: &Cursor)
        -> impl Future<Output = Result<(), SourceError>> + Send;
}

pub trait Sink: Send {
    fn write(&mut self, batch: &Batch)
        -> impl Future<Output = Result<(), SinkError>> + Send;
    fn flush(&mut self)
        -> impl Future<Output = Result<(), SinkError>> + Send;
}
```

Delivery is **pull-based, in batches, at least once**. The cursor is acknowledged only after the sink flushes, and every event carries a stable UUID `event_id` so downstream destinations can deduplicate safely.

## Triggers vs. WAL

Logical replication (`pgoutput`) requires `wal_level = logical` (and an RDS reboot), `REPLICA IDENTITY FULL` on every audited table, an always-on consumer whose stalled slot can fill disk, and `pg_logical_emit_message(true, 'auditstream', ...)` inside explicit transactions to carry actors. Auditstream defers logical replication behind the `EventSource` trait so teams get production audit trails with zero new infrastructure first.

## Next steps

- Review the normative wire contract in [Contract (Spec v0.1.1)](/docs/contract/).
- Deploy safely with poolers and least-privilege roles in [Cloud, Poolers & Security](/docs/cloud-and-security/).
- Inspect every measured benchmark behind these design choices in [Evidence & Benchmarks](/docs/evidence/).
- Compare Auditstream against pgaudit, Debezium, and app logging in [Comparisons](/docs/compare/).
