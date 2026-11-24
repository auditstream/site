---
title: Capture Design
description: Hybrid triggers, four-step actor resolution, partitioned history layout, security boundaries, and why WAL replication is deferred.
section: Architecture
order: 3
eyebrow: ARCHITECTURE · POSTGRESQL
---

In v0.1, Auditstream captures every mutation inside PostgreSQL using generated triggers that write to a monthly-partitioned `auditstream.changes` table.

## Trigger strategy

- **`INSERT` and `DELETE` are statement-level** using transition tables (`REFERENCING NEW TABLE` / `OLD TABLE`). The actor is resolved once per statement instead of once per row — cutting a 10,000-row insert from 541–550 ms down to **155–180 ms**.
- **`UPDATE` stays row-level** with `WHEN (OLD.* IS DISTINCT FROM NEW.*)` so no-op updates write nothing. Measuring a statement-level update showed primary-key changes split into two half-events and 4% slower single-row writes.
- **`TRUNCATE`** uses a dedicated `AFTER TRUNCATE FOR EACH STATEMENT` trigger recording the table and actor.
- **Excluded columns** (such as `password_hash`) are stripped before storing `before` and `after`; an update touching only excluded columns writes no audit row.

## Actor resolution order

Inside every trigger, PostgreSQL resolves the acting identity in strict precedence order:

1. `nullif(current_setting('auditstream.actor', true), '')` — set via `set_config(..., true)` inside the current transaction.
2. Trailing `/*auditstream='<base64url>'*/` comment at the end of `right(current_query(), 4096)` — parsed with pure PostgreSQL string builtins (`rtrim`, `reverse`, `strpos`, `substr`, zero POSIX regexes) with explicit `<= 683`-char / `<= 512`-byte validation (`auditstream#102`).
3. The `sub` claim from `request.jwt.claims` (Supabase and PostgREST callers).
4. `NULL` actor, recording `db_user = session_user`.

> **Safety rule:** A malformed payload never aborts the application's write. The change is still recorded with `actor = NULL` and `actor_source = 'invalid'`.

## Indexing & trigger hot-path tuning

- **Monthly BRIN + partial `HASH` lookup index:** every partition carries a BRIN index on `occurred_at` and a partial `HASH` index `USING hash (record_id) WHERE record_id IS NOT NULL` (`auditstream#97`), accelerating `history --table ... --record-id ...` lookups with far lower write amplification than a wide composite B-tree.
- **Zero-subquery single-PK path:** `capture()` builds single-column primary keys directly with `jsonb_build_object(...)`, skips empty `TG_ARGV` / excluded-column array work, and evaluates `resolve_actor()` only after excluded-column-only `UPDATE` no-ops return early (`auditstream#102`).

## History table (`auditstream.changes`)

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
| `changed` | `text[]` | Keys that differed on `UPDATE` |
| `actor`, `context` | `jsonb` | Normalized contract objects |
| `actor_source` | `text` | `set_config`, `comment`, `jwt`, `invalid`, or `NULL` |
| `db_user` | `text` | `session_user` |
| `schema_version` | `smallint` | Table layout version |

## Commit-safe `xid8` export cursor

Each export reads the safe committed window:

```sql
SELECT *
FROM   auditstream.changes
WHERE  xact_id >= $1
  AND  xact_id < pg_snapshot_xmin(pg_current_snapshot())
ORDER BY xact_id, id;
```

In testing, a naive `id > last_id` cursor lost a row when an earlier transaction committed after a later one. Stopping at `pg_snapshot_xmin()` guarantees zero missed rows without running a continuous daemon or holding a WAL replication slot.

## Security & tamper resistance

- Trigger functions run as `SECURITY DEFINER` owned by a `NOLOGIN` role (`auditstream_owner`) with `SET search_path = pg_catalog, pg_temp`.
- On PostgreSQL 16+ managed clouds (Neon, Supabase), migrations automatically grant `auditstream_owner` to the non-superuser migration role before creating owned objects.
- Application roles get `SELECT` only on `auditstream.changes`. Direct `INSERT`, `UPDATE`, and `DELETE` attempts are denied by Postgres while application writes continue to be captured.

## Why triggers first, and when WAL replication

Logical replication (`pgoutput`) requires `wal_level = logical` (and an RDS reboot), `REPLICA IDENTITY FULL` on every audited table, an always-on consumer whose stalled slot can fill disk, and `pg_logical_emit_message(true, 'auditstream', ...)` inside explicit transactions to carry actors. Auditstream defers logical replication behind the `EventSource` trait so teams get production audit trails with zero new infrastructure first.
