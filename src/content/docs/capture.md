---
title: How Capture Works
description: Hybrid PostgreSQL triggers, four-step actor resolution, monthly-partitioned history schema, commit-safe xid8 cursors, and triggers vs. logical replication.
section: Reference
order: 8
eyebrow: REFERENCE · HOW CAPTURE WORKS
---

Auditstream captures every mutation directly inside PostgreSQL using generated triggers that write to a monthly-partitioned `auditstream.changes` table — with zero sidecar daemons, no `wal_level = logical`, and no replication slot holding WAL on disk.

## Trigger strategy

- **INSERT and DELETE are statement-level** using transition tables (`REFERENCING NEW TABLE` / `OLD TABLE`). The actor is resolved once per statement instead of once per row — sustaining **211k–213k rows/s** (+3.7–4.0 µs/row, 100k INSERT in **473 ms**, 10k DELETE in **46.9 ms**) with a heavy 368-byte AI-agent actor on PostgreSQL 19 tmpfs, and **60.5 ms** (+3.8 µs/row) for a 10k INSERT on durable disk (`fsync=on`; see [Benchmarks & Limits](/docs/evidence/)).
- **UPDATE stays row-level** with `WHEN (OLD.* IS DISTINCT FROM NEW.*)` so no-op updates write nothing and single-row durable-disk updates add only **+3.2% (+5.1 µs/row)**. The honest trade-off is that single-statement bulk UPDATE statements (for example, 10,000 rows in one statement) cap at **~15k rows/s** (665 ms, +64.5 µs/row), because statement-level UPDATE transition tables cannot correlate rows safely when primary keys change.
- **TRUNCATE** uses a dedicated `AFTER TRUNCATE FOR EACH STATEMENT` trigger recording the table and actor.
- **Excluded columns** (such as `password_hash`) are stripped before storing `before` and `after`; an update touching only excluded columns writes no audit row.

## Actor resolution order

Inside every trigger, PostgreSQL resolves the acting identity in strict precedence order (defined in [Wire Format & Spec](/docs/contract/)):

1. `nullif(current_setting('auditstream.actor', true), '')` — set via `set_config(..., true)` inside the current transaction.
2. Trailing `/*auditstream='<base64url>'*/` comment at the end of `right(current_query(), 4096)` — parsed with pure PostgreSQL string builtins (`rtrim`, `reverse`, `strpos`, `substr`, zero POSIX regexes) with explicit ≤ 683-character / ≤ 512-byte validation.
3. The `sub` claim from `request.jwt.claims` (Supabase and PostgREST callers).
4. `NULL` actor, recording `db_user = session_user`.

> **Safety rule:** A malformed payload never aborts the application's write. The change is still recorded with `actor = NULL` and `actor_source = 'invalid'`.

## Indexing & hot paths

- **Monthly BRIN + partial HASH lookup index:** every partition carries a BRIN index on `occurred_at` and a partial HASH index `USING hash (record_id)` with `WHERE record_id IS NOT NULL`, accelerating `history --table ... --record-id ...` lookups to **0.101 ms** with far lower write amplification than a wide composite B-tree.
- **Fast single-column PK path:** `capture()` builds single-column primary keys directly with `jsonb_build_object(...)` without correlated subqueries, skips empty excluded-column work, and evaluates `resolve_actor()` only after excluded-column-only UPDATE no-ops return early.

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
| `actor`, `context` | `jsonb` | Normalized actor & request metadata |
| `actor_source` | `text` | `set_config`, `comment`, `jwt`, `invalid`, or `NULL` |
| `db_user` | `text` | `session_user` |
| `schema_version` | `smallint` | Table layout version |

## Commit-safe `xid8` cursor

Each export reads the safe committed window:

```sql
SELECT *
FROM   auditstream.changes
WHERE  xact_id >= $1
  AND  xact_id < pg_snapshot_xmin(pg_current_snapshot())
ORDER BY xact_id, id;
```

A naive `id > last_id` cursor loses rows whenever an earlier transaction commits after a later one. Stopping at `pg_snapshot_xmin()` guarantees zero missed rows without running a continuous daemon or holding a WAL replication slot. Delivery is **pull-based, in batches, at least once**: the cursor advances only after the sink flushes, and every event carries a stable UUID `event_id` for downstream deduplication.

## Tamper resistance

Trigger functions run as `SECURITY DEFINER` owned by a `NOLOGIN` role (`auditstream_owner`) with `SET search_path = pg_catalog, pg_temp`, PostgreSQL 16+ managed clouds handle non-superuser `CREATEROLE` grants automatically, and application roles receive SELECT-only access on `auditstream.changes`. See [Cloud, Poolers & Security](/docs/cloud-and-security/) for the full grant SQL, pooler guidance, and threat model.

## Triggers vs. WAL

Logical replication (`pgoutput`) requires `wal_level = logical` (and an RDS reboot), `REPLICA IDENTITY FULL` on every audited table, an always-on consumer whose stalled slot can fill disk, and `pg_logical_emit_message(true, 'auditstream', ...)` inside explicit transactions to carry actors. Trigger capture gives teams production audit trails inside standard PostgreSQL with zero new infrastructure first.

## Next steps

- Review actor schemas and base64url transport rules in [Wire Format & Spec](/docs/contract/).
- Deploy safely with poolers and least-privilege roles in [Cloud, Poolers & Security](/docs/cloud-and-security/).
- Inspect every measured benchmark behind these trade-offs in [Benchmarks & Limits](/docs/evidence/) and [Comparisons](/docs/compare/).
- Interested in contributing to the Rust engine? Explore the Cargo workspace in [`auditstream/auditstream`](https://github.com/auditstream/auditstream).
