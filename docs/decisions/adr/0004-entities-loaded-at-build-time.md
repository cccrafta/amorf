---
title: "ADR-0004: Load entities at build time from a Server Component"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: client-fetch plan of 2026-10-29 (never a numbered record)
superseded-by:
related: [ADR-0001, ADR-0003]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0004: Load entities at build time from a Server Component

## Context and Problem Statement

Entities live in R2 (ADR-0003) and the site is static (ADR-0001). The app must get entity data from R2 into the page somehow. An earlier plan, written before anything was built, chose a different route; this record replaces that plan. It appears below as a considered option, not as a numbered record, because it was only a plan in a docs page and was never implemented.

## Decision Drivers

- No loading state or empty field on first paint.
- Fewer cross-origin requests from the visitor's browser.
- Keep `Field` free of data fetching.

## Considered Options

- Client fetch (the earlier plan): `Field` receives data after mount, from a plain `fetch` in an effect, shows a loading state, and falls back to a seed if the fetch fails.
- Build-time fetch: an async Server Component (`app/page.tsx`) calls `loadEntities()`, which fetches `entities/index.json` and each `entity.json` while `next build` runs, and passes the result to `Field` as props.

## Decision Outcome

Chosen option: "build-time fetch in a Server Component", because the data is public and changes only on publish, so the page can ship with the data already in it. If R2 is unreachable, the loader logs a warning and the placeholder seed shows alone.

### Consequences

- Good: no loading state; no runtime dependency on R2 for entity JSON; no client fetching code.
- Bad: entity edits show only after `entities:sync` followed by a rebuild and redeploy.
- Neutral: `NEXT_PUBLIC_MEDIA_BASE` must be set for the build (see ADR-0005).

## More Information

Loader and data rules: [../../conventions/services-and-data.md](../../conventions/services-and-data.md). Publish and deploy order: [../../conventions/entities.md](../../conventions/entities.md).
