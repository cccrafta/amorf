---
title: "ADR-0012: Run the backend on Cloudflare Workers, with D1 in the eu jurisdiction and three R2 buckets, starting on the Free plan"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0002, ADR-0013, ADR-0014]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0012: Run the backend on Cloudflare Workers, with D1 in the eu jurisdiction and three R2 buckets, starting on the Free plan

## Context and Problem Statement

The project is getting a backend: an API, accounts, an authoring studio and, later, media processing ([ADR-0014](0014-backend-with-writes-and-accounts.md)). The site, the media bucket `amorf-media`, the `media.amorf.co` domain and the deploy already live on Cloudflare ([ADR-0001](0001-static-export-on-cloudflare-workers.md), [ADR-0002](0002-large-media-in-r2.md)). Where do the API, the database and the new storage run, and on which plan do we start?

Today the originals and licensed sources exist only on the author's machine, with no backup, and research media marked `publish: false` sits in the public bucket.

## Decision Drivers

- One vendor, one bill, one set of credentials; the account and domain already exist.
- Personal data (accounts, visitor records) stays in the EU.
- No server to patch or pay for while idle.
- A few authors and a small corpus: start free, pay only when a limit is hit.
- Lock-in stays bounded: the data layer must be portable to Postgres.

## Considered Options

- Cloudflare only: Workers, D1, R2 (and later Queues, Workflows, Containers, Vectorize, Workers AI).
- Supabase (Postgres, auth and storage in an EU region) with media staying in R2.
- A Node host (Fly, Render) with Postgres on Neon.
- Cloudflare Workers with Postgres on Neon (Frankfurt) through Hyperdrive.

## Decision Outcome

Chosen option: "Cloudflare only", because it is the only option that keeps data, media and code with one vendor that already holds the account and domain, and it can pin the database to the EU.

- **Compute:** Workers for the API and the studio.
- **Database:** one D1 database, created in the `eu` jurisdiction, for all records: entities and revisions, spaces and placements, journeys, notes, users and roles.
- **Storage:** three R2 buckets.
  - `amorf-media` (exists): public, published derivatives only, behind `media.amorf.co`. File names stay immutable.
  - `amorf-ingest`: private. Uploads land here before processing.
  - `amorf-archive`: private. Originals and licensed sources, D1 exports, and research media with `publish: false`.
- **Plan:** start on the Workers Free plan. Upgrade to Paid (USD 5 a month base) when heavy media processing (Containers) arrives, or when a D1, request or CPU limit is hit.

### Consequences

- Good: no new vendor; R2 egress stays free; D1 Time Travel restores to any minute in the last 7 days on Free (30 on Paid) at no cost.
- Good: the archive bucket gives originals their first backup.
- Bad: Free limits shape phase 0 to 2. D1: 500 MB per database, 100,000 rows written a day (a hard error over it), 50 queries per request. Workers: 10 ms CPU per request (unverified), and password hashing can exceed it (unverified). As a precaution, sign-in uses magic links and passkeys ([ADR-0015](0015-better-auth-on-d1.md)). Containers are Paid only, so uploads must be web-ready until then.
- Bad: lock-in to D1, Queues and Workflows APIs. Drizzle ([ADR-0017](0017-zod-schemas-hono-api-drizzle.md)) keeps the query layer portable to Postgres.
- Bad: D1 has one query at a time per database, a 2 MB row limit, no interactive transactions (use `db.batch()`), and a 50 MB result cap. Large payloads go to R2 with a pointer in the row.
- Neutral: Time Travel is not a long-term backup. A scheduled D1 export to `amorf-archive` covers older history.
- Neutral: phase 0 work: create `amorf-archive` and copy `originals/` into it first (no copy exists today), then `amorf-ingest` with CORS for the studio's origin.

## Pros and Cons of the Options

- **Supabase:** strongest single-vendor alternative for data and auth, but media stays in R2, so data splits across two clouds.
- **Node host with Neon:** a server to run and pay for while idle; nothing in the workload needs it.
- **Workers with Neon through Hyperdrive:** brings pgvector and hybrid search in one SQL engine, at the cost of a second vendor, 20 to 30 ms per query unless the Worker is placed near the database, and cold starts after scale-to-zero. Kept as the escape route if D1 limits bite.

## More Information

Research, prices and limits (checked 2026-11-04; check again before upgrading): [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-01, DP-02, DP-10, "Starting on Free"). Scope: [../../design/backend.md](../../design/backend.md). Bucket and CORS operations: [../../deployment.md](../../deployment.md).
