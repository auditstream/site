---
title: Plain SQL
description: Attribute PostgreSQL writes from Go, Ruby, Java, psql, or any SQL client using trailing base64url comments, transaction-local set_config, or log_event().
section: SDKs & Languages
order: 5
eyebrow: SDKS & LANGUAGES · PLAIN SQL
---

Because capture triggers live inside PostgreSQL, **any language or SQL client** (Go `pgx`/`database/sql`, Ruby `pg`, Java JDBC, Rust `sqlx`, or `psql`) can attribute writes without waiting for a dedicated SDK. Keep actor payloads to IDs only and strictly under **512 UTF-8 bytes** (see [Wire Format & Spec](/docs/contract/)).

## Trailing SQL comment (default)

Serialize the actor object as compact JSON, encode its UTF-8 bytes as unpadded base64url (`A-Za-z0-9_-`), and append `/*auditstream='<value>'*/` at the end of the SQL statement.

For `{"type":"user","id":"usr_42"}`, the unpadded base64url value is `eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0`:

```bash
psql "$AUDITSTREAM_DATABASE_URL" -c "
  INSERT INTO public.invoice (id, status)
  VALUES (10, 'open')
  /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;
"
```

Trailing comments are the recommended default: they work on auto-commit statements without an explicit transaction and do not pin backend sessions behind PgBouncer, Supavisor, or AWS RDS Proxy.

> **Prepared statements rule:** Never combine per-actor SQL comments with **named** prepared statements — each distinct comment creates a new statement name that drivers cache indefinitely. Disable prepared statement naming for tagged queries, or use `set_config` below.

## Transaction `set_config`

Inside an explicit transaction, call `set_config('auditstream.actor', '<json>', true)` before your writes. Always pass **`true`** (`is_local`) so PostgreSQL clears the setting automatically on commit or rollback and never leaks actors across pooled connections:

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

Record non-database domain events (exports, logins, approvals) directly through `auditstream.log_event(action, target, data)`. Both `target` and `data` must be JSON objects or `NULL`:

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

## Next steps

- Review all actor fields, base64url guarantees, and validation rules in [Wire Format & Spec](/docs/contract/).
- Using TypeScript or Python? See [TypeScript](/docs/adapters/) and [Python](/docs/python/).
- Configure poolers and least-privilege roles in [Cloud, Poolers & Security](/docs/cloud-and-security/).
