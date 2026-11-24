---
title: Overview
description: How Auditstream separates Rust capture and export from thin TypeScript actor adapters over PostgreSQL 15–19.
section: Start
order: 1
eyebrow: START · ARCHITECTURE
---

**The Rust engine captures and exports; adapters only tell PostgreSQL who acted.**

Application code never writes audit rows itself. An adapter attaches the acting identity to each SQL statement, generated PostgreSQL triggers write `before`, `after`, `changed`, and actor metadata into `auditstream.changes` inside your database, and the Rust CLI inspects or exports immutable batches on demand.

## Design principles

- **Zero new infrastructure in v0.1.** No 24/7 consumer daemon, no `wal_level = logical`, no `REPLICA IDENTITY FULL`, and no replication slot holding WAL on disk.
- **The history table is the product.** `auditstream.changes` is append-only, partitioned by month on `occurred_at`, owned by a dedicated `NOLOGIN` role, and queryable directly by your application (`SELECT` only).
- **Contract-first across repositories.** The engine repository owns the versioned `spec/` folder and language-neutral conformance fixtures. Adapters declare which spec version they implement and never redefine capture semantics.

## Workspace layout (Rust engine)

The Rust engine (`auditstream`) is a hexagonal Cargo workspace where `auditstream-core` holds domain types and port traits with zero I/O dependencies:

| Crate | Owns | May depend on | Must not depend on |
| :--- | :--- | :--- | :--- |
| `auditstream-core` | Domain types, port traits (`EventSource`, `Sink`), transport codec, diff and redaction | `serde`, `thiserror` | `tokio`, `sqlx`, any I/O crate |
| `auditstream-pg` | Schema introspection, DDL and trigger generation, migration writers, `xid8` reader | `core`, `sqlx`, `tokio` | `export`, binary |
| `auditstream-export` | Sinks (JSON Lines and CSV in v0.1; heavy sinks behind Cargo features later) | `core`, `tokio` | `sqlx`, `pg` |
| `auditstream` | CLI commands (`init`, `verify`, `status`, `history`, `export`), config, logging | All crates above, `clap`, `anyhow` | Business logic of its own |

## Ports and delivery semantics

```rust
pub trait EventSource: Send {
    fn next_batch(&mut self, max: usize)
        -> impl Future<Output = Result<Option<Batch>, SourceError>> + Send;
    fn ack(&mut self, upto: &Cursor)
        -> impl Future<Output = Result<(), SourceError>> + Send;
}

pub trait Sink: Send {
    fn write(&mut self, batch: &Batch) -> impl Future<Output = Result<(), SinkError>> + Send;
    fn flush(&mut self) -> impl Future<Output = Result<(), SinkError>> + Send;
}
```

Delivery is **pull-based, in batches, at least once**. The cursor is acknowledged only after the sink flushes, and every event carries a stable UUID `event_id` so destinations can deduplicate safely.
