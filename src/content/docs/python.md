---
title: Python
description: No native Python SDK yet — attribute PostgreSQL writes from psycopg today using Python's standard library while Django, Flask, and FastAPI adapters are planned.
section: SDKs & Languages
order: 4
eyebrow: SDKS & LANGUAGES · PYTHON
---

<div class="docs-callout-info">
  <strong>No native Python SDK yet:</strong> Dedicated packages for Django, Flask, and FastAPI are planned and not released yet. Because capture runs inside PostgreSQL triggers, you can attribute writes from <code>psycopg</code> today using only Python's standard library.
</div>

## Planned Python SDK

The planned SDK mirrors the [TypeScript SDK](/docs/typescript/) thin-adapter design: zero capture logic in Python, `contextvars.ContextVar` isolation, and automatic SQL comment tagging.

- **Core (`auditstream`):** `with audit.as_(actor):` / `async with` scope manager plus `audit.log()`, `audit.history()`, and `audit.query()`.
- **Django:** Request middleware binding `request.user` (or AI agent actors) plus a `connection.execute_wrapper` hook for transparent ORM tagging.
- **Flask & FastAPI:** Request lifecycle hooks attaching the authenticated actor across queries and background tasks.

Track progress or request a framework on [GitHub Discussions](https://github.com/auditstream/auditstream/discussions).

## Use today (`psycopg`)

Apply migrations with the CLI first ([Getting Started](/docs/getting-started/)), then attach actors using Python's standard library (`json` + `base64`).

### Trailing SQL comment

Encode compact actor JSON as unpadded base64url and append `/*auditstream='<tag>'*/` — works on auto-commit writes and stays pooler-safe:

```python
import base64
import json
import psycopg

def audit_comment(actor: dict) -> str:
    raw = json.dumps(
        actor, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    tag = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    return f" /*auditstream='{tag}'*/"

actor = {
    "type": "ai_agent",
    "id": "billing-agent",
    "onBehalfOf": {"type": "user", "id": "usr_42"},
    "tenant": "org_acme",
}

with psycopg.connect(DATABASE_URL) as conn:
    conn.execute(
        "UPDATE public.invoice SET status = %s WHERE id = %s"
        + audit_comment(actor),
        ("paid", "inv_901"),
        prepare=False,
    )
```

Always pass `prepare=False` with per-actor comments so `psycopg` does not cache a distinct prepared statement per actor.

### Transaction `set_config`

Inside an explicit transaction (or when keeping named prepared statements), set `auditstream.actor` with `is_local = true` so PostgreSQL clears it on commit or rollback:

```python
import json
import psycopg

actor_json = json.dumps(
    {"type": "user", "id": "usr_42", "tenant": "org_acme"},
    separators=(",", ":"),
)

with psycopg.connect(DATABASE_URL) as conn:
    with conn.transaction():
        conn.execute(
            "SELECT set_config('auditstream.actor', %s, true)",
            (actor_json,),
        )
        conn.execute(
            "UPDATE public.invoice SET status = %s WHERE id = %s",
            ("paid", "inv_901"),
        )
```

### Application events

Record non-database domain events (exports, approvals, logins) via `auditstream.log_event(action, target, data)`:

```python
conn.execute(
    "SELECT auditstream.log_event(%s, %s::jsonb, %s::jsonb)"
    + audit_comment(actor),
    (
        "invoice.exported",
        json.dumps({"id": "inv_901"}),
        json.dumps({"format": "pdf"}),
    ),
    prepare=False,
)
```
