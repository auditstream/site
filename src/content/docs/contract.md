---
title: Contract (Spec v0.1.1)
description: Normative Spec v0.1.1 actor schema, Option A validation rules, unpadded base64url sqlcommenter transport, and language-neutral conformance fixtures.
section: Reference & Proof
order: 7
eyebrow: REFERENCE · SPEC V0.1.1
---

The engine repository owns the normative [`spec/`](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec) directory, versioned independently with SemVer. Every implementation declares which spec version it targets in [`spec/compliance.md`](https://github.com/auditstream/auditstream/blob/main/spec/compliance.md) and verifies compliance against shared JSON conformance fixtures.

## Spec v0.1.1 changes

[`spec-v0.1.1`](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec) aligned database trigger readers, JSON schemas, and adapters under strict **Option A** contract validation without breaking valid 0.1.0 payloads:

- **Option A validation in `resolve_actor()` and `event.schema.json`:** `actor.type` and `onBehalfOf.type` MUST be one of the 5 enum values (`user`, `api_key`, `ai_agent`, `service`, `system`); `tenant` MUST be a non-empty string; `onBehalfOf` MUST be an object at max depth 1; and `context` MUST be an object whose known fields (`requestId`, `source`, `ip`, `userAgent`) are non-empty strings.
- **Hardened `auditstream.log_event()` object checks:** `target` and `data` MUST be JSON objects or `NULL` (rejected with `SQLSTATE 22023` otherwise), and reserved DML action checks apply to `upper(btrim(action))`.
- **Clarified `request.jwt.claims` `sub` handling:** Non-object JSON or a non-null invalid `sub` yields `actor_source = 'invalid'`, while a valid JSON object without `sub` (or with `sub: null`) yields `NULL`.
- **Updated Reference DDL & conformance fixtures:** Added `IS DISTINCT FROM` comparisons, pure-string comment extraction, table CHECK constraints (`source`, `actor_source`, `schema_version`), and expanded cases in `spec/conformance/transport/decode.json` and `precedence.json`.

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
UPDATE invoice SET status = $1 WHERE id = $2 /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/

-- Per transaction: set_config fallback
SELECT set_config('auditstream.actor', '{"type":"user","id":"usr_42"}', true);
```

### Transport guarantees

- **Injection-proof encoding:** The comment value MUST be unpadded base64url. Because base64url uses only `A-Za-z0-9_-`, it can never contain `*/` or break out of the SQL comment.
- **Trailing position:** The comment MUST be the last comment in the statement and MAY share a comment with other `sqlcommenter` keys such as `traceparent`.
- **No named prepared statements with per-actor comments:** Each distinct comment string produces a new prepared statement that `node-postgres` never evicts, so driver wrappers strip statement names when appending a tag.
- **Spoofing resistance:** Comment-like text inside SQL string literals is ignored because extraction scans only the trailing SQL comment after trimming whitespace and semicolons.

## Normative references

- [Auditstream Specification (spec-v0.1.1)](https://github.com/auditstream/auditstream/tree/spec-v0.1.1/spec) — normative `actor.md`, `transport.md`, `history-table.md`, `export.md`, JSON schemas, and conformance fixtures.
- [Implementation Compliance Matrix (`spec/compliance.md`)](https://github.com/auditstream/auditstream/blob/main/spec/compliance.md) — per-component support and verified conformance coverage.
- [TypeScript Adapters](/docs/adapters/) — `@auditstream/node`, `@auditstream/prisma`, and `@auditstream/drizzle` implementations.
- [CLI & Day-2 Operations](/docs/cli/) — `auditstream history`, `auditstream export`, and `event.schema.json` output.
- [Cloud, Poolers & Security](/docs/cloud-and-security/) — attaching spec-compliant actors from Go, Python, Ruby, Java, or `psql`.
