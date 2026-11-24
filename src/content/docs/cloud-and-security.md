---
title: Cloud, Poolers & Security
description: Production guidance for PgBouncer, Neon, Supabase, RDS Proxy, Prisma Accelerate, least-privilege roles, non-TypeScript drivers, and supply-chain security verification.
section: Operate
order: 5
eyebrow: OPERATE · CLOUD & SECURITY
---

Auditstream runs inside standard PostgreSQL 15–19 with zero sidecar daemons and no logical replication slots. This guide covers managed clouds, connection poolers, tamper-resistance boundaries, non-TypeScript drivers, and supply-chain verification.

## Connection poolers

Always run migrations and `auditstream verify --fix` against a **direct (non-pooled)** migration connection string; run application traffic through your pooler as usual.

| Platform / Pooler | Recommended transport | Key operational details |
| :--- | :--- | :--- |
| **PgBouncer 1.26 (transaction mode)** | Trailing SQL comment | Verified across **2,407,659 transactions** at 8× oversubscription (**0 failed, 0 actor leaks**). Trailing comments sustain **1.8×–2.4× higher throughput** than `set_config` because auto-commit statements do not hold a backend slot across `BEGIN … COMMIT` ([Evidence & Benchmarks](/docs/evidence/)). |
| **Neon (PG 18.7)** | Trailing SQL comment | Non-superuser `CREATEROLE` migrations work automatically: on PG 16+, generated migrations detect missing `USAGE` on `auditstream_owner`, temporarily self-grant, create owned objects, and revoke. Both HTTP (`@auditstream/drizzle/neon-http`) and WebSocket (`@auditstream/drizzle/pg`, `@prisma/adapter-neon`) drivers are verified. |
| **Supabase & Supavisor (PG 17.12)** | Trailing SQL comment or JWT fallback | Transaction-mode Supavisor verified with Prisma 7 and Drizzle 0.45/1.x. When neither `set_config` nor a trailing comment is present, `resolve_actor()` inspects `request.jwt.claims` and records a valid non-empty `sub` as `{"type":"user","id":"<sub>"}` (`actor_source = 'jwt'`), attributing PostgREST and Supabase client requests automatically. |
| **AWS RDS Proxy** | Trailing SQL comment | Per AWS documentation, trailing SQL comments do not pin backend sessions, whereas calling `set_config(..., true)` pins the server session behind RDS Proxy. |
| **Prisma Accelerate** | `auditTransaction()` (`set_config`) | Prisma's SQL comments plugins do not receive SQL under Accelerate; use `auditTransaction()` from `@auditstream/prisma` ([TypeScript Adapters](/docs/adapters/)). |

> **Unsupported engines in v0.1:** **Aurora DSQL** does not support triggers, and **CockroachDB** triggers and `current_query()` behavior remain unverified.

## Tamper resistance

Auditstream separates table ownership from application runtime permissions so compromised application credentials cannot rewrite or erase history:

- **Dedicated `NOLOGIN` owner:** `auditstream_owner` owns the `auditstream` schema, `auditstream.changes`, all monthly partitions, and capture functions. Nobody logs in directly as `auditstream_owner`.
- **Hardened `SECURITY DEFINER` functions:** Trigger functions, `resolve_actor()`, and `log_event()` execute as `SECURITY DEFINER` owned by `auditstream_owner` with `SET search_path = pg_catalog, pg_temp` to block search-path hijacking.
- **SELECT-only application role:** Grant your runtime application role read-only history access and `log_event` execution — never INSERT, UPDATE, DELETE, or TRUNCATE on `auditstream.changes`:

```sql
GRANT USAGE ON SCHEMA auditstream TO app_user;
GRANT SELECT ON auditstream.changes TO app_user;
GRANT EXECUTE ON FUNCTION auditstream.log_event(text, jsonb, jsonb) TO app_user;
```

With these grants, normal writes to audited tables continue firing capture triggers, `auditstream history` and `auditstream export` both work, and any direct INSERT, UPDATE, DELETE, or TRUNCATE on `auditstream.changes` fails with PostgreSQL **`ERROR 42501`** (permission denied).

> **Honest security boundary:** Inside PostgreSQL, database superusers, roles holding `auditstream_owner`, or privileged sessions running `SET session_replication_role = replica` or `ALTER TABLE ... DISABLE TRIGGER` can bypass capture. Keep superuser and migration credentials strictly out of application runtimes, and schedule [`auditstream verify`](/docs/cli/#verify) in CI/cron to detect disabled, dropped, or modified triggers immediately.

## Plain SQL & other languages

Any language or SQL client (Go `pgx`/`database/sql`, Python `psycopg`, Ruby `pg`, Java JDBC, or `psql`) can attribute writes without an Auditstream adapter. Keep actor payloads to IDs only and strictly under **512 UTF-8 bytes** (see [Contract (Spec v0.1.1)](/docs/contract/)).

### Trailing SQL comment

Serialize the actor object as compact JSON, encode its UTF-8 bytes as unpadded base64url (`A-Za-z0-9_-`), and append `/*auditstream='<value>'*/` at the end of the SQL statement.

For `{"type":"user","id":"usr_42"}`, the unpadded base64url value is `eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0`:

```bash
psql "$AUDITSTREAM_DATABASE_URL" -c \
  "INSERT INTO public.invoice (id, status) VALUES (10, 'open') /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;"
```

Trailing comments are the recommended default: they work on auto-commit statements without an explicit transaction and do not pin sessions behind PgBouncer, Supavisor, or AWS RDS Proxy. **Never combine per-actor comments with named prepared statements** — each distinct comment string leaks a cached statement name; use `set_config` instead when named prepared statements are required.

### Transaction set_config

Inside an explicit transaction, call `set_config('auditstream.actor', '<json>', true)` before your writes. Always pass **`true`** (`is_local`) so the actor clears automatically on commit or rollback and never leaks across pooled connections:

```bash
psql "$AUDITSTREAM_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
BEGIN;
SELECT set_config('auditstream.actor', '{\"type\":\"user\",\"id\":\"usr_42\"}', true);
UPDATE public.invoice SET status = 'paid' WHERE id = 10;
COMMIT;
"
```

When both `set_config` and a trailing comment are present on the same statement, `set_config` takes precedence.

### Application events

Log non-database domain events (exports, logins, approvals) directly via `auditstream.log_event(action, target, data)` (`target` and `data` must be JSON objects or `NULL`):

```bash
psql "$AUDITSTREAM_DATABASE_URL" -c \
  "SELECT auditstream.log_event('invoice.exported', '{\"id\":10}'::jsonb, '{\"format\":\"pdf\"}'::jsonb) /*auditstream='eyJ0eXBlIjoidXNlciIsImlkIjoidXNyXzQyIn0'*/;"
```

## Supply-chain security

Every Auditstream release is checked continuously for static security defects, memory safety, and verifiable provenance across both repositories:

| Check | Result | Live link |
| :--- | :--- | :--- |
| **SonarCloud — Rust Engine (`auditstream`)** | 0 bugs · 0 vulnerabilities · 0 code smells (A / A / A), **83.7%** line coverage | [SonarCloud (Engine)](https://sonarcloud.io/project/overview?id=auditstream_auditstream) |
| **SonarCloud — TypeScript SDK (`auditstream-js`)** | 0 bugs · 0 vulnerabilities · 0 code smells (A / A / A), **89.3%** line coverage | [SonarCloud (JS SDK)](https://sonarcloud.io/project/overview?id=auditstream_auditstream-js) |
| **CodeQL (Rust & TypeScript)** | Passing on `main` across engine and adapter repositories | [Engine](https://github.com/auditstream/auditstream/security/code-scanning) · [JS SDK](https://github.com/auditstream/auditstream-js/security/code-scanning) |
| **Memory safety (`unsafe_code`)** | Workspace-wide `unsafe_code = "forbid"` enforced at compile time | [`Cargo.toml`](https://github.com/auditstream/auditstream/blob/main/Cargo.toml#L41-L42) |
| **OpenSSF Scorecard (`auditstream-js`)** | **7.2 / 10** automated supply-chain score | [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/auditstream/auditstream-js) |
| **Provenance & containers** | GitHub SLSA Build Attestations on CLI releases, multi-arch (`linux/amd64`, `linux/arm64`) `gcr.io/distroless/static-debian12:nonroot` container pinned by SHA-256 digest (`USER nonroot:nonroot`), and npm Sigstore provenance | [GitHub Attestations](https://github.com/auditstream/auditstream/attestations) |

**Vulnerability disclosure:** Report security issues privately following [SECURITY.md](https://github.com/auditstream/auditstream/security/policy) (`security@auditstream.dev`, 3-business-day acknowledgment target; do not open public GitHub issues for security bugs).

## Next steps

- Review CI drift gating and exit codes in [CLI & Day-2 Operations](/docs/cli/).
- Inspect trigger internals and the Rust hexagonal workspace in [Capture & Engine Architecture](/docs/capture/).
- Read the exact wire format and validation rules in [Contract (Spec v0.1.1)](/docs/contract/).
- Inspect live PgBouncer and PostgreSQL 19 benchmark numbers in [Evidence & Benchmarks](/docs/evidence/).
