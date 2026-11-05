---
title: "ADR-0018: Keep pnpm workspaces without a task runner after adding apps/api and apps/studio"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0008, ADR-0013, ADR-0016, ADR-0017]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0018: Keep pnpm workspaces without a task runner after adding apps/api and apps/studio

## Context and Problem Statement

[ADR-0008](0008-pnpm-workspaces-monorepo.md) chose pnpm workspaces with no Turborepo or Nx, and said to revisit "when a backend app exists or there are more than three packages". The backend plan adds `apps/api` and `apps/studio` ([ADR-0014](0014-backend-with-writes-and-accounts.md), [ADR-0016](0016-studio-as-vite-react-spa.md)) and the first packages, `packages/core` and later `packages/entity-view` ([ADR-0017](0017-zod-schemas-hono-api-drizzle.md)). This record is that revisit. It does not supersede ADR-0008, because the decision does not change.

## Decision Drivers

- Three apps, each built and deployed on its own.
- Packages are just-in-time TypeScript with no build step, so there is little output to cache.
- Deploys move to Workers Builds, one project per app ([ADR-0013](0013-d1-master-with-r2-published-snapshot.md)), which already decides what to rebuild through watch paths.
- No tooling that has nothing to do yet.

## Considered Options

- Keep pnpm workspaces with `pnpm --filter`, no task runner.
- Add Turborepo for task ordering and caching.
- Add Nx.

## Decision Outcome

Chosen option: "keep pnpm workspaces, no task runner", because with three apps and build-free packages there is nothing worth caching, and Workers Builds watch paths already rebuild only the app a change touches. ADR-0008 stays accepted and unchanged.

- Each app deploys from its own Workers Builds project, with its own root directory and watch paths that include the packages it uses (`packages/core` for all three).
- Root scripts keep delegating with `pnpm --filter`.
- Revisit when builds get slow, or when there are more than three packages.

### Consequences

- Good: no new tool, config or cache to maintain.
- Bad: no cross-app task graph; running checks across all apps is a few `pnpm --filter` calls or `pnpm -r`.
- Neutral: watch paths in each Workers Builds project must list every package the app imports; a missing one means a change does not trigger a rebuild.

## More Information

Research: [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-17). Layout: [../../conventions/folder-structure.md](../../conventions/folder-structure.md). Package rule: [../../../packages/README.md](../../../packages/README.md).
