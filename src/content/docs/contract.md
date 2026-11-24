---
title: Contract (spec v0.1)
description: Normative actor schema, unpadded base64url sqlcommenter transport, size limits, and language-neutral conformance fixtures.
section: Contract
order: 4
eyebrow: CONTRACT · SPEC V0.1
---

The engine repository owns the normative `spec/` directory, versioned independently with SemVer starting at `0.1.0`. Every adapter declares which spec version it implements and verifies compliance against shared JSON conformance fixtures.

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
- **`id`** MUST be present.
- **`onBehalfOf`** MAY hold one nested actor, one level deep (for delegated actions such as an AI agent acting for a user).
- **`tenant`** MAY be present.
- **IDs only by default.** Names, emails, and IP addresses SHOULD NOT be sent because SQL comments appear in `pg_stat_activity`, server logs, and `pg_stat_statements`. `context` MAY carry `requestId` and `source`; IP and user agent are opt-in.
- **512-byte cap.** Serialized actor plus context JSON MUST NOT exceed 512 bytes.

## SQL transport format

```sql
-- Per statement: trailing sqlcommenter tag (default)
UPDATE invoice SET status = $1 WHERE id = $2 /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/

-- Per transaction: set_config fallback
SELECT set_config('auditstream.actor', '{"type":"user","id":"usr_42"}', true);
```

### Transport guarantees

- **Injection-proof encoding:** The comment value MUST be unpadded base64url. Because base64url contains only `A-Z`, `a-z`, `0-9`, `-`, and `_`, it can never contain `*/` or break out of the SQL comment.
- **Trailing position:** The comment MUST be the last comment in the statement and MAY share a comment with other `sqlcommenter` keys such as `traceparent`.
- **No named prepared statements with per-actor comments:** Each distinct comment string produces a new prepared statement that `node-postgres` never evicts, so driver wrappers strip statement names when appending a tag.
- **Spoofing resistance:** Comment-like text inside SQL string literals was tested twice and ignored in both cases.
