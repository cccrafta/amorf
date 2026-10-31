---
title: "ADR-0008: Use a pnpm workspaces monorepo without Turborepo or Nx"
status: accepted
date: 2026-10-31
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0006, ADR-0007]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0008: Use a pnpm workspaces monorepo without Turborepo or Nx

## Context and Problem Statement

The repository started as one Next.js app at the root. It now also holds docs, decision records and research, and a backend app is expected later. The root needs a shape that does not mix app configuration with project-wide material.

## Decision Drivers

- One app today; a second (a backend such as `apps/api`) is planned but not scheduled.
- Docs, decisions and research are not part of any app.
- No tooling that has nothing to do yet.

## Considered Options

- Keep the single app at the repository root.
- pnpm workspaces with `apps/` and `packages/`, no task runner.
- pnpm workspaces plus Turborepo or Nx.

## Decision Outcome

Chosen option: "pnpm workspaces, no task runner". The app moves to `apps/web` (package `@amorf/web`); the root holds the workspace, docs, `research/` and `packages/`. A task runner earns its place only with several tasks to order and cache, so revisit when a backend app exists or there are more than three packages.

Packages follow these rules when they appear: they are just-in-time TypeScript (`exports` point at `.ts` files, no build step), named `@amorf/*`, and `packages/` stays empty until a second consumer exists. The first likely package is `packages/core`, holding entity types shared by `apps/web` and a future `apps/api`.

### Consequences

- Good: a clean root; app-specific config (Next, Wrangler, env files, `.gitignore` guards) sits beside the app it configures.
- Bad: paths in docs and scripts changed once; the `@/*` alias now maps to `apps/web`, not the repository root.
- Neutral: root commands delegate to `@amorf/web`, so `pnpm dev` works from the root.

## More Information

Layout: [../../conventions/folder-structure.md](../../conventions/folder-structure.md). Package rule: [../../../packages/README.md](../../../packages/README.md).
