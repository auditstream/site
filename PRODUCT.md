# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Backend engineers, platform and database engineers, and engineering leads running PostgreSQL 15–19 in production — especially teams using TypeScript/Node.js (Prisma 7, Drizzle, Hono, Express, Next.js) and teams deploying AI agents that mutate data on behalf of end users (`onBehalfOf`). Their job is to ship a durable, tamper-resistant audit trail for compliance (SOC 2, ISO, financial auditability) and incident forensics without standing up a 24/7 CDC daemon or logical replication slot.

## Product Purpose

Auditstream is an open-source audit trail engine written in Rust (`auditstream`) paired with thin ESM-only TypeScript actor adapters (`auditstream-js`: `@auditstream/node`, `@auditstream/prisma`, `@auditstream/drizzle`).

The system separates actor attribution from database capture:
- Application adapters never write audit rows; they attach the acting identity to each SQL query as an unpadded base64url trailing `sqlcommenter` tag (or transaction-local `set_config` fallback).
- Generated PostgreSQL `SECURITY DEFINER` triggers record structured `before` and `after` JSONB row images, `changed` column arrays, actor metadata, and `xid8` transaction IDs into a monthly-partitioned append-only table (`auditstream.changes`) inside the same transaction.
- The single static Rust CLI handles migration generation (`init`), trigger and partition drift detection in CI (`verify` / `verify --fix`), schema inspection (`status`), terminal history queries (`history`), and pull-based lossless batch export (`export`).

Success means a team can go from zero audit trail to verified, pool-safe, tamper-resistant PostgreSQL change history in minutes with zero new always-on infrastructure.

## Positioning

Open-source database audit trail engine written in Rust. Zero daemons, pooler-safe actors, and tamper-resistant diffs.

Lead public copy with that positioning. PostgreSQL is the only engine in v0.1, but never the headline, and it is always spelled "PostgreSQL" (never "Postgres" or "PG") in visible text.

Differentiators:
- **Zero always-on infrastructure in v0.1:** No 24/7 consumer daemon, no `wal_level = logical`, no `REPLICA IDENTITY FULL`, and no stalled WAL replication slot risking disk exhaustion.
- **Pool-safe human and AI-agent attribution:** Unpadded base64url trailing SQL comments carry humans, API keys, services, and AI agents (`onBehalfOf` nested actor, one level deep) without pinning transaction-mode pooler connections (PgBouncer, Supavisor, Neon, RDS Proxy) and without breaking out of SQL comments.
- **Tamper resistance enforced by PostgreSQL itself:** `auditstream.changes` is owned by a dedicated `NOLOGIN` role (`auditstream_owner`), written exclusively by `SECURITY DEFINER` triggers, and granted `SELECT`-only to application roles so `INSERT`, `UPDATE`, and `DELETE` tamper attempts fail with PostgreSQL `42501`.
- **Lossless pull-based export without a daemon:** `auditstream export` reads committed windows bounded by `xact_id >= cursor AND xact_id < pg_snapshot_xmin(pg_current_snapshot())`, flushing to JSON Lines or CSV before acknowledging the cursor — eliminating the missed-row bug inherent in naive `id > last_id` polling.
- **Direct SQL and migration coverage:** Because capture lives in PostgreSQL triggers, out-of-band SQL edits and migrations are captured automatically with `session_user`.

## Operating Context

- **Evaluation surface:** `auditstream.dev` — calm, 100% Light-Only static Astro 5 site with a single Retina CSS/SVG capture visual and lazy Pagefind client-side documentation search.
- **Database environments:** PostgreSQL 15 through 19 (self-hosted, Docker, Neon, Supabase Supavisor, PgBouncer 1.26 transaction mode).
- **Application stacks:** TypeScript ESM on Node.js 22.12+, Bun, Deno, and Cloudflare Workers (`nodejs_als`); Prisma 7.1+ (`@prisma/adapter-pg` + SQL comments plugin); Drizzle 0.45 driver wrappers and Drizzle 1.x `auditComment()`; Hono, Express, and Next.js 16 route/action wrappers.
- **Day-2 rituals:** Generating migrations (`auditstream init --migrations prisma|drizzle|sql`), gating CI deployments (`auditstream verify --format json`), pre-creating future monthly partitions (`auditstream verify --fix`), inspecting record diffs (`auditstream history`), and scheduled or on-demand exports (`auditstream export --format jsonl|csv --cursor-file ...`) with optional export-time field redaction.

## Capabilities and Constraints

- **Supported databases:** PostgreSQL 15–19 (verified identically across 15.20, 16.15, 17.12, 18.7, and 19.0). PostgreSQL 14 is EOL and unsupported.
- **Trigger strategy:** Statement-level `INSERT` and `DELETE` (`REFERENCING NEW/OLD TABLE`), row-level `UPDATE` (`WHEN (OLD.* IS DISTINCT FROM NEW.*)`), and statement-level `TRUNCATE`. Excluded columns (such as `password_hash`) are stripped before storage; updates touching only excluded columns record nothing.
- **Contract (`spec` v0.1):** Actor `type` MUST be `user | api_key | ai_agent | service | system`; `id` MUST be present; `onBehalfOf` MAY nest one actor one level deep; serialized actor + context JSON MUST NOT exceed 512 bytes (`<= 683` unpadded base64url chars); IDs-only by default (no names, emails, or IPs in SQL comments); malformed payloads NEVER abort the application write (`actor = NULL`, `actor_source = 'invalid'`).
- **Actor resolution precedence:** `1. set_config('auditstream.actor')` (explicit transaction override) → `2. /*auditstream='…'*/` trailing SQL comment → `3. request.jwt.claims` `sub` (Supabase/PostgREST) → `4. NULL` actor (`db_user = session_user`).
- **Distribution & supply chain:** Single static Rust binary (`unsafe_code = forbid`) distributed via shell/PowerShell installers, Homebrew (`auditstream/tap/auditstream`), npm (`auditstream`), and multi-arch distroless Docker (`ghcr.io/auditstream/auditstream`); SLSA provenance attested, SonarCloud A, MIT license (no CLA, no DCO).
- **Honest limits & deferred scope:**
  - Single-statement bulk `UPDATE` caps around ~15k rows/s (`665.1 ms` for 10k rows) because `UPDATE` stays row-level to preserve primary-key correlation.
  - Aurora DSQL is unsupported (no triggers). CockroachDB is unverified.
  - Prisma Accelerate does not pass SQL to comments plugins; callers must use `auditTransaction()` (`set_config` fallback).
  - Live AWS RDS Proxy benchmarking is deferred until requested by users.
  - Post-v0.1 sinks and sources (Webhooks, S3/Parquet, SIEM, MCP server via `rmcp`, optional WAL logical replication via `pg_logical_emit_message`) are planned behind the existing `EventSource` and `Sink` Rust traits, not shipped in v0.1.

## Brand Commitments

- **Name:** `Auditstream` (`auditstream`, `auditstream.dev`).
- **Voice:** Technical, direct, calm, and evidence-first. State exact measurements, hardware/software context, and honest engineering limits; avoid marketing hyperbole and walls of prose.
- **Existing identity asset:** Three-bar architectural ledger-and-conduit mark (`public/favicon.svg`, `src/components/BrandMark.astro`).
- **Zero fabricated proof:** Never invent customer logos, testimonials, enterprise case studies, or pricing tiers.

## Evidence on Hand

All measurements below are recorded in `src/content/docs/evidence.md` (measured `2026-11-24` on PostgreSQL 19.0 + PgBouncer 1.26.1 + `auditstream` `--release` + Node v26.13.1):

- **Durable disk PostgreSQL 19.0 (`fsync=on`, `synchronous_commit=on`, 16 clients):**
  - Single-row `UPDATE` (`comment`): `6,376.6 tps` (**+3.2% / +5.1 µs/row** vs `6,588.9 tps` baseline).
  - Single-row `INSERT` (`comment`): `6,458.5 tps` (**−0.2%** vs `6,443.1 tps` baseline).
  - 10,000-row bulk `INSERT` (`comment`): `60.5 ms/stmt` (`+3.8 µs/row` vs `22.3 ms` baseline).
- **CPU ceiling & bulk DML (`tmpfs`, heavy 368-byte AI-agent actor):**
  - 100,000-row bulk `INSERT`: `473.1 ms` (**211,372 rows/s**, `+3.7 µs/row`).
  - 10,000-row bulk `DELETE`: `46.9 ms` (**213,220 rows/s**, `+4.0 µs/row`).
  - 10,000-row bulk `UPDATE` (honest row-level cap): `665.1 ms` (**15,035 rows/s**, `+64.5 µs/row`).
  - Wide 15-column excluded-column-only `UPDATE`: `208,027 tps` (`+0.1 µs/row`, 0 audit rows written).
- **PgBouncer 1.26 transaction-mode contention (64 clients / 8 server connections, 8× oversubscribed):**
  - **2,407,659** captured transactions across `simple`, `extended`, `prepared`, and mixed leak tests (`272,053` interleaved writes), **0 failed**, **0 missing**, **0 leaked actors**.
  - Trailing `comment` sustains **42.5k–53.5k tps** (**1.8×–2.4×** faster than `set_config`).
- **500,000-row scale (348 MB across 3 monthly partitions):**
  - `auditstream export --format jsonl`: `29,316 events/s` raw; `28,774 events/s` with streaming redaction (`−1.8%`); CSV: `29,062 events/s`.
  - Partial `HASH` index `record_id` lookup: `0.101 ms` (`157,459 QPS` concurrent).
  - `auditstream verify --format json`: `12.6 ms`; `status --format json`: `9.8 ms`.
- **TypeScript adapter micro-benchmarks (`@auditstream/node`, Node v26.13.1):**
  - `encodeScope()`: `10.4 ns` (`96.3M ops/s`); `setConfigValue()`: `9.3 ns`; `isTagged()` (>4 KB SQL): `4.8 ns`; cached `tagSql()`: `24 ns` (`240 ns` across 10-query request batch).
- **Multi-version & cloud verification:** Identical 17/17 pass across PostgreSQL 15.20, 16.15, 17.12, 18.7, and 19.0; Neon (PG 18.7) and Supabase Supavisor (PG 17.12) verified with 0 actor leaks.
- **Absences (must not be fabricated):** No named customer testimonials, production company logos, third-party press quotes, or commercial pricing plans exist.

## Product Principles

1. **Capture in PostgreSQL, not application code:** Triggers guarantee every mutation — ORM, raw SQL, or migration — enters the ledger atomically inside the same transaction.
2. **Zero mandatory infrastructure:** Never require a background consumer daemon or logical replication slot to ship a reliable audit trail.
3. **Pool safety by construction:** Favor stateless per-statement trailing SQL comments over session-pinning configuration whenever the driver permits.
4. **Evidence over claims:** Pair every performance claim with methodology, durable-disk context, and honest engineering ceilings.
5. **Minimal, fast, and inspectable:** Ship static binaries, zero-bloat ESM adapters, and calm Light-Only static documentation that loads instantaneously with minimal client JavaScript.

## Accessibility & Inclusion

- Target WCAG 2.1 AA contrast (`>= 4.5:1` normal text, `>= 3:1` large text and UI components) across the Light-Only palette, including syntax highlighting, diff highlights, and status badges.
- Full keyboard operability: skip-to-content link, roving-tabindex tablists, focus-trapped search modal, keyboard-scrollable tables, and no conflicting bare single-character shortcuts (WCAG 2.1.4).
- Respect `prefers-reduced-motion: reduce` by disabling all keyframe animations and showing the complete settled capture visual at full contrast.
