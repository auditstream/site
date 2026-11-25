---
title: Python
description: Official Python SDK for Django, Flask, and FastAPI is coming soon — and you can attribute PostgreSQL writes from psycopg today with zero dependencies.
section: SDKs & Languages
order: 4
badge: Soon
eyebrow: SDKS & LANGUAGES · PYTHON
---

> **Python SDK coming soon:** Native `auditstream` Python packages with `contextvars`-based actor scoping for **Django**, **Flask**, and **FastAPI / SQLAlchemy** are on the roadmap. Because capture runs inside PostgreSQL triggers, you can use Auditstream from Python **today** using `psycopg` with a trailing SQL comment or transaction-local `set_config`.

## Planned Python SDK

The upcoming Python SDK follows the exact same thin-adapter design as the [TypeScript SDK](/docs/adapters/) — zero capture logic in Python, `contextvars.ContextVar` for async/sync isolation, and automatic trailing SQL comment tagging:

- **Core (`auditstream`):** `with audit.as_(actor):` / `async with audit.as_(actor):` scope manager, `audit.log()`, `audit.history()`, and `audit.query()`.
- **Django:** Request middleware that attaches `request.user` (or delegated AI agent actors) plus an automatic database execution wrapper (`connection.execute_wrapper`) so ORM writes carry the actor transparently.
- **Flask & FastAPI:** Request lifecycle hooks that bind the authenticated actor for every query executed inside the request or background task.

Track progress or share your target framework on [GitHub Discussions](https://github.com/auditstream/auditstream/discussions).

## Use today (`psycopg`)

Install migrations with the `auditstream` CLI first ([Getting Started](/docs/getting-started/)). From Python, attach actors directly via the wire format using only the standard library (`json` + `base64`).

### Trailing SQL comment

Encode the compact actor JSON as unpadded base64url and append `/*auditstream='<tag>'*/` at the end of the query. This works on auto-commit statements and stays pooler-safe behind PgBouncer, Neon, Supabase, and RDS Proxy:

```python
import base64
import json
import psycopg

def audit_comment(actor: dict) -> str:
    raw = json.dumps(actor, separators=(",", ":")).encode("utf-8")
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

Always pass `prepare=False` when appending per-actor SQL comments with `psycopg` so each distinct actor tag does not accumulate prepared statements.

### Transaction `set_config`

Inside an explicit transaction — or whenever you want named prepared statements — set `auditstream.actor` with `is_local = true` so PostgreSQL clears it automatically on commit or rollback:

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

Record non-database domain events (exports, approvals, logins) by calling `auditstream.log_event(action, target, data)` inside the same connection:

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

## Next steps

- Review actor fields, size limits, and validation rules in [Wire Format & Spec](/docs/contract/).
- See plain SQL examples for Go, Ruby, Java, and `psql` in [Plain SQL](/docs/plain-sql/).
- Configure PgBouncer, Neon, Supabase, and least-privilege roles in [Cloud, Poolers & Security](/docs/cloud-and-security/).
