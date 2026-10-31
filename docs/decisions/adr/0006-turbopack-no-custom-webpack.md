---
title: "ADR-0006: Use Turbopack and no custom webpack configuration"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0001]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0006: Use Turbopack and no custom webpack configuration

## Context and Problem Statement

Next 16 makes Turbopack the default bundler for `dev` and `build`, and a project with a custom `webpack` config fails the build unless it opts out. The project needs a bundler choice that survives upgrades.

## Decision Drivers

- Stay on the default path of the framework.
- Workspace TypeScript packages (ADR-0008) should work without extra build steps.

## Considered Options

- Opt out and keep a custom webpack configuration.
- Use Turbopack with only `next.config.ts` options.

## Decision Outcome

Chosen option: "Turbopack, no custom webpack", because nothing in the project needs a loader or plugin the default does not provide, and Turbopack transpiles workspace packages that export TypeScript.

### Consequences

- Good: fewer moving parts; upgrades follow the framework.
- Bad: a need for a webpack-only plugin would reopen this decision.
- Neutral: set `turbopack.root` explicitly in `apps/web/next.config.ts`, because in a workspace the root must point at the repository root.

## More Information

Next 16 differences: [../../conventions/next-16-static-export.md](../../conventions/next-16-static-export.md).
