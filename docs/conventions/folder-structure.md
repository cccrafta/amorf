---
title: Folder structure
updated: 2026-10-31
last_verified: 2026-10-31
status: monorepo layout and current state of apps/web documented; target for the remaining features proposed, not yet applied
---

# Folder structure

Next.js does not prescribe a layout. Its docs say to "choose a strategy that works for you and your team and be consistent" (`apps/web/node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`), and that `components` and `lib` "have no special framework significance". This page is the strategy this repo uses.

## Repository layout (monorepo)

The repository is a pnpm workspace ([ADR-0008](../decisions/adr/0008-pnpm-workspaces-monorepo.md)). The root holds no application code.

```
apps/
  web/        The site: Next.js app, package @amorf/web. Everything below "Inside apps/web" applies here.
  api/        Future backend app. Not created yet.
packages/     Shared workspace packages (@amorf/*). Empty until a second consumer exists; see packages/README.md.
research/     Theory, experiments and portfolio. See research/README.md.
docs/         This vault: conventions, decisions (ADR and DDR), design notes, templates, deployment.
```

Root files: `package.json` (scripts delegate to `@amorf/web`), `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`. App configuration (Next, Wrangler, ESLint, PostCSS, env files) lives in the app that uses it.

Place new things by what they are: code in an app, shared code in a package only once two apps need it, thinking in `research/`, reasoning in `docs/decisions/`.

## The rule: group by feature, not by kind of file

A feature owns its logic **and** its view in one folder. Do not collect all views in one `ui/` folder and all logic in another. This applies inside each app (and inside a package, if it has features).

Why: to change a feature you should open one folder. Grouping by kind of file (all views here, all logic there) scatters one change across two places and makes it unclear who owns what.

## Inside apps/web

```
app/          Routing only: layout.tsx, page.tsx, globals.css, tokens.css, metadata. Keep it thin.
components/   UI code, one folder per feature (components/field/ is the app).
lib/          Code with no JSX: data, media, audio, time, config. No React components.
public/       Static files copied as-is. Large media does not go here (see services-and-data.md).
scripts/      Node scripts run by hand or from pnpm scripts (scripts/entities.mjs).
content/      Gitignored. Entity working copies and originals; never committed. See entities.md.
```

- `app/` holds no feature logic. `page.tsx` composes a feature and passes props.
- `lib/` never imports from `components/` or `app/`.
- There is no `src/` folder. Keep it that way; `@/*` maps to `apps/web` (not the repository root), so `@/lib/media/url` is `apps/web/lib/media/url`.

## Dependency direction

One way only: `app` → `components/<feature>` → `lib`.

- A feature does not import another feature's internal files. It imports through that feature's `index.ts`.
- Code shared by several features moves up to the nearest common parent (inside `components/field/`) or into `lib/` if it has no JSX.
- Enforcement is by review for now. If it starts to slip, add ESLint `import/no-restricted-paths` rules.

## Inside a feature folder

```
interior/
  index.ts       The public entry. Re-exports only what other code may use.
  state.ts       Types, constants, factory for the feature's state.
  physics.ts     One file per concern, named for the concern (not "helpers" or "utils").
  view.tsx       The JSX renderer (a function named renderX).
```

- A feature gets a folder once it has two or more files. A feature that is one file stays a single file.
- `index.ts` is the only barrel. Inside a feature, import files directly (`./physics`), not through `./index`. Do not add a barrel at `components/` or `lib/`: barrels hide circular imports and slow dev builds (Next discussion #92926; Bulletproof React advises against them).
- Name a file after what it owns. If you cannot name it without "misc", "helpers" or "common", the code belongs in a more specific place.

## Imports

- Across top-level folders, use the `@/` alias: `@/lib/media/url`.
- Within a feature, use relative paths: `./physics`, `../types`.
- Import types with `import type`.

## File conventions

- First line of every file is a comment naming what the file owns: `// Interior physics: pan momentum, rubber-band, edge pull and the eased dive depth.` Keep it to one line.
- Component files that export one component use PascalCase (`Field.tsx`). Everything else is lowercase.
- Renderers are plain functions named `renderX` that take the view-model and return JSX. View-models are built by `xVals`-style functions in the feature's logic.
- `"use client"` sits at the entry that a Server Component renders (`components/field/Field.tsx`, `components/FieldClock.tsx`). Files imported from a client file do not repeat it. Keep it away from barrels. Next docs (under `apps/web/node_modules/next/dist/docs/`): `01-app/01-getting-started/05-server-and-client-components.md`.
- Browser APIs (`window`, `document`, `AudioContext`, media elements) are touched only in effects or event handlers. Client components are prerendered at build time; see `next-16-static-export.md`.

## Vocabulary

A record is an **entity**, in docs, folder names (`content/entities/<id>/`) and new identifiers. In code the identifiers are still `FieldObject`, `OBJECTS` and `o.id`. Do not rename them as a drive-by; a rename is its own change. Entity folder and `entity.json` layout: [entities.md](entities.md).

## Current state of apps/web (2026-10-31)

```
app/page.tsx, layout.tsx, globals.css, tokens.css
components/
  FieldClock.tsx
  field/
    Field.tsx                       the Field class component (client boundary)
    input.ts media.ts navigation.ts engine modules, no view of their own
    types.ts util.ts plate.ts wear.ts chronology.ts tracks.ts   shared helpers
    catalogue.ts notes.ts plan.ts table.ts                      logic; view lives in ui/
    ui/  catalogue.tsx hud.tsx naming.tsx notes.tsx plan.tsx stage.tsx table.tsx trace.tsx
    interior/                       already follows the rule
      index.ts state.ts lifecycle.ts physics.ts input.ts paint.ts layout.ts placement.ts neighbours.ts view.tsx frame.tsx
lib/
  field-data.ts   audio/spatial.ts   data/entities.ts   media/{registry,pool,video,url}.ts   time.ts
scripts/entities.mjs
```

`interior/` is the only feature folder that follows the rule. The rest still use the older grouping by kind (logic at the root of `field/`, views in `ui/`).

## Target (proposed, not applied)

Apply the rule to the remaining features, one feature per change, with no behavior change:

| Today | Target |
| --- | --- |
| `catalogue.ts` + `ui/catalogue.tsx` | `catalogue/index.ts`, `catalogue/view.tsx`, `catalogue/…` |
| `notes.ts` + `ui/notes.tsx` | `notes/…` |
| `plan.ts` + `ui/plan.tsx` | `plan/…` |
| `table.ts` + `ui/table.tsx` | `table/…` |
| `ui/hud.tsx`, `ui/naming.tsx`, `ui/stage.tsx`, `ui/trace.tsx` (view only) | single files beside `Field.tsx`, or merged into the feature they render (trace → `tracks`) |
| `components/FieldClock.tsx` | stays, or `components/clock/` if it grows |

When the last `ui/` file moves, delete `ui/`. The engine modules (`input.ts`, `media.ts`, `navigation.ts`) and shared helpers stay at the root of `components/field/`.

Move one feature at a time and verify with `tsc`, `pnpm build` and a manual pass in the browser after each.
