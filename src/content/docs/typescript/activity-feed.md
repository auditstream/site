---
title: Activity Feed (BFF)
description: Build a secure, keyset-paginated Activity Feed with audit.query(), allowlisted DTO projection, and server-side actor resolution — without a UI package dependency.
section: SDKs & Languages
parent: typescript
order: 3.5
eyebrow: TYPESCRIPT · ACTIVITY FEED
---

Auditstream intentionally does **not** ship a styled `@auditstream/react` component package ([ADR-0009](https://github.com/auditstream/auditstream/blob/main/docs/decisions/0009-no-ui-package-or-in-db-partition-sealing.md)). Keeping `@auditstream/node` zero-dependency and strictly server-side avoids coupling your design system to third-party UI code and prevents raw `HistoryEntry` database rows from leaking to browsers.

Instead, expose an Activity Feed through a small **Backend-for-Frontend (BFF)** layer that queries `audit.query()`, resolves opaque actor IDs on the server, and projects every row through an explicit allowlist DTO.

## Security rules before you ship

1. **Never return raw `HistoryEntry` rows to the browser.** Raw entries carry internal PostgreSQL metadata (`id`, `xact_id`, `table_oid`, `db_user`, `actor_source`, `schema_version`), full `before`/`after` JSONB images, and `context` fields (such as client IP addresses).
2. **Derive `tenant` strictly on the server.** Read tenant membership from your verified session or JWT and ignore any `?tenant=` query parameter sent by the client.
3. **Bound every query in time.** Default to a rolling lookback window (such as 30 days) so PostgreSQL prunes older monthly partitions automatically.
4. **Resolve display names server-side.** Auditstream actors store opaque IDs only (`spec/actor.md` — never names or emails). Batch-resolve unique actor IDs against your user store once per page.

## 1. Query, resolve actors, and project an allowlisted DTO

Create a server-only module (for example `src/lib/activity.ts`) that calls `audit.query()` with keyset pagination (zero `COUNT(*)`) and maps each row into a minimal client DTO:

```ts
import {
  type Actor,
  type AuditQuery,
  type EventSourceKind,
  type HistoryEntry,
  audit,
} from "@auditstream/node";
import { getPool } from "./prisma";

const DEFAULT_WINDOW_DAYS = 30;
const ALLOWED_FIELDS: Readonly<Record<string, ReadonlySet<string>>> = {
  invoice: new Set(["status", "total"]),
};

export interface ActivityFeedItem {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly source: EventSourceKind;
  readonly action: string;
  readonly entity: string;
  readonly recordId: string | null;
  readonly changedFields: readonly string[];
  readonly actor: {
    readonly id: string;
    readonly type: Actor["type"];
    readonly displayName: string;
    readonly onBehalfOf?: {
      readonly id: string;
      readonly type: Actor["type"];
      readonly displayName: string;
    };
  } | null;
}

export async function queryActivityFeed(options: {
  tenant: string;
  source?: EventSourceKind;
  opPrefix?: string;
  since?: string;
  until?: string;
  cursor?: string;
  limit?: number;
}) {
  const since =
    options.since ??
    (options.until === undefined
      ? new Date(Date.now() - DEFAULT_WINDOW_DAYS * 86_400_000)
      : undefined);

  const query: AuditQuery = {
    tenant: options.tenant,
    ...(options.source ? { source: options.source } : {}),
    ...(options.opPrefix ? { opPrefix: options.opPrefix } : {}),
    ...(since ? { since } : {}),
    ...(options.until ? { until: options.until } : {}),
    ...(options.cursor ? { cursor: options.cursor } : {}),
    limit: options.limit ?? 20,
  };

  const pool = getPool();
  const page = await audit.query((sql, values) => pool.query(sql, values), query);

  // Collect unique opaque actor IDs (including delegated onBehalfOf actors)
  const actorIds = new Set<string>();
  for (const entry of page.entries) {
    if (entry.actor) {
      actorIds.add(entry.actor.id);
      if (entry.actor.onBehalfOf) actorIds.add(entry.actor.onBehalfOf.id);
    }
  }
  // Batch-load user display names from your user store (e.g. prisma.user.findMany)
  const names = await resolveActorNames([...actorIds]);

  return {
    items: page.entries.map((entry) => toActivityFeedItem(entry, names)),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

function toActivityFeedItem(
  entry: HistoryEntry,
  names: ReadonlyMap<string, string>,
): ActivityFeedItem {
  const allowed = entry.table_name ? ALLOWED_FIELDS[entry.table_name] : undefined;
  const changedFields =
    entry.source === "db" && entry.changed && allowed
      ? entry.changed.filter((col) => allowed.has(col)).sort()
      : [];

  return {
    eventId: entry.event_id,
    occurredAt: entry.occurred_at,
    source: entry.source,
    action: entry.op,
    entity: entry.source === "db" ? (entry.table_name ?? "record") : entry.op.split(".")[0] || "app",
    recordId: typeof entry.record_id?.id === "string" || typeof entry.record_id?.id === "number"
      ? String(entry.record_id.id)
      : null,
    changedFields,
    actor: entry.actor
      ? {
          id: entry.actor.id,
          type: entry.actor.type,
          displayName: names.get(entry.actor.id) ?? `${entry.actor.type} ${entry.actor.id}`,
          ...(entry.actor.onBehalfOf
            ? {
                onBehalfOf: {
                  id: entry.actor.onBehalfOf.id,
                  type: entry.actor.onBehalfOf.type,
                  displayName:
                    names.get(entry.actor.onBehalfOf.id) ??
                    `${entry.actor.onBehalfOf.type} ${entry.actor.onBehalfOf.id}`,
                },
              }
            : {}),
        }
      : null,
  };
}
```

## 2. Expose a BFF Route Handler

Validate client filters, enforce authentication, derive `tenant` from the verified session, and return `Cache-Control: no-store`:

```ts
import { AuditstreamError, type EventSourceKind } from "@auditstream/node";
import { NextResponse } from "next/server";
import { queryActivityFeed } from "@/lib/activity";
import { requireVerifiedSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireVerifiedSession(); // fails closed with 401/403
  const params = new URL(request.url).searchParams;
  const rawSource = params.get("source")?.trim() || undefined;
  if (rawSource !== undefined && rawSource !== "db" && rawSource !== "app") {
    return NextResponse.json({ error: 'source must be "db" or "app"' }, { status: 400 });
  }
  const rawLimit = params.get("limit")?.trim() || undefined;
  if (rawLimit !== undefined && !/^\d+$/.test(rawLimit)) {
    return NextResponse.json({ error: "limit must be a positive integer" }, { status: 400 });
  }

  try {
    const page = await queryActivityFeed({
      tenant: session.tenantId, // never read ?tenant= from the query string
      source: rawSource,
      opPrefix: params.get("opPrefix")?.trim() || undefined,
      cursor: params.get("cursor")?.trim() || undefined,
      limit: rawLimit ? Number.parseInt(rawLimit, 10) : 20,
    });
    return NextResponse.json(page, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    if (err instanceof AuditstreamError && err.code === "INVALID_QUERY") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
```

> **Multi-tenant index tip:** If your Activity Feed serves high-QPS tenant queries, add the opt-in paired partial expression indexes on `(actor->>'tenant')` and `(actor->'onBehalfOf'->>'tenant')` documented in [Cloud, Poolers & Security](/docs/cloud-and-security/). Note that `actor.tenant` filters self-asserted actor metadata and does not replace PostgreSQL Row-Level Security (RLS).

## Full copy-paste reference app

Copy and adapt the complete, smoke-tested Next.js 16 + Prisma 7 implementation directly from [`auditstream-js/examples/next-prisma`](https://github.com/auditstream/auditstream-js/tree/main/examples/next-prisma):

- [`src/lib/activity.ts`](https://github.com/auditstream/auditstream-js/blob/main/examples/next-prisma/src/lib/activity.ts) — `audit.query()`, allowlisted `ActivityFeedItem` DTO, and batched actor-name resolution.
- [`src/app/api/activity/route.ts`](https://github.com/auditstream/auditstream-js/blob/main/examples/next-prisma/src/app/api/activity/route.ts) — validated BFF Route Handler with keyset pagination (`nextCursor` / `hasMore`).
- [`src/app/activity/page.tsx`](https://github.com/auditstream/auditstream-js/blob/main/examples/next-prisma/src/app/activity/page.tsx) and [`activity-feed.tsx`](https://github.com/auditstream/auditstream-js/blob/main/examples/next-prisma/src/app/activity/activity-feed.tsx) — zero-dependency Server + Client UI with source/prefix filters and **Load more** pagination.
