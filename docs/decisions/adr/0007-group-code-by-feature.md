---
title: "ADR-0007: Group code by feature, with a barrel only at a feature's index.ts"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0008]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0007: Group code by feature, with a barrel only at a feature's index.ts

## Context and Problem Statement

Next does not prescribe a folder layout. The first version of the app kept logic in one place and views in a `ui/` folder, so one change touched two folders and ownership was unclear.

## Decision Drivers

- Changing a feature should mean opening one folder.
- Avoid circular imports and slow dev builds that barrel files cause.

## Considered Options

- Group by kind of file (all views together, all logic together).
- Group by feature: logic and view in one folder, with one public `index.ts`.

## Decision Outcome

Chosen option: "group by feature", with a barrel only at a feature's `index.ts` and none at `components/` or `lib/`. Inside `apps/web`, the dependency direction is `app` to `components/<feature>` to `lib`.

### Consequences

- Good: one folder per change; clear ownership.
- Bad: migrating remaining kind-grouped code is a series of small refactors, one feature at a time.
- Neutral: enforcement is by review until an ESLint boundary rule is worth adding.

## More Information

Rules and current tree: [../../conventions/folder-structure.md](../../conventions/folder-structure.md).
