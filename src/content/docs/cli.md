---
title: CLI & Day-2 Operations
description: All five auditstream subcommands (init, status, verify, history, export), auditstream.toml configuration, CI drift gating, and exit codes.
section: Operate
order: 4
eyebrow: OPERATE · CLI REFERENCE
---

The single static `auditstream` Rust binary (v0.1.0) handles migration generation, drift verification, catalog status checks, terminal history inspection, and lossless `xid8` batch exports. Data always writes to **stdout**; logs and diagnostics go to **stderr**.

## Global options

| Flag & environment | Default | Purpose |
| :--- | :--- | :--- |
| `--config <PATH>`<br>`AUDITSTREAM_CONFIG` | `./auditstream.toml` | Path to TOML configuration file |
| `--database-url <URL>`<br>`AUDITSTREAM_DATABASE_URL` / `DATABASE_URL` | none | PostgreSQL connection URL (hidden in `--help`, redacted in logs and errors) |
| `--schema <SCHEMA>`<br>`AUDITSTREAM_SCHEMA` | `auditstream` | Schema holding `changes`, functions, and triggers |
| `-v`, `-vv`, `-q`<br>`AUDITSTREAM_LOG` | `warn` | Stderr verbosity (`-v` info, `-vv` debug, `-q` error only; env var overrides flags) |

## Subcommands

### init

`auditstream init` introspects selected tables, validates excluded columns, writes idempotent migrations (`prisma`, `drizzle`, or `sql`), and updates `[capture]` and `[migrations]` in `auditstream.toml` without writing `database_url` or secrets:

```bash
auditstream init \
  --migrations prisma \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

Add `--dry-run` to preview generated SQL on stdout without writing files, or `--out <dir>` to override the default migration directory (`prisma/migrations`, `drizzle`, or `migrations`). See [Getting Started](/docs/getting-started/) for a complete walkthrough.

### status

`auditstream status` summarizes capture coverage across tables in scope and reports history-table health directly from PostgreSQL system catalogs — **never running `count(*)`** over monthly partitions:

```bash
# Default human-readable text output
auditstream status --format text

# Machine-readable JSON output
auditstream status --format json
```

- **Formats:** `--format text` (default) or `--format json`.
- **Table coverage:** lists every table in scope (`captured` or `uncaptured`), whether it is configured in `auditstream.toml`, its trigger state (`enabled`, `disabled`, `partial`, or `none`), and its excluded columns.
- **Partition & catalog stats:** reports monthly partitions, `months_covered_ahead`, whether `changes_default` holds rows (`EXISTS (... LIMIT 1)`), catalog-estimated row counts (`pg_class.reltuples`), and `total_size_bytes` (`pg_total_relation_size`).
- **Advisory exit behavior:** exits 0 whenever the catalog read succeeds; if `problems_found > 0`, prints a hint directing operators to `auditstream verify`.

### verify

`auditstream verify` acts as a CI drift gate. It runs all checks inside a `READ ONLY` transaction and exits 1 on any finding so silent trigger or partition drift fails CI before reaching production:
- `missing` — history table, capture function, audited table, or expected trigger is missing;
- `disabled` — trigger (or child partition clone) is disabled (`tgenabled = 'D'`) or replica-only (`'R'`);
- `outdated` — function body, security settings, or trigger definition/exclusions drifted;
- `partitioned_table` (warning) — audited table is partitioned (direct child-partition writes bypass statement triggers);
- `default_partition_rows` — rows stranded in `auditstream.changes_default` (blocking monthly partition attachment);
- `insufficient_partitions` — fewer than two contiguous monthly partitions exist ahead of the current UTC month.

```bash
# Non-zero exit (1) on any drift (suitable for CI / scheduled jobs)
auditstream verify --format json

# Create missing future monthly partitions 3 months ahead before verifying
auditstream verify --fix
```

Drop it into a scheduled GitHub Actions workflow (run `--fix` against your direct migration connection string — see [Cloud, Poolers & Security](/docs/cloud-and-security/)):

```yaml
- name: Verify PostgreSQL audit trail health
  env:
    AUDITSTREAM_DATABASE_URL: ${{ secrets.AUDITSTREAM_VERIFY_URL }}
  run: auditstream verify --format json
```

### history

`auditstream history` queries recent changes newest-first (`occurred_at DESC, id DESC`), matching direct actors/tenants and delegated `onBehalfOf` entries:

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
- `--tenant <ID>` matches `actor.tenant` or `actor.onBehalfOf.tenant` (pair with `--since`/`--until` for partition pruning; note that `actor.tenant` is self-asserted actor metadata and does not replace PostgreSQL row-level security).
- `--limit` accepts 1 to 1000 (default 100).

Example `--format table` output (default; pass `--format json` for newline-delimited `event.schema.json` records including `before` and `after`):

```text
OCCURRED_AT                  OP      TABLE           RECORD_ID   ACTOR                                  ACTOR_SOURCE  CHANGED
2026-11-24T04:11:09.184000Z  UPDATE  public.invoice  {"id":1}    ai_agent:billing-agent for user:usr_42  comment       status,paid_at
2026-11-24T04:08:12.004120Z  INSERT  public.invoice  {"id":1}    user:usr_42                            comment       -
```

### export

`auditstream export` streams committed events inside the lossless `xid8` window (`xact_id >= cursor AND xact_id < pg_snapshot_xmin()`), advancing the checkpoint file only after the destination flushes (see [Capture & Engine Architecture](/docs/capture/) for cursor semantics):

```bash
auditstream export \
  --format jsonl \
  --output audit.jsonl \
  --cursor-file cursor.json \
  --tenant org_acme \
  --batch-size 1000
```

- Supports `--format jsonl` (default) or `--format csv`, `--since`, `--until`, `--actor`, `--tenant`, `--source db|app`, `--batch-size N` (default 1000), and `--from-start` to replay from the beginning.
- Refuses with exit code 2 to resume a cursor against a different database, schema, filter set, sink format/path, or `export.redaction` policy.
- Holds an OS lock via `<cursor-file>.lock` and replaces checkpoints atomically.
- Cleanly stops with exit code 0 on `SIGPIPE` for stateless stdout pipes (for example `auditstream export | head -n 5`).

## Configuration

Configuration lives in `auditstream.toml`. Values resolve in strict precedence order: **CLI flag → environment variable (global options only) → `auditstream.toml` → built-in default**. Unknown keys or wrong value types always fail fast with exit code 2.

```toml
schema = "auditstream"

[capture]
tables = ["public.invoice", "public.line_item"]
exclude = ["public.invoice.password_hash"]   # stripped at trigger capture time

[migrations]
format = "prisma"                            # "prisma", "drizzle", or "sql"
dir = "prisma/migrations"

[export]
cursor_file = ".auditstream.cursor"
batch_size = 1000

[export.sink]
type = "jsonl"                               # "jsonl" (default) or "csv"
path = "events.jsonl"                        # omit to stream to stdout

# Export-time redaction: mask ("[redacted]") or remove top-level keys in before/after
[[export.redaction.rules]]
table = "public.invoice"                     # "table", "schema.table", or "*"
columns = ["ssn", "tax_id"]
mode = "mask"                                # "mask" (default) or "remove"

[[export.redaction.rules]]
action = "invoice.exported"                  # app-event op (source = "app"), or "*"
columns = ["recipient_email"]
mode = "remove"
```

- **Secrets belong in `capture.exclude`:** Put password hashes, credentials, PAN/CVV, and API tokens in `capture.exclude` so triggers never write them into `auditstream.changes`. Use `[[export.redaction.rules]]` for application events (`log_event`), retroactive minimization, or two-tier SIEM/customer exports.
- **Top-level keys & fail-closed:** Redaction rules match top-level keys only (dot-paths like `metadata.ssn` exit 2 at startup) and preserve untouched key order and arbitrary-precision PostgreSQL `numeric` values. If a matching rule hits a non-object or malformed JSON payload, `export` fails closed with exit code 5 before writing or advancing the cursor.

## Exit codes

CLI exit codes are part of the public engine contract (`crates/auditstream/src/exit.rs`). Every non-clap failure writes a single `error:` line to stderr and leaves stdout untouched.

| Code | Name | Meaning |
| :--- | :--- | :--- |
| **0** | Success | Command succeeded (including `--help`, `--version`, empty `history` results, and `BrokenPipe` on stateless stdout reads/exports) |
| **1** | Check failed | Verification found problems (`auditstream verify` drift, missing/disabled triggers, rows in `changes_default`, or fewer than 2 future partitions) |
| **2** | Usage or config error | Invalid CLI flags, missing `--config` file, unknown `auditstream.toml` key, invalid filter/redaction rule, or incompatible export checkpoint |
| **3** | Database error | PostgreSQL connection, permission, query, or migration / `verify --fix` failure |
| **4** | Output or cursor error | Filesystem I/O failure, held cursor lock, corrupt cursor, shortened export output file, or `BrokenPipe` on a stateful (`--cursor-file`) export |
| **5** | Internal error | Fail-closed redaction error on a non-object/malformed payload or unexpected internal failure |
| **101** | Panic | Uncaught Rust runtime panic |

## Next steps

- Configure connection poolers, least-privilege roles, and non-TypeScript drivers in [Cloud, Poolers & Security](/docs/cloud-and-security/).
- Understand how triggers and the `xid8` cursor work under the hood in [Capture & Engine Architecture](/docs/capture/).
- See 500k-row `export`, `history`, `status`, and `verify` timings in [Evidence & Benchmarks](/docs/evidence/).
