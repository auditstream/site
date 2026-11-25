---
title: How Capture Works
description: Hybrid PostgreSQL triggers, four-step actor resolution, monthly-partitioned history schema, commit-safe xid8 cursors, and triggers vs. logical replication.
section: Reference
order: 8
eyebrow: REFERENCE · HOW CAPTURE WORKS
---

Generated PostgreSQL triggers record row changes into monthly-partitioned `auditstream.changes` — with zero sidecars, no `wal_level = logical`, and no replication slots.

## Trigger strategy

- **Statement-level INSERT & DELETE:** Transition tables resolve the actor once per statement — **211k–213k rows/s** (+3.7–4.0 µs/row on PG 19 tmpfs; **60.5 ms** / +3.8 µs/row for 10k durable-disk INSERT; [Benchmarks](/docs/evidence/)).
- **Row-level UPDATE:** `WHEN (OLD.* IS DISTINCT FROM NEW.*)` skips no-ops and adds **+3.2% (+5.1 µs/row)** on durable disk. Single-statement bulk UPDATEs cap at **~15k rows/s** (+64.5 µs/row) because transition tables cannot correlate changed primary keys.
- **Statement-level TRUNCATE:** `AFTER TRUNCATE FOR EACH STATEMENT` records the truncated table and actor.
- **Excluded columns:** Columns like `password_hash` are stripped before storing `before`/`after`; updates touching only excluded columns write no row.

## Actor resolution order

Inside every trigger, PostgreSQL resolves the acting identity in strict precedence ([Wire Format & Spec](/docs/contract/)):

1. `nullif(current_setting('auditstream.actor', true), '')` — transaction-local `set_config(..., true)`.
2. Trailing `/*auditstream='<base64url>'*/` in `right(current_query(), 4096)` — pure string builtins (zero regexes), validating ≤ 683 chars / ≤ 512 bytes.
3. The `sub` claim from `request.jwt.claims` (Supabase and PostgREST callers).
4. `NULL` actor, recording `db_user = session_user`.

> **Safety rule:** Malformed payloads never abort writes — changes still commit with `actor = NULL` and `actor_source = 'invalid'`.

## Indexing & hot paths

- **BRIN + partial HASH indexes:** Monthly partitions carry a BRIN index on `occurred_at` and a partial HASH index on `record_id` (`IS NOT NULL`), giving **0.101 ms** record lookups with low write amplification.
- **Fast single-column PK path:** `capture()` builds single-column PKs via `jsonb_build_object(...)`, skips empty exclusion lists, and exits excluded-only UPDATE no-ops before calling `resolve_actor()`.

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

Stopping at `pg_snapshot_xmin()` avoids missed rows when older transactions commit late — without a daemon or WAL slot. Delivery is **pull-based and at-least-once**: checkpoints advance only after flush, and `event_id` enables downstream deduplication.

## Tamper resistance

Triggers execute as `SECURITY DEFINER` owned by `NOLOGIN` role `auditstream_owner` (`SET search_path = pg_catalog, pg_temp`), with SELECT-only runtime grants. See [Cloud, Poolers & Security](/docs/cloud-and-security/) for grant SQL and threat boundaries.

## Triggers vs. WAL

Logical replication (`pgoutput`) requires `wal_level = logical`, `REPLICA IDENTITY FULL`, an always-on consumer whose stalled slot can fill disk, and explicit transactions for `pg_logical_emit_message()`. Triggers give teams structured audits inside standard PostgreSQL with zero new infrastructure.

Contributing to the Rust engine? Explore the Cargo workspace in [`auditstream/auditstream`](https://github.com/auditstream/auditstream).
