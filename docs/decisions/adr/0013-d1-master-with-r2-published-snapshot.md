---
title: "ADR-0013: Make D1 the master copy of entities, publish an R2 snapshot, and rebuild the static site by deploy hook"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes: ADR-0003
superseded-by:
related: [ADR-0001, ADR-0004, ADR-0012, ADR-0014]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0013: Make D1 the master copy of entities, publish an R2 snapshot, and rebuild the static site by deploy hook

## Context and Problem Statement

[ADR-0003](0003-entities-never-in-git.md) keeps entities out of git and makes R2 the source of truth: the author edits a gitignored working copy under `apps/web/content/entities/` and publishes it with `entities:sync`. The studio needs drafts, revisions, several authors and roles, which a folder of JSON files on one laptop cannot give. A lost laptop also loses unsynced edits. Where does entity data live, and how does a change reach the static site without changing how `apps/web` loads data ([ADR-0004](0004-entities-loaded-at-build-time.md))?

ADR-0003's "R2 is the source of truth" no longer holds under this decision, so this record supersedes it. Its other rule, that entity content never enters git, carries forward unchanged.

## Decision Drivers

- Entity content never enters the public repository.
- Drafts, revisions and authorship need a database ([ADR-0012](0012-cloudflare-platform-d1-and-three-buckets.md)).
- `apps/web` stays untouched in phase 1: same files, same loader, same build.
- Publishing works without a terminal.

## Considered Options

- Keep R2 as the source of truth and let the API write JSON files to it.
- D1 as the master copy, with publish writing an R2 snapshot in today's file format.
- D1 as the master copy, with `apps/web` fetching entities from the API at run time.

## Decision Outcome

Chosen option: "D1 as master with an R2 snapshot", because it gives the studio a real database while the static site keeps reading exactly the files it reads today.

- **Master:** D1 holds entity metadata. Every published revision is kept as an immutable row.
- **Publish:** `apps/api` writes the current snapshot to R2 as `entities/<id>/entity.json` and rewrites `entities/index.json`, the same keys and shape the loader reads now. Then it calls a Workers Builds deploy hook for `apps/web`.
- **Site:** `apps/web` stays a static export and loads entities at build time ([ADR-0004](0004-entities-loaded-at-build-time.md) unchanged).
- **Never in git:** entity content (D1 rows, snapshots, media) never enters the repository. The `.gitignore` guard for `apps/web/content/` stays until the working copy is gone.

### Consequences

- Good: revisions, drafts and roles live in one place; a lost laptop loses nothing.
- Good: nothing in `apps/web` changes in phase 1.
- Bad: a publish reaches the site only after one build (minutes). Fine for a few authors. Deploy hooks allow 10 builds a minute per Worker, and a repeat call while a build is queued joins it.
- Bad: the manual `pnpm run deploy` moves to Workers Builds: one project per app, its own root directory and watch paths (including `packages/core`), and `packageManager` pinned to an exact pnpm version.
- Neutral: a one-time import moves the existing entities from the working copy (or R2) into D1. After it, the local `apps/web/content/entities/` folders and `entities:sync` are retired, and `entity-intake` becomes an API client or a step inside the API.
- Neutral: if publish latency starts to matter, run-time fetching from the API is a separate decision.

## Pros and Cons of the Options

- **API writes JSON to R2 as the master:** no database for revisions, drafts or queries; every list view reads many objects.
- **Run-time fetch from the API:** instant publish, but entity pages stop being prerendered, `apps/web` gains loading states and a run-time dependency, and [ADR-0004](0004-entities-loaded-at-build-time.md) would need superseding. Not needed yet.

## More Information

Research: [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-03, DP-14). Entity rules (to be updated when the import lands): [../../conventions/entities.md](../../conventions/entities.md). Loader: [../../conventions/services-and-data.md](../../conventions/services-and-data.md).
