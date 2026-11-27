---
title: Cloud, Poolers & Security
description: Production guidance for PgBouncer, Neon, Supabase, RDS Proxy, Prisma Accelerate, least-privilege roles, and supply-chain security verification.
section: Operate
order: 7
eyebrow: OPERATE · CLOUD & SECURITY
---

Run Auditstream on PostgreSQL 15–19 with zero sidecars or replication slots across managed clouds, poolers, and least-privilege roles.

## Connection poolers

Run migrations and `auditstream verify --fix` on a **direct (non-pooled)** connection; keep application traffic on your pooler.

| Platform | Transport | Operational notes |
| :--- | :--- | :--- |
| **PgBouncer 1.26** (transaction) | Trailing SQL comment | Verified across **2,407,659 tx** at 8× oversubscription (**0 failed, 0 leaks**); **1.8×–2.4× faster** than `set_config` ([Benchmarks](/docs/evidence/)). |
| **Neon** (PostgreSQL&nbsp;18.7) | Trailing SQL comment | Non-superuser `CREATEROLE` migrations handle `auditstream_owner` automatically on PostgreSQL 16+; HTTP and WebSocket drivers verified. |
| **Supabase** (PostgreSQL&nbsp;17.12) | Comment or JWT fallback | Supavisor verified with Prisma 7 and Drizzle 0.45/1.x. Without comment/`set_config`, falls back to `request.jwt.claims` `sub` (`actor_source = 'jwt'`). |
| **AWS RDS Proxy** | Trailing SQL comment | Per AWS docs, trailing comments never pin backend sessions; `set_config(..., true)` pins the server session. |
| **Prisma Accelerate** | `auditTransaction()` (`set_config`) | SQL comment plugins are bypassed under Accelerate; use `auditTransaction()` from `@auditstream/prisma` ([Prisma](/docs/typescript/prisma/)). |

> **Engines not supported in v0.1:** **MySQL** is under evaluation (not supported yet); **Aurora DSQL** lacks triggers; **CockroachDB** triggers and `current_query()` behavior remain unverified.

## Tamper resistance

Separating table ownership from runtime roles prevents compromised application credentials from altering history:

- **Dedicated `NOLOGIN` owner:** `auditstream_owner` owns the schema, `auditstream.changes`, partitions, and capture functions; nobody logs in as it.
- **Hardened `SECURITY DEFINER`:** Triggers, `resolve_actor()`, and `log_event()` run as `auditstream_owner` with `SET search_path = pg_catalog, pg_temp`.
- **SELECT-only app role:** Grant history reads and `log_event` execution — never INSERT, UPDATE, DELETE, or TRUNCATE on `auditstream.changes`:

```sql
GRANT USAGE ON SCHEMA auditstream TO app_user;
GRANT SELECT ON auditstream.changes TO app_user;
GRANT EXECUTE ON FUNCTION auditstream.log_event(text, jsonb, jsonb)
  TO app_user;
```

Capture triggers still fire on audited writes, `history` and `export` work, and direct writes to `auditstream.changes` fail with **`ERROR 42501`** (permission denied).

> **Honest security boundary:** Superusers, roles holding `auditstream_owner`, or privileged sessions running `session_replication_role = replica` or `DISABLE TRIGGER` can bypass capture. Keep migration and superuser credentials out of app runtimes and run [`auditstream verify`](/docs/cli/#verify) in CI/cron to catch drift immediately.

### Why external chained manifests instead of in-DB row hashes

Auditstream intentionally does **not** build per-row hot-path hash chains or in-database seals ([ADR-0009](https://github.com/auditstream/auditstream/blob/main/docs/decisions/0009-no-ui-package-or-in-db-partition-sealing.md)):

- **Same trust domain:** Any superuser or `auditstream_owner` administrator who can alter `auditstream.changes` can also recompute every downstream in-DB hash or seal in one transaction, leaving `0` broken links — cryptographic tamper-evidence only starts once a digest crosses an independent trust boundary.
- **Hot-path contention and deadlocks:** Serializing a single chain head under PostgreSQL MVCC collapsed audited write throughput by **61×–152×** and triggered `40P01` deadlocks on deadlock-free SQL in live PostgreSQL 17.12 and 19.0 benchmarks.
- **Breaks retention and privacy workflows:** Row hash chains spanning stored partitions break on routine monthly `DROP TABLE changes_YYYY_MM` retention drops and conflict with LGPD/GDPR data minimization.

Instead, native cryptographic tamper-evidence is planned out-of-band in **v0.3** via immutable WORM storage (such as S3 Object Lock Compliance Mode) paired with CloudTrail-style **chained signed manifests** (`prev_manifest_sha256`, monotonic `chain_seq`, contiguous `(xact_id, id)` bounds, and external Ed25519/ES256 or KMS signatures) and offline verification ([`auditstream#112`](https://github.com/auditstream/auditstream/issues/112) · [Roadmap](/docs/roadmap/#v03-immutable-archiving-and-verification)). Today, you can ship incremental `auditstream export` batches to your own WORM bucket on a short cadence (`10–60 s`) and export `pgAudit` (`ddl, role, misc_set`) off-host to bound the export-lag window (`Δt_export`) and privileged bypass visibility.

## Supply-chain security

Every release runs static analysis, memory-safety enforcement, and provenance checks across both repositories:

| Check | Result | Verification |
| :--- | :--- | :--- |
| **SonarCloud (Engine)** | 0 bugs · 0 vulnerabilities · 0 smells (A/A/A), **83.7%** line coverage | [Engine report](https://sonarcloud.io/project/overview?id=auditstream_auditstream) |
| **SonarCloud (JS SDK)** | 0 bugs · 0 vulnerabilities · 0 smells (A/A/A), **89.3%** line coverage | [JS SDK report](https://sonarcloud.io/project/overview?id=auditstream_auditstream-js) |
| **CodeQL (Rust & TS)** | Passing on `main` across engine and adapter repositories | [Engine](https://github.com/auditstream/auditstream/security/code-scanning) · [JS&nbsp;SDK](https://github.com/auditstream/auditstream-js/security/code-scanning) |
| **Memory safety** | Workspace-wide `unsafe_code = "forbid"` enforced at compile time | [`Cargo.toml`](https://github.com/auditstream/auditstream/blob/main/Cargo.toml#L41-L42) |
| **OpenSSF Scorecard** | **7.2 / 10** automated supply-chain score (`auditstream-js`) | [Scorecard](https://scorecard.dev/viewer/?uri=github.com/auditstream/auditstream-js) |
| **Provenance & Docker** | SLSA Build Attestations, multi-arch (`amd64`/`arm64`) `distroless/static-debian12:nonroot` pinned by SHA-256 (`USER nonroot:nonroot`), npm Sigstore provenance | [Attestations](https://github.com/auditstream/auditstream/attestations) |

> **Vulnerability disclosure:** Report security issues privately via [SECURITY.md](https://github.com/auditstream/auditstream/security/policy) (`security@auditstream.dev`, 3-business-day acknowledgment target).
