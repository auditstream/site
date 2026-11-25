---
title: CLI & Day-2 Operations
description: All five auditstream subcommands (init, status, verify, history, export), auditstream.toml configuration, CI drift gating, and exit codes.
section: Operate
order: 6
eyebrow: OPERATE · CLI REFERENCE
---

The static `auditstream` v0.1.0 CLI handles migrations, drift checks, history, and `xid8` exports — data writes to stdout; logs and diagnostics write to stderr.

## Global options

| Flag & environment | Default | Purpose |
| :--- | :--- | :--- |
| `--config <PATH>`<br>`AUDITSTREAM_CONFIG` | `./auditstream.toml` | Path to TOML configuration file |
| `--database-url <URL>`<br>`AUDITSTREAM_DATABASE_URL`<br>`DATABASE_URL` | *none* | PostgreSQL URL (hidden in `--help`, redacted in logs and errors) |
| `--schema <SCHEMA>`<br>`AUDITSTREAM_SCHEMA` | `auditstream` | Schema holding `changes`, functions, and triggers |
| `-v`, `-vv`, `-q`<br>`AUDITSTREAM_LOG` | `warn` | Stderr verbosity (`-v` info, `-vv` debug, `-q` error; env overrides flags) |

## Subcommands

### init

Introspects tables, validates `--exclude` columns, writes idempotent migrations (`prisma`, `drizzle`, `sql`), and updates `auditstream.toml` without storing secrets:

```bash
auditstream init \
  --migrations prisma \
  --table public.invoice \
  --table public.users \
  --exclude public.users.password_hash
```

Use `--dry-run` to preview SQL on stdout, or `--out <dir>` to override default migration folders (`prisma/migrations`, `drizzle`, `migrations`).

### status

Summarizes capture coverage and partition health from PostgreSQL system catalogs — never running `count(*)` over monthly partitions:

```bash
# Default human-readable text output
auditstream status --format text

# Machine-readable JSON output
auditstream status --format json
```

- **Formats:** `--format text` (default) or `--format json`.
- **Coverage:** Lists every table (`captured`/`uncaptured`), TOML presence, trigger state (`enabled`, `disabled`, `partial`, `none`), and excluded columns.
- **Partition stats:** Reports `months_covered_ahead`, `changes_default` rows (`EXISTS ... LIMIT 1`), `pg_class.reltuples`, and `total_size_bytes`.
- **Advisory exit:** Exits 0 on successful catalog read; points operators to `auditstream verify` if `problems_found > 0`.

### verify

Runs all drift checks inside a `READ ONLY` transaction and exits 1 on any finding to gate CI:

- `missing` — history table, capture function, audited table, or expected trigger is missing.
- `disabled` — trigger or child-partition clone is disabled (`tgenabled = 'D'`) or replica-only (`'R'`).
- `outdated` — function body, security settings, or trigger exclusions drifted.
- `partitioned_table` (warning) — audited table is partitioned (direct child writes bypass statement triggers).
- `default_partition_rows` — rows stranded in `auditstream.changes_default`, blocking partition attachment.
- `insufficient_partitions` — fewer than two contiguous monthly partitions exist ahead of UTC now.

```bash
# Non-zero exit (1) on any drift (suitable for CI / scheduled jobs)
auditstream verify --format json

# Create missing monthly partitions 3 months ahead before verifying
auditstream verify --fix
```

Schedule in GitHub Actions (use a direct migration URL for `--fix`; see [Cloud, Poolers & Security](/docs/cloud-and-security/)):

```yaml
- name: Verify PostgreSQL audit trail health
  env:
    AUDITSTREAM_DATABASE_URL: ${{ secrets.AUDITSTREAM_VERIFY_URL }}
  run: auditstream verify --format json
```

### history

Queries recent changes newest-first (`occurred_at DESC, id DESC`), matching direct actors, tenants, and delegated `onBehalfOf` entries:

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
- `--tenant <ID>` matches `actor.tenant` or `actor.onBehalfOf.tenant` (self-asserted metadata; pair with `--since`/`--until`, does not replace RLS).
- `--limit` accepts `1`–`1000` (default `100`); pass `--format json` for `event.schema.json` lines with `before`/`after`.

Default `--format table` output (wrapped across two lines for width):

```text
OCCURRED_AT                  OP      TABLE           RECORD_ID
  ACTOR                                   ACTOR_SOURCE  CHANGED

2026-11-24T04:11:09.184000Z  UPDATE  public.invoice  {"id":1}
  ai_agent:billing-agent for user:usr_42  comment       status,paid_at

2026-11-24T04:08:12.004120Z  INSERT  public.invoice  {"id":1}
  user:usr_42                             comment       -
```

### export

Streams committed events in the lossless `xid8` window (`xact_id >= cursor AND xact_id < pg_snapshot_xmin()`), advancing checkpoints only after flush ([How Capture Works](/docs/capture/)):

```bash
auditstream export \
  --format jsonl \
  --output audit.jsonl \
  --cursor-file cursor.json \
  --tenant org_acme \
  --batch-size 1000
```

- **Flags:** `--format jsonl|csv`, `--since`, `--until`, `--actor`, `--tenant`, `--source db|app`, `--batch-size N` (default `1000`), and `--from-start`.
- **Cursor safety:** Exits 2 if resumed against a different database, schema, filter set, sink format/path, or `export.redaction` policy.
- **Atomicity:** Holds an OS lock (`<cursor-file>.lock`) and replaces checkpoint files atomically.
- **Pipes:** Exits 0 cleanly on `SIGPIPE` for stateless stdout pipes (`auditstream export | head -n 5`).

## Configuration

Precedence: **CLI flag → env var (global options) → `auditstream.toml` → default**; unknown keys or invalid types exit 2.

```toml
schema = "auditstream"

[capture]
tables = ["public.invoice", "public.line_item"]
# Stripped at trigger capture time
exclude = ["public.invoice.password_hash"]

[migrations]
format = "prisma"             # "prisma", "drizzle", or "sql"
dir = "prisma/migrations"

[export]
cursor_file = ".auditstream.cursor"
batch_size = 1000

[export.sink]
type = "jsonl"                # "jsonl" (default) or "csv"
path = "events.jsonl"         # omit to stream to stdout

# Export-time redaction: mask ("[redacted]") or remove top-level keys
# in before/after payloads
[[export.redaction.rules]]
table = "public.invoice"      # "table", "schema.table", or "*"
columns = ["ssn", "tax_id"]
mode = "mask"                 # "mask" (default) or "remove"

[[export.redaction.rules]]
action = "invoice.exported"   # app-event op (source = "app"), or "*"
columns = ["recipient_email"]
mode = "remove"
```

- **Secrets in `capture.exclude`:** Strip password hashes, credentials, PAN/CVV, and tokens at capture time; use `export.redaction.rules` for app events or two-tier exports.
- **Top-level keys only:** Dot-paths (`metadata.ssn`) exit 2 at startup; untouched key order and arbitrary-precision PostgreSQL `numeric` values stay intact.
- **Fail-closed:** If a matching rule hits a non-object or malformed JSON payload, `export` exits 5 before writing or advancing the cursor.

## Exit codes

Exit codes are part of the public contract; every non-clap failure writes one `error:` line to stderr and leaves stdout untouched.

| Code | Name | Meaning |
| ---: | :--- | :--- |
| **0** | Success | Command succeeded (including `--help`, `--version`, empty `history`, and `BrokenPipe` on stateless stdout streams) |
| **1** | Check&nbsp;failed | `auditstream verify` found drift, disabled triggers, `changes_default` rows, or fewer than 2 future partitions |
| **2** | Usage&nbsp;/&nbsp;config | Invalid CLI flags, missing `--config`, unknown TOML key, invalid filter/redaction rule, or incompatible checkpoint |
| **3** | Database&nbsp;error | PostgreSQL connection, permission, query, migration, or `verify --fix` failure |
| **4** | Output&nbsp;/&nbsp;cursor | Filesystem I/O error, held cursor lock, corrupt cursor, truncated output file, or `BrokenPipe` with `--cursor-file` |
| **5** | Internal&nbsp;error | Fail-closed redaction error on a non-object/malformed payload or unexpected internal error |
| **101** | Panic | Uncaught Rust runtime panic |
