---
title: Roadmap
description: Direction, capability milestones toward v1.0, demand-gated work, and explicit non-goals for Auditstream.
section: Reference
order: 12
eyebrow: REFERENCE · ROADMAP
---

<div class="docs-callout-info">
  <strong>Direction here, live status on GitHub:</strong> This page tracks Auditstream's capability milestones and scope boundaries rather than individual patch tickets. For current versions, changelogs, and active work, see <a href="https://github.com/auditstream/auditstream/releases" target="_blank" rel="noopener noreferrer">Engine releases</a>, <a href="https://github.com/auditstream/auditstream-js/releases" target="_blank" rel="noopener noreferrer">TypeScript SDK releases</a>, and <a href="https://github.com/auditstream/auditstream/issues" target="_blank" rel="noopener noreferrer">open issues</a>. Milestones are sequenced by priority rather than fixed calendar dates.
</div>

## Overview

Auditstream ships in small, serial milestones — stabilizing PostgreSQL capture and verification first, adding retention and AI-agent forensics next, then expanding into immutable object-storage archiving, Python, and SIEM export.

| Milestone | Focus | Key capabilities |
| :--- | :--- | :--- |
| **`v0.1.x`** | Hardening &amp; DX | Engine and security hardening, terminal `history --diff`, decoupled JS driver wrappers, reusable CI action |
| **`v0.2`** | Retention &amp; AI-native | Commit-safe `auditstream prune`, `drain-default`, `pg_cron` guide, and `spec v0.2` agentic attribution (`traceId`/`spanId`, `audit.delegate()`) |
| **`v0.3`** | Immutable archiving | Extended redaction, `.jsonl.zst` compression, S3 Object Lock (`COMPLIANCE`) &amp; Cloudflare R2 sinks, signed manifests, offline `verify-export` |
| **`v0.4`** | Python &amp; SIEM | Native Python SDK (`auditstream-python`) with Alembic/Django migrations, OCSF mapping, and hardened HTTP/SIEM export |
| **`v0.5 → v1.0`** | Production maturity | Zero-downtime schema upgrades, chaos testing, Helm/K8s manifests, OpenSSF Best Practices, and `spec v1.0` freeze |

## Milestones

### v0.1.x: Hardening and developer experience

- **Engine and security hardening:** Stricter `auditstream verify` coverage (including `log_event()`, object ownership/ACLs across child partitions, rules/triggers/RLS, and excluded-column drift), function-hash tracking with smooth `0.1.x` migration refreshes, `lock_timeout` guards, safe trigger handling for non-equality column types (`json`, `xml`, `point`, PostGIS, `citext`), failover/PITR cursor validation with boundary anchors, JSON operational telemetry, and strict actor/context validation with restrictive file and credential handling.
- **First-10-minute DX:** Field-by-field terminal diffs (`auditstream history --diff`), configured `history` redaction (`--redact`, `--unredacted`, `--omit-payload`), complete terminal control-character sanitization, improved `init` ergonomics, and decoupled PostgreSQL driver wrappers (`wrapPgPool`, `wrapPostgresJs`, `wrapNeonHttp`) free of mandatory ORM peer dependencies.
- **CI packaging and local onboarding:** Reusable GitHub Action for `auditstream verify` in CI and single-command `docker-compose` examples. **Prisma 8** is tracked upstream and will be supported once its stable release exposes a SQL comments API.

### v0.2: Partition retention and agentic attribution

- **Commit-safe partition pruning (`auditstream prune`):** Drops expired monthly partitions without losing concurrent or unexported writes — pre-validating unfiltered export cursors, detaching and verifying the partition's maximum `(xact_id, id)` inside a single short `lock_timeout` transaction (rolling back cleanly if unexported rows remain), and dropping the table outside parent locks. Ships alongside standalone `drain-default` recovery and an in-database `pg_cron` partition-maintenance guide.
- **Agentic attribution (`spec v0.2`, [`auditstream-js#88`](https://github.com/auditstream/auditstream-js/issues/88)):** Adds first-class `traceId` (supporting both 32-char hex OTel/Langfuse and 36-char UUID LangSmith IDs) and `spanId` within the 512-byte budget, introduces `audit.delegate()` to preserve the root human principal across multi-agent handoffs with cross-tenant guards, adds `traceId` / `actorType` / `xactId` filters to `audit.query()` and `history`, and ships a runnable Vercel AI SDK example.

### v0.3: Immutable archiving and verification

Tracked under [`auditstream#112`](https://github.com/auditstream/auditstream/issues/112) and delivered in two layers:

- **Extended redaction and object-storage sinks:** Extends configured redaction (`export` and `history`) to nested JSONB paths plus `record_id`, `actor`, and `context` (`ip`/`userAgent`), defaulting to allowlist + dry-run safeguards for WORM `COMPLIANCE` buckets. Adds compressed `.jsonl.zst` sinks for S3-compatible storage (with SigV4, EKS IRSA / Pod Identity / IMDSv2 auth, content-addressed segment keys, and linearizable `If-None-Match` manifest commits), distinguishing **S3 Object Lock (`COMPLIANCE`)** (AWS S3, MinIO, Wasabi, Backblaze B2) from **Cloudflare R2 Bucket Locks**.
- **Signed manifests, offline verification, and fuzzing:** Publishes normative `spec/manifest.md` and `spec/threat-model.md` covering contiguous `(xact_id, id)` cursor-tuple ranges and timeline continuity; adds an external signer hook (`--sign-cmd` via CLI/env for KMS, Vault, or HSM with `ES256`/`Ed25519` agility); ships offline `verify-export` with multi-key rotation/revocation trust bundles; and pairs in-process `cargo-fuzz` targets with differential Rust/TypeScript/PostgreSQL parser checks in CI.

### v0.4: Python SDK and SIEM export

- **Native Python SDK (`auditstream-python`):** Single PyPI package (`auditstream`) with optional framework extras (`sqlalchemy`, `fastapi`, `django`) built on `contextvars` and `audit.delegate()`. Uses trailing SQL comments as the default pooler-safe transport (`psycopg` 3 and `asyncpg`), with an optional write-only lazy `set_config` / `SET LOCAL` mode, AI framework helpers (LangGraph / PydanticAI), and `--migrations alembic` / `django` support in the CLI.
- **OCSF mapping and SIEM / webhook sink:** Pure `Event -> OCSF` mapping in `auditstream-core` paired with a hardened HTTP/HTTPS sink (native API-key auth for Datadog, Splunk HEC, and Elastic; signed HMAC webhooks for custom targets), dial-time anti-SSRF DNS pinning, private VPC CIDR allowlisting, post-redaction DLQ handling, and explicit remote checkpointing for stateless fan-out.

### v0.5 to v1.0: Upgrades, resilience, and contract freeze

- **Zero-downtime upgrades and operational chaos:** Full schema evolution migrations (`v0.x -> v1.0`) with per-table trigger updates and an opt-in DDL event trigger for privileged environments (`DISABLE/DROP TRIGGER` and partition renames). Adds CI chaos suites covering `pg_dump`/`pg_restore`, Blue/Green upgrades, asynchronous failover, hot-standby conflicts (`SQLSTATE 40001`), and stalled `xmin`, plus Helm/Kubernetes CronJob manifests and OpenSSF Best Practices registration (`CII-Best-Practices`).
- **`spec v1.0` and CLI `v1.0.0`:** Frozen only after the manifest, threat-model, agentic-attribution, and redaction contracts have held through real external production use. Evaluates optional `changes_default` (enabling `DETACH PARTITION CONCURRENTLY`) and raises the minimum baseline to PostgreSQL 16+ ahead of PostgreSQL 15 EOL (November 2027).

## Out of scope and demand-gated

Items below are deliberately excluded from committed milestones. **Non-goals** conflict with Auditstream's security or operational model; **demand-gated** items wait for concrete production demand or a dedicated maintainer.

| Item | Status | Why | Today &amp; RFC trigger |
| :--- | :--- | :--- | :--- |
| **Read-only MCP server** | **Non-goal** | Exposes raw `before`/`after` records to prompt-injection exfiltration (OWASP MCP Top 10), risks OLTP full scans (`HASH(record_id)` is the only lookup index), and duplicates `history --format json`. | **Today:** `history --format json` (with automatic `[[export.redaction.rules]]`, fail-closed `--redact`, and `--omit-payload` in `v0.1.1+`), or AI triage over redacted S3/DuckDB archives. Future MCP work would focus on *write-side attribution middleware*. |
| **`@auditstream/react` &amp; in-DB hash-chaining** | **Non-goal** | Browser UI packages push raw audit metadata toward clients; in-DB hash chains share the superuser trust domain, serialize hot-path writes, and break `DROP TABLE` retention (`ADR-0009`). | **Replaced by:** `audit.query()` + BFF pattern and external S3 Object Lock / R2 signed archives (`#112`). |
| **Go SDK (`pgx` / `database/sql`)** | **Demand-gated** | Smaller share of target adopters than TS/Python and adds a new repository to maintain; `pgx` v5 `QueryTracer` is read-only and needs explicit statement-cache handling. | **Today:** [Plain SQL guide](/docs/plain-sql/). **Trigger:** Production demand from multiple teams after `spec v0.2`, or a dedicated Go maintainer. |
| **`auditstream-core` on crates.io** | **Demand-gated** | Locks internal Rust structs and traits into SemVer guarantees before external Rust embedding demand exists. | **Trigger:** Post-`spec v1.0` with concrete external embedding use cases. |
| **MySQL / MariaDB engine** | **Demand-gated** | Lacks statement triggers, dynamic `NEW`/`OLD` JSON conversion, full `current_query()`, and `xid8` cursors; MySQL 8.0/8.4 LTS and MariaDB InnoDB also skip triggers on cascaded foreign keys. | **Trigger:** Sustained production demand plus a binlog/CDC-based RFC with a dedicated maintainer. |
| **Logical replication / WAL capture** | **Demand-gated** | SQL comments and `set_config` do not appear in WAL (requiring explicit `pg_logical_emit_message` transactions, `REPLICA IDENTITY FULL` WAL amplification, and a 24/7 consumer daemon). | **Trigger:** Real workloads exceeding the ~15k rows/s bulk `UPDATE` ceiling or strict zero-write-latency isolation on Tier-1 OLTP tables. |
| **Native Apache Parquet in CLI** | **Demand-gated** | `arrow`/`parquet` significantly inflates static binaries while dynamic JSONB `before`/`after` columns still serialize as JSON strings; `.jsonl.zst` compresses 80–90% and is read natively by DuckDB, ClickHouse, and Snowflake. | **Today:** One-line DuckDB conversion from `.jsonl.zst` to `.parquet` for Athena, BigQuery, or Security Lake. **Trigger:** TB-scale Athena or direct AWS Security Lake demand. |
| **Native AWS KMS SDK &amp; `DynSink`** | **Demand-gated** | `--sign-cmd` integrates KMS, Vault, and HSM without pulling hundreds of AWS SDK crates; closed `AnySink` covers all official sinks (`ADR-0004`). | **Trigger:** Enterprise demand for in-process KMS signing or out-of-tree Rust sink plugins. |
| **HMAC-SHA256 pseudonymization** ([`#114`](https://github.com/auditstream/auditstream/issues/114)) | **Demand-gated** | Under GDPR Art. 4(5) / EDPB 01/2025 and LGPD Arts. 12 &amp; 13 § 4º, pseudonymized values remain personal data while the key exists and introduce key/HKDF lifecycle overhead. | **Today:** Extended redaction plus downstream Vector/VRL pipelines. **Trigger:** Proven cross-export correlation needs not met downstream. |

## Shaping the roadmap

- **Propose a demand-gated feature or RFC:** Open a topic in [GitHub Discussions](https://github.com/auditstream/auditstream/discussions).
- **Report a bug or follow active work:** Check [Engine issues](https://github.com/auditstream/auditstream/issues) and [TypeScript SDK issues](https://github.com/auditstream/auditstream-js/issues).
- **Check what is shipped today:** See [Engine releases](https://github.com/auditstream/auditstream/releases) and [TypeScript SDK releases](https://github.com/auditstream/auditstream-js/releases).
