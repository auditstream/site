---
title: Wire Format & Spec
description: Actor JSON schema, unpadded base64url SQL comment transport, strict validation rules, and language-neutral conformance fixtures.
section: Reference
order: 9
eyebrow: REFERENCE · WIRE FORMAT
---

Auditstream separates database capture from application SDKs through a small, language-neutral wire format. Any language, ORM, or SQL client that emits this actor payload works seamlessly with the PostgreSQL triggers and CLI.

## Actor & context schema

```json
{
  "type": "ai_agent",
  "id": "billing-agent",
  "onBehalfOf": { "type": "user", "id": "usr_42" },
  "tenant": "org_acme"
}
```

- **`type`** MUST be one of `user`, `api_key`, `ai_agent`, `service`, or `system`.
- **`id`** MUST be a non-empty string.
- **`onBehalfOf`** MAY hold one nested actor object, strictly one level deep (for delegated actions such as an AI agent acting for a user).
- **`tenant`** MAY be present as a non-empty string.
- **IDs only by default.** Names, emails, and IP addresses SHOULD NOT be sent because SQL comments appear in `pg_stat_activity`, server logs, and `pg_stat_statements`. `context` MAY carry `requestId` and `source`; `ip` and `userAgent` are opt-in non-empty strings.
- **512-byte cap.** Serialized actor plus context JSON MUST NOT exceed 512 UTF-8 bytes (≤ 683 base64url characters).

## SQL transport format

```sql
-- Per statement: trailing sqlcommenter tag (default)
UPDATE invoice SET status = $1 WHERE id = $2
  /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/

-- Per transaction: set_config fallback
SELECT set_config('auditstream.actor', '{"type":"user","id":"usr_42"}', true);
```

### Transport guarantees

- **Injection-proof encoding:** The comment value MUST be unpadded base64url. Because base64url uses only `A-Za-z0-9_-`, it can never contain `*/` or break out of the SQL comment.
- **Trailing position:** The comment MUST be the last comment in the statement and MAY share a comment with other `sqlcommenter` keys such as `traceparent`.
- **No named prepared statements with per-actor comments:** Each distinct comment string produces a new prepared statement that drivers like `node-postgres` or `psycopg` cache indefinitely, so disable prepared statement naming when tagging queries (or use `set_config`).
- **Spoofing resistance:** Comment-like text inside SQL string literals is ignored because extraction scans only the trailing SQL comment after trimming whitespace and semicolons.

## Validation rules

Both database trigger readers (`resolve_actor()`), JSON export schemas (`event.schema.json`), and language SDKs enforce identical strict schema validation:

- **Actor & context checks:** `actor.type` and `onBehalfOf.type` must be one of the 5 enum values; `tenant` and `id` must be non-empty strings; `onBehalfOf` is limited to depth 1; and `context` must be an object whose known fields (`requestId`, `source`, `ip`, `userAgent`) are non-empty strings.
- **Application events (`auditstream.log_event()`):** `target` and `data` must be JSON objects or `NULL` (otherwise rejected with `SQLSTATE 22023`), and reserved DML action checks apply after trimming and uppercasing `action`.
- **JWT fallback (`request.jwt.claims`):** Non-object JSON or a non-null invalid `sub` yields `actor_source = 'invalid'`, while a valid JSON object without `sub` (or with `sub: null`) yields `NULL`.
- **Table constraints:** `auditstream.changes` enforces CHECK constraints on `source`, `actor_source`, and `schema_version`. Malformed actor payloads never abort application writes — changes still commit with `actor = NULL` and `actor_source = 'invalid'`.

## Specification & conformance

The normative wire specification lives in [`spec/`](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec) (current version: **`v0.1.1`**, independently SemVer-versioned so engine and language SDKs evolve safely) alongside shared JSON conformance fixtures.

- [Normative Specification (`spec-v0.1.1`)](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec) — `actor.md`, `transport.md`, `history-table.md`, `export.md`, JSON schemas, and test fixtures.
- [Implementation Compliance Matrix (`spec/compliance.md`)](https://github.com/auditstream/auditstream/blob/main/spec/compliance.md) — per-SDK support and verified conformance coverage.
- [TypeScript](/docs/adapters/), [Python](/docs/python/), and [Plain SQL](/docs/plain-sql/) — language guides implementing this wire format.
- [CLI & Day-2 Operations](/docs/cli/) — `auditstream history` and `auditstream export` JSONL/CSV output.
