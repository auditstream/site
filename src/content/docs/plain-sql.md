---
title: Plain SQL
description: Attribute PostgreSQL writes from Go, Ruby, Java, psql, or any SQL client using trailing base64url comments, transaction-local set_config, or log_event().
section: SDKs & Languages
order: 5
eyebrow: SDKS & LANGUAGES · PLAIN SQL
---

Any language or SQL client (Go, Ruby, Java, Rust, `psql`) can attribute writes; keep payloads IDs-only and under **512 UTF-8 bytes** ([Wire Format & Spec](/docs/contract/)).

## Trailing SQL comment

Encode compact actor JSON as unpadded base64url (`A-Za-z0-9_-`) and append `/*auditstream='<value>'*/` at the end of the statement (for `{"type":"user","id":"usr_42"}`, the tag is `eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0`).

```bash
psql "$AUDITSTREAM_DATABASE_URL" -c "
  INSERT INTO public.invoice (id, status)
  VALUES (10, 'open')
  /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;
"
```

Trailing comments are the default: they work on auto-commit writes and never pin backend sessions behind PgBouncer, Supavisor, or AWS RDS Proxy.

> **Prepared statements:** Never pair per-actor SQL comments with **named** prepared statements — drivers cache each distinct comment string indefinitely. Disable statement naming for tagged queries or use `set_config` below.

## Transaction `set_config`

Inside an explicit transaction, call `set_config('auditstream.actor', '<json>', true)` before writes; `is_local = true` clears the actor on commit or rollback so it never leaks across pooled connections.

```bash
psql "$AUDITSTREAM_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
BEGIN;
SELECT set_config(
  'auditstream.actor',
  '{\"type\":\"user\",\"id\":\"usr_42\"}',
  true
);
UPDATE public.invoice SET status = 'paid' WHERE id = 10;
COMMIT;
"
```

When both `set_config` and a trailing SQL comment are present on the same statement, `set_config` takes precedence.

## Application events

Record non-database domain events (exports, logins, approvals) via `auditstream.log_event(action, target, data)` (`target` and `data` must be JSON objects or `NULL`):

```bash
psql "$AUDITSTREAM_DATABASE_URL" -c "
  SELECT auditstream.log_event(
    'invoice.exported',
    '{\"id\":10}'::jsonb,
    '{\"format\":\"pdf\"}'::jsonb
  )
  /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;
"
```
