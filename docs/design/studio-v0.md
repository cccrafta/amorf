---
title: Studio v0, a thin authoring app before the backend
status: step 1 live behind Access; step 2 built and tested locally, not deployed (2026-11-18); steps 3 to 6 planned
updated: 2026-11-18
last_verified: 2026-11-18
---

# Studio v0: a thin authoring app before the backend

**Step 1 built** (skeleton deployed to `https://studio.amorf.workers.dev`, behind Cloudflare Access; see [deployment.md](../deployment.md#studio)). Step 2 built locally, not deployed. Steps 3 to 6 planned. A starting point, kept light: the smallest app that lets the team author entities, shaped so later parts (video, D1, the board editor) plug in without a rewrite.

## Goal

Three people (the owner and two teammates) open `https://studio.amorf.workers.dev/`, sign in, and can:

1. Create an entity.
2. Add media: images and Markdown text. Originals are kept with every upload.
3. Set the entity's kind and each media item's kind.
4. Edit the manifest (`entity.json`), including `layout`.
5. Pin the entity to a coordinate in the field, the main space.

**Out of scope for v0:** video, audio, embeds and documents (shown read-only, kept as they are); files over 100 MB; the visual board editor; D1, Better Auth and revisions; deleting files from R2.

## Decisions (owner, 2026-11-18)

| Question | Answer |
| --- | --- |
| Text | A media kind. Markdown, so it scales: one renderer, used by the studio preview and the site. |
| Drafts | None. Save publishes. |
| Users | Owner plus two teammates, on a Cloudflare Access allow-list. Emails live in Access only; the repository is public. |
| Originals | Part of every entity; any teammate can add them. Private. |
| Media kinds in v0 | Images and text only. Entities with video stay editable, but their video items are read-only. |

## Architecture

One Cloudflare Worker named `studio`, in `apps/studio` (package `@amorf/studio`):

- **UI:** Vite + React SPA from the Worker's static assets, `not_found_handling = "single-page-application"` ([ADR-0016](../decisions/adr/0016-studio-as-vite-react-spa.md), proposed).
- **API:** Hono routes under `/api/*` in the same Worker.
- **Sign-in:** Cloudflare Access on the `workers.dev` route. The Worker also verifies `Cf-Access-Jwt-Assertion`, so no route is open if Access is misconfigured. Preview URLs off.
- **Storage:** R2 only, no D1. R2 stays the source of truth ([ADR-0003](../decisions/adr/0003-entities-never-in-git.md)). Files pass through the Worker (100 MB body limit on Free).

This skips the backend in [backend-decisions.md](backend-decisions.md) on purpose; the spaces and journey shapes are still being tested. When the backend starts, its one-time import reads the same R2 files.

## Data contract

| R2 key | Bucket | Written by | Holds |
| --- | --- | --- | --- |
| `entities/<id>/entity.json` | `amorf-media` (public) | studio | The manifest |
| `entities/<id>/<file>` | `amorf-media` | studio | Web-ready image, content-hashed name |
| `entities/<id>/derived/<file>` | `amorf-media` | studio | 256 px `s256` tier |
| `entities/index.json` | `amorf-media` | studio | Ids of all entities |
| `spaces/field.json` | `amorf-media` | studio | Field placements |
| `entities/<id>/originals/<file>` | `amorf-archive` (private) | studio | Untouched upload |

**Schema changes** (`docs/templates/entity.schema.json`, `entities:check`, and the studio's Zod schema):

- **Text media item:** `{ "kind": "text", "format": "markdown", "text": "…" }`. An item has exactly one of `file`, `embed` or `text`. `format` is there so another format can be added later without a migration. CommonMark, no raw HTML. It is placed on the board through `layout.items` like any piece; how it is referenced (`ref`) follows whatever the entity view uses today, checked in step 3.
- **Field placements** (the shape [DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md) proposes): `{ "version": 1, "space": "field", "topology": "wrap", "tile": 6200, "placements": [{ "id": "…", "x": 0, "z": 0, "pinned": true }] }`.

**Writes are safe for three people:** every write of a JSON file is a conditional put on the ETag the editor loaded. If someone saved in between, the save fails with a conflict and the editor reloads. Media files never collide, because their names carry a content hash.

## Code structure

Grouped by feature ([folder-structure.md](../conventions/folder-structure.md)), with the server and the browser apart because they run in different places:

```
apps/studio/
  package.json          @amorf/studio
  wrangler.jsonc        Worker "studio", assets, R2 bindings MEDIA and ARCHIVE
  vite.config.ts        @cloudflare/vite-plugin
  index.html
  schema/               Zod schemas, no JSX, imported by worker/ and src/
    entity.ts             entity, layout
    media.ts              media item, one schema per kind
    field.ts              field placements
  worker/               Hono app (server)
    index.ts              mounts the routes, runs the Access check first
    access.ts             verifies the Access token
    store.ts              R2 reads and conditional puts
    entities.ts           /api/entities: list, get, save (and index.json)
    media.ts              /api/entities/:id/media: web copy to MEDIA, original to ARCHIVE
    field.ts              /api/field: read and save placements
  src/                  React SPA (browser)
    main.tsx              router
    entities/             list, editor (metadata, kind, layout form, raw JSON view)
    media/
      kinds/              one file per media kind: image.tsx, text.tsx
      list.tsx            the entity's media list; unknown kinds read-only
    field/                top-down plan, pin by click or drag, "pin current layout"
    markdown/             the one Markdown renderer
```

**Extension points, so v0 is a start and not a dead end:**

- **A new media kind** (video, audio) is one schema in `schema/media.ts` plus one file in `src/media/kinds/`. Nothing else branches on kind.
- **The schemas** move to `packages/core` once a second app imports them ([ADR-0008](../decisions/adr/0008-pnpm-workspaces-monorepo.md)).
- **The Markdown renderer** moves to `packages/entity-view` with the board ([ADR-0016](../decisions/adr/0016-studio-as-vite-react-spa.md)); until then `apps/web` uses the same library and options.
- **Storage** sits behind `worker/store.ts`. Moving to D1 later changes that file, not the routes.

## Changes to `apps/web`

Small and backwards-compatible:

- **Text media:** the loader keeps text items instead of skipping them, and the entity view renders them with the shared Markdown options in the board's type styles ([styling.md](../conventions/styling.md)).
- **Field pins:** the loader also fetches `spaces/field.json` (missing file means no pins). `Field.tsx` uses a stored `x`, `z` when present, the hash position otherwise.
- **First placements:** "pin current layout" in the studio computes today's hash positions (the same code as `Field.tsx`) and stores them all as pins, so nothing moves on the day it switches. After that, adding an entity no longer reshuffles the field.

## Steps

0. **Prerequisites (need the owner's yes; they act outside the repository):**
   1. Create `amorf-archive`. Back up `entities/` into it and upload the local `originals/` into `entities/<id>/originals/`.
   2. Set up Cloudflare Zero Trust (free) and an Access application for `studio.amorf.workers.dev` with the three emails. Confirm Access can protect a `workers.dev` route (unverified).
   3. Check how `entities:sync` writes `index.json`, then retire it: it would overwrite studio edits.
   4. Write an interim ADR, "Thin studio on Access and R2 before the backend" (proposed). It defers D1 and Better Auth and supersedes nothing. Done: [ADR-0021](../decisions/adr/0021-thin-studio-on-access-and-r2-before-the-backend.md).
1. **Skeleton:** `apps/studio` with the structure above, the Access check and an empty page, deployed. **Built 2026-11-18:** `worker/index.ts`, `worker/access.ts`, `src/main.tsx` (shows the signed-in email from `/api/me`), type in Director and Letter Gothic ([DDR-0006](../decisions/ddr/0006-studio-type-director-and-letter-gothic.md)). Other folders arrive with their step.
2. **Entities:** list, create, edit metadata and kind, save with conditional puts and `index.json`. **Built 2026-11-18, local only:** `schema/entity.ts` (loose Zod object: fields the studio does not edit yet pass through), `worker/store.ts`, `worker/entities.ts` (`GET /api/entities`, `GET`/`PUT /api/entities/:id` with `If-Match`, `POST /api/entities`), `src/entities/` (list with search, new, editor), `src/router.ts`. Empty fields are removed on save, never stored as `""`. **Before deploying it, do step 0.3:** `entities:sync` still rewrites `index.json` from the local folders and would drop entities created in the studio.
3. **Media:** the `text` kind (schema, `entities:check`, loader, entity view, Markdown renderer); image upload (original to `ARCHIVE`, web copy and `s256` made in the browser to `MEDIA`); attach an original to an existing item; non-image kinds read-only.
4. **Manifest:** the `layout` form and the raw JSON view.
5. **Field:** `spaces/field.json`, the plan view, "pin current layout", and the `apps/web` loader and `Field.tsx` changes.
6. **Deploy on save:** move `apps/web` deploys to Workers Builds; the studio calls its deploy hook after each save. Until then the owner runs `pnpm run deploy`.

Steps 1 to 5 deliver the goal. Step 6 takes the owner out of publishing.
