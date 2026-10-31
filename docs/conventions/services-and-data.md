---
title: Services and data
updated: 2026-10-31
last_verified: 2026-10-31
status: current; entities are loaded from R2 at build time
---

# Services and data

The app has no server, so there is no API layer and no `services/` folder. "Services" here means the code that reaches data and media outside a component: URL building, env access and entity loading. All paths on this page are inside `apps/web/`. A backend app (`apps/api`) may come later; when it does, this page covers `apps/web` and the new app gets its own conventions.

## Where things live

| Concern | Location |
| --- | --- |
| Entity loading from R2 (build time) | `lib/data/entities.ts` |
| Placeholder seed records | `lib/field-data.ts` |
| Media renderers and the live-media pool | `lib/media/` (`registry.ts`, `pool.ts`, `video.ts`) |
| Media URL building | `lib/media/url.ts` |
| Spatial audio | `lib/audio/spatial.ts` |
| Pure helpers shared across the app | `lib/time.ts` and similar, one file per domain |

Group `lib/` by domain (`media/`, `audio/`, `data/`). Do not create `utils/`, `helpers/` or `services/` folders; a file named for its domain is easier to find.

## Rules

1. **Components never call `fetch` directly.** Fetching lives in a typed function in `lib/`. Components receive the result.
2. **Media URLs go through `mediaUrl()`** (`lib/media/url.ts`). Data stores media as site-relative paths starting `/media/` or `/entities/<id>/`. Never hardcode the media host in data or components. ([ADR-0005](../decisions/adr/0005-media-base-and-media-url.md))
3. **Env vars are read in one place and read literally.** Only `NEXT_PUBLIC_*` reaches the browser, and its value is inlined at `next build` and frozen. Write `process.env.NEXT_PUBLIC_MEDIA_BASE` exactly; a dynamic lookup such as `process.env[name]` is not inlined (Next docs `01-app/02-guides/environment-variables.md`, under `apps/web/node_modules/next/dist/docs/`). Changing a value means a rebuild and redeploy.
4. **Cross-origin media needs CORS-mode requests.** `lib/audio/spatial.ts` calls `createMediaElementSource`, and Web Audio outputs silence for a cross-origin element that was not requested with CORS. `lib/media/video.ts` therefore sets `crossOrigin = "anonymous"` whenever `NEXT_PUBLIC_MEDIA_BASE` is set (`crossOriginMedia`). Keep that pairing for any new element that feeds Web Audio.
5. **Validate data at the boundary.** Anything fetched is checked once where it is loaded, so a malformed record fails with a clear error instead of breaking rendering later.

## Media on R2

- Bucket `amorf-media` (Cloudflare account `Amorf`), served at `https://media.amorf.co` ([ADR-0002](../decisions/adr/0002-large-media-in-r2.md)).
- `mediaUrl("/media/x.mp4")` returns `NEXT_PUBLIC_MEDIA_BASE + "/x.mp4"` (bucket root) and `mediaUrl("/entities/<id>/x.jpg")` returns `NEXT_PUBLIC_MEDIA_BASE + "/entities/<id>/x.jpg"` (prefix kept). When the variable is empty the path is served from `public/` by the dev server.
- `NEXT_PUBLIC_MEDIA_BASE` is set in `apps/web/.env.development` and `apps/web/.env.production`. Both are committed: the value is public.
- Large files are not in git: `.gitignore` excludes the local media folders, and `public/.assetsignore` keeps `*.mp4` out of the Worker's static assets (25 MiB per-file cap).
- Bucket setup, CORS and caching pitfalls are in [../deployment.md](../deployment.md).

## Entities: R2 is the source of truth

Entity metadata and media never go into git (the GitHub repo is public; [ADR-0003](../decisions/adr/0003-entities-never-in-git.md)). Working copy: gitignored `apps/web/content/entities/`; published copy: R2 prefix `entities/<id>/`. Layout, fields and scripts: [entities.md](entities.md).

## Entities are loaded at build time

[ADR-0004](../decisions/adr/0004-entities-loaded-at-build-time.md). `app/page.tsx` is an async Server Component. At build time it calls `loadEntities()` (`lib/data/entities.ts`), which fetches `entities/index.json` and every `entity.json` from `NEXT_PUBLIC_MEDIA_BASE`, converts them to `FieldObject`, and passes them to `Field` as the `entities` and `assoc` props. `Field` shows them after the placeholder seed in `lib/field-data.ts`. If R2 is unreachable the loader logs a warning and the seed shows alone.

Consequences to keep in mind: the JSON is public and must contain nothing private; entity edits reach the site only after `pnpm entities:sync` and a rebuild with deploy; a build with no network, or with `NEXT_PUBLIC_MEDIA_BASE` unset, ships the seed only.

## Adding a service-like module

1. Name it for the domain: `lib/<domain>/<thing>.ts`.
2. One-line header comment saying what it owns.
3. Export typed functions; no classes unless the module holds state (as `lib/media/pool.ts` does).
4. Do not import from `components/`.
