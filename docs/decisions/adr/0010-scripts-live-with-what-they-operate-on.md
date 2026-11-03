---
title: "ADR-0010: Keep repo-level scripts in root scripts/, app scripts in their app"
status: accepted
date: 2026-11-01
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0007, ADR-0008, ADR-0011]
updated: 2026-11-01
last_verified: 2026-11-01
---

# ADR-0010: Keep repo-level scripts in root scripts/, app scripts in their app

## Context and Problem Statement

The only script used to be `apps/web/scripts/entities.mjs`, which belongs to the web app. The research index ([ADR-0011](0011-file-research-under-ontology-parts.md)) is the first script that works on folders no app owns. Where should a script live when it serves `research/`, `docs/` or the whole repository?

## Decision Drivers

- Group by what a thing is and what it serves ([ADR-0007](0007-group-code-by-feature.md), [ADR-0008](0008-pnpm-workspaces-monorepo.md)): code in an app, thinking in `research/`, reasoning in `docs/`.
- `research/` and `docs/` should hold no code, so they read as research and documentation.
- The root has no dependencies and should stay that way.
- More repo-level checks are likely, such as a docs link and frontmatter check.

## Considered Options

- Inside the folder it serves (`research/scripts/`).
- Inside `apps/web/scripts/`, beside `entities.mjs`.
- A root `scripts/` folder for repo-level tooling, app scripts staying in their app.
- A workspace package (`packages/tools`).

## Decision Outcome

Chosen option: "a root `scripts/` folder", because it keeps code out of `research/` and `docs/`, does not tie research tooling to the web app, and needs no package or dependencies. A script lives with what it reads and writes: app scripts in the app, repo-level scripts in `scripts/`. A package is not justified: `packages/` is for code that apps import.

The rules (naming, dependencies, shared helpers) are in [../../conventions/folder-structure.md](../../conventions/folder-structure.md#scripts-with-what-they-read-and-write).

### Consequences

- Good: one place to look for repo-level tooling; `research/` and `docs/` stay free of code.
- Good: future checks (`docs:check`) have an obvious home.
- Bad: root `package.json` now has scripts that do not delegate to `@amorf/web`.
- Neutral: if a root script ever needs a dependency, revisit; that is the point where `packages/` or a root `devDependencies` would be decided.
