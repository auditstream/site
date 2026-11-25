---
title: Cloud, Poolers & Security
description: Production guidance for PgBouncer, Neon, Supabase, RDS Proxy, Prisma Accelerate, least-privilege roles, and supply-chain security verification.
section: Operate
order: 7
eyebrow: OPERATE · CLOUD & SECURITY
---

Auditstream runs inside standard PostgreSQL 15–19 with zero sidecar daemons and no logical replication slots. This guide covers managed clouds, connection poolers, least-privilege tamper resistance, and supply-chain verification.

## Connection poolers

Always run migrations and `auditstream verify --fix` against a **direct (non-pooled)** migration connection string; run application traffic through your pooler as usual.

| Platform | Transport | Operational notes |
| :--- | :--- | :--- |
| **PgBouncer 1.26** (transaction) | Trailing SQL comment | Verified across **2,407,659 tx** at 8× oversubscription (**0 failed, 0 leaks**). Sustains **1.8×–2.4× higher throughput** than `set_config` since auto-commit skips `BEGIN … COMMIT` ([Benchmarks](/docs/evidence/)). |
| **Neon** (PG&nbsp;18.7) | Trailing SQL comment | Non-superuser `CREATEROLE` migrations self-grant/revoke `auditstream_owner` automatically on PG 16+. Both HTTP (`@auditstream/drizzle/neon-http`) and WebSocket (`@auditstream/drizzle/pg`, `@prisma/adapter-neon`) drivers verified. |
| **Supabase** (PG&nbsp;17.12) | Comment or JWT fallback | Transaction-mode Supavisor verified with Prisma 7 and Drizzle 0.45/1.x. Without `set_config` or comment, `resolve_actor()` reads `request.jwt.claims` `sub` as `{"type":"user","id":"<sub>"}` (`actor_source = 'jwt'`) for PostgREST/Supabase clients. |
| **AWS RDS Proxy** | Trailing SQL comment | Per AWS docs, trailing SQL comments do not pin backend sessions, whereas `set_config(..., true)` pins the server session behind RDS Proxy. |
| **Prisma Accelerate** | `auditTransaction()` (`set_config`) | Prisma's SQL comments plugins do not receive SQL under Accelerate; use `auditTransaction()` from `@auditstream/prisma` ([TypeScript](/docs/adapters/)). |

> **Unsupported engines in v0.1:** **Aurora DSQL** does not support triggers, and **CockroachDB** triggers and `current_query()` behavior remain unverified.

## Tamper resistance

Auditstream separates table ownership from application runtime permissions so compromised application credentials cannot rewrite or erase history:

- **Dedicated `NOLOGIN` owner:** `auditstream_owner` owns the `auditstream` schema, `auditstream.changes`, all monthly partitions, and capture functions. Nobody logs in directly as `auditstream_owner`.
- **Hardened `SECURITY DEFINER` functions:** Trigger functions, `resolve_actor()`, and `log_event()` execute as `SECURITY DEFINER` owned by `auditstream_owner` with `SET search_path = pg_catalog, pg_temp` to block search-path hijacking.
- **SELECT-only application role:** Grant your runtime application role read-only history access and `log_event` execution — never INSERT, UPDATE, DELETE, or TRUNCATE on `auditstream.changes`:

```sql
GRANT USAGE ON SCHEMA auditstream TO app_user;
GRANT SELECT ON auditstream.changes TO app_user;
GRANT EXECUTE ON FUNCTION auditstream.log_event(text, jsonb, jsonb)
  TO app_user;
```

With these grants, normal writes to audited tables continue firing capture triggers, `auditstream history` and `auditstream export` both work, and any direct INSERT, UPDATE, DELETE, or TRUNCATE on `auditstream.changes` fails with PostgreSQL **`ERROR 42501`** (permission denied).

> **Honest security boundary:** Inside PostgreSQL, database superusers, roles holding `auditstream_owner`, or privileged sessions running `SET session_replication_role = replica` or `ALTER TABLE ... DISABLE TRIGGER` can bypass capture. Keep superuser and migration credentials strictly out of application runtimes, and schedule [`auditstream verify`](/docs/cli/#verify) in CI/cron to detect disabled, dropped, or modified triggers immediately.

## Supply-chain security

Every Auditstream release is checked continuously for static security defects, memory safety, and verifiable provenance across both repositories:

| Check | Result | Verification |
| :--- | :--- | :--- |
| **SonarCloud (Engine)** | 0 bugs · 0 vulnerabilities · 0 smells (A/A/A), **83.7%** line coverage | [Engine report](https://sonarcloud.io/project/overview?id=auditstream_auditstream) |
| **SonarCloud (JS SDK)** | 0 bugs · 0 vulnerabilities · 0 smells (A/A/A), **89.3%** line coverage | [JS SDK report](https://sonarcloud.io/project/overview?id=auditstream_auditstream-js) |
| **CodeQL (Rust & TS)** | Passing on `main` across engine and adapter repositories | [Engine](https://github.com/auditstream/auditstream/security/code-scanning) · [JS&nbsp;SDK](https://github.com/auditstream/auditstream-js/security/code-scanning) |
| **Memory safety** | Workspace-wide `unsafe_code = "forbid"` enforced at compile time | [`Cargo.toml`](https://github.com/auditstream/auditstream/blob/main/Cargo.toml#L41-L42) |
| **OpenSSF Scorecard** | **7.2 / 10** automated supply-chain score (`auditstream-js`) | [Scorecard](https://scorecard.dev/viewer/?uri=github.com/auditstream/auditstream-js) |
| **Provenance & Docker** | GitHub SLSA Build Attestations on CLI releases, multi-arch (`linux/amd64`, `linux/arm64`) gcr.io `distroless/static-debian12:nonroot` container pinned by SHA-256 digest (`USER nonroot:nonroot`), and npm Sigstore provenance | [Attestations](https://github.com/auditstream/auditstream/attestations) |

**Vulnerability disclosure:** Report security issues privately following [SECURITY.md](https://github.com/auditstream/auditstream/security/policy) (`security@auditstream.dev`, 3-business-day acknowledgment target; do not open public GitHub issues for security bugs).

## Next steps

- Attribute writes without an SDK from Go, Python, Ruby, Java, or `psql` in [Plain SQL](/docs/plain-sql/) or [Python](/docs/python/).
- Review CI drift gating and exit codes in [CLI & Day-2 Operations](/docs/cli/).
- Understand trigger mechanics and `xid8` cursors in [How Capture Works](/docs/capture/).
- Inspect live PgBouncer and PostgreSQL 19 benchmark numbers in [Benchmarks & Limits](/docs/evidence/).
