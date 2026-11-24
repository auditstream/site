---
title: CLI & Day-2 Operations
description: All five auditstream subcommands (init, status, verify, history, export), drift detection in CI, partition maintenance, and exit codes.
section: Start
order: 2.5
eyebrow: START · CLI REFERENCE
---

The single static `auditstream` Rust binary handles migration generation, drift verification, terminal inspection, and lossless `xid8` batch exports. Data always writes to **stdout**; logs and diagnostics go to **stderr**.

## Global options

| Flag | Environment | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `--config <PATH>` | `AUDITSTREAM_CONFIG` | `./auditstream.toml` | Path to TOML configuration file |
| `--database-url <URL>` | `AUDITSTREAM_DATABASE_URL`, `DATABASE_URL` | none | PostgreSQL connection URL (redacted in logs and errors) |
| `--schema <SCHEMA>` | `AUDITSTREAM_SCHEMA` | `auditstream` | Schema holding `changes`, functions, and triggers |
| `-v`, `-vv`, `-q` | `AUDITSTREAM_LOG` | `warn` | Stderr verbosity (`info`, `debug`, or `error` only) |

## Subcommands

### `auditstream init`

Introspects selected tables, validates excluded columns, writes idempotent migrations (`prisma`, `drizzle`, or `sql`), and updates `auditstream.toml`:

```bash
auditstream init \
  --migrations prisma \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

Add `--dry-run` to preview generated SQL on stdout without writing files.

### `auditstream verify` (CI drift gate)

Detects silent trigger or partition drift before an audit gap reaches production:
- Missing or disabled triggers (`tgenabled = 'D'`);
- Modified trigger function definitions;
- Rows stranded in `auditstream.changes_default`;
- Fewer than two pre-created future monthly partitions.

```bash
# Non-zero exit on any drift (suitable for CI / scheduled jobs)
auditstream verify --format json

# Create missing future monthly partitions automatically
auditstream verify --fix
```

Drop it into a scheduled GitHub Actions workflow:

```yaml
- name: Verify PostgreSQL audit trail health
  env:
    AUDITSTREAM_DATABASE_URL: ${{ secrets.AUDITSTREAM_VERIFY_URL }}
  run: auditstream verify --format json
```

### `auditstream status`

Prints schema version, installed triggers per table, partition range, and row counts (`--format table` or `--format json`).

### `auditstream history`

Queries recent changes newest-first (`occurred_at DESC, id DESC`), matching direct actors/tenants and delegated `onBehalfOf` entries:

```bash
auditstream history \
  --table public.invoice \
  --record-id 1 \
  --actor usr_42 \
  --tenant org_acme \
  --since 2026-11-01 \
  --limit 20
```

- `--actor <ID>` matches `actor.id` or `actor.onBehalfOf.id`.
- `--tenant <ID>` matches `actor.tenant` or `actor.onBehalfOf.tenant` (note that `actor.tenant` is self-asserted actor metadata and does not replace PostgreSQL row-level security).

Example table output (pass `--format json` for newline-delimited `event.schema.json` records including `before` and `after`):

```text
OCCURRED_AT                  OP      TABLE           RECORD_ID   ACTOR                                ACTOR_SOURCE  CHANGED
2026-11-24T04:11:09.184000Z  UPDATE  public.invoice  {"id":1}    ai_agent:billing-agent for user:usr_42  comment       status,paid_at
2026-11-24T04:08:12.004120Z  INSERT  public.invoice  {"id":1}    user:usr_42                          comment       -
```

### `auditstream export`

Exports committed events inside the lossless `xid8` window (`xact_id >= cursor AND xact_id < pg_snapshot_xmin()`), advancing the checkpoint file only after the destination flushes:

```bash
auditstream export \
  --format jsonl \
  --output audit.jsonl \
  --cursor-file cursor.json \
  --tenant org_acme \
  --batch-size 1000
```

- Supports `--format jsonl` (default) or `--format csv`, `--since`, `--until`, `--actor`, `--tenant`, `--source db|app`, and `--from-start` to replay from the beginning.
- Refuses to resume a cursor against a different database, schema, filter set, redaction policy, or output path.
- Cleanly handles `SIGPIPE` when piped (for example `auditstream export | head -n 5`).

#### Export-time redaction (`auditstream.toml`)

Even when a column was not excluded at trigger capture time, you can mask or strip top-level fields inside `before` and `after` before events reach the export sink. Rules are compiled up front, fail closed on error, and are bound into export checkpoints:

```toml
[[export.redaction.rules]]
table = "public.invoice"      # "table", "schema.table", or "*" (use `action` for app events)
columns = ["ssn", "tax_id"]
mode = "mask"                 # "mask" (default) or "remove"
```
