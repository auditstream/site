---
title: Wire Format & Spec
description: Actor JSON schema, unpadded base64url SQL comment transport, strict validation rules, and language-neutral conformance fixtures.
section: Reference
order: 9
eyebrow: REFERENCE · WIRE FORMAT
---

Any language, ORM, or SQL client that emits this wire format works natively with Auditstream's PostgreSQL triggers and CLI.

## Actor & context schema

```json
{
  "type": "ai_agent",
  "id": "billing-agent",
  "onBehalfOf": { "type": "user", "id": "usr_42" },
  "tenant": "org_acme"
}
```

- **`type`** MUST be `user`, `api_key`, `ai_agent`, `service`, or `system`.
- **`id`** MUST be a non-empty string.
- **`onBehalfOf`** MAY hold one nested actor object, strictly one level deep (for delegated actions).
- **`tenant`** MAY be a non-empty string.
- **IDs only by default.** Avoid names, emails, or IPs since comments appear in PostgreSQL logs; `context` supports `requestId`, `source`, and opt-in `ip`/`userAgent`.
- **512-byte cap.** Serialized actor plus context JSON MUST NOT exceed **512 UTF-8 bytes** (≤ 683 base64url chars).

## SQL transport format

```sql
-- Per statement: trailing sqlcommenter tag (default)
UPDATE invoice SET status = $1 WHERE id = $2
  /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/

-- Per transaction: set_config fallback
SELECT set_config(
  'auditstream.actor',
  '{"type":"user","id":"usr_42"}',
  true
);
```

### Transport guarantees

- **Injection-proof encoding:** Unpadded base64url (`A-Za-z0-9_-`) can never contain `*/` or break out of a SQL comment.
- **Trailing position:** Must be the final comment in the statement; may share a comment with other `sqlcommenter` keys (such as `traceparent`).
- **No named prepared statements:** Per-actor comments create unbounded cached statements in `pg` or `psycopg`; disable statement naming or use `set_config`.
- **Spoofing resistance:** Extraction trims trailing whitespace/semicolons and reads only the final comment, ignoring comment-like text inside string literals.

## Validation rules

Triggers (`resolve_actor()`), exports (`event.schema.json`), and SDKs enforce identical strict validation:

- **Actor & context:** `type` and `onBehalfOf.type` must match the 5-value enum; `id`, `tenant`, and known `context` fields (`requestId`, `source`, `ip`, `userAgent`) must be non-empty strings; `onBehalfOf` depth ≤ 1.
- **Application events:** `auditstream.log_event()` requires `target` and `data` to be JSON objects or `NULL` (else `SQLSTATE 22023`) and rejects reserved DML names after trim/uppercase.
- **JWT fallback:** Invalid `request.jwt.claims` JSON or invalid non-null `sub` yields `actor_source = 'invalid'`; valid objects without `sub` (or `sub: null`) yield `NULL`.
- **Fail-open capture:** Table `CHECK` constraints enforce `source`, `actor_source`, and `schema_version`; malformed actors never abort writes (`actor = NULL`, `actor_source = 'invalid'`).

## Spec & conformance

The normative specification (`v0.1.1`, independently SemVer-versioned) and shared conformance fixtures live in [`spec/`](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec):

- [Normative Specification (`spec-v0.1.1`)](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec) — `actor.md`, `transport.md`, `history-table.md`, `export.md`, JSON schemas, and fixtures.
- [Implementation Compliance Matrix (`spec/compliance.md`)](https://github.com/auditstream/auditstream/blob/main/spec/compliance.md) — per-SDK support and verified conformance coverage.
