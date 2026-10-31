# packages

This folder is empty on purpose. Shared code lives in `apps/web` until a second consumer needs it ([ADR-0008](../docs/decisions/adr/0008-pnpm-workspaces-monorepo.md)).

## When to extract a package

Extract when a second app needs the same code, not before. The expected first case: a future `apps/api` that shares entity types with `apps/web`, which would move those types into `packages/core`. Pure logic with no UI coupling (for example `time`, entity types and media URL building in `apps/web/lib`) is the likeliest candidate; code coupled to the `Field` engine is not extractable without an interface.

## Rules for a package

- Name: `@amorf/<name>`, one folder per package (`packages/core`).
- Just-in-time TypeScript: `package.json` `exports` point at `.ts` source files and there is no build step. Turbopack transpiles workspace packages that export TypeScript.
- No dependency on any app; apps depend on packages through `workspace:*`.
- Document the extraction in an ADR if it changes how apps depend on each other.
- Revisit adding a task runner (Turborepo or Nx) when there are more than three packages or a second app with its own build.
