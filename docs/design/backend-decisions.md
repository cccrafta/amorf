---
title: Backend stack, decision points
status: proposed
updated: 2026-11-04
last_verified: 2026-11-04
---

# Backend stack: decision points

**Proposed, not decided.** Each decision point here becomes an ADR once the owner agrees. Scope and data inventory: [backend.md](backend.md). The ADRs, once accepted, win over this page.

Research was done on 2026-11-04 from official documentation (Cloudflare, Better Auth, the auth vendors' pricing and security pages, Drizzle, Hono, Zod, libvips, OpenSeadragon). Prices and limits change: check them again when an ADR is written. Items marked **(unverified)** were not confirmed on an official page.

## Summary

| # | Decision | Recommendation |
| --- | --- | --- |
| DP-01 | Platform | Cloudflare only, on the Workers Paid plan |
| DP-02 | Database | D1 in the `eu` jurisdiction |
| DP-03 | Where entity data lives | D1 is the master; publishing writes `entity.json` and `index.json` to R2 as today |
| DP-04 | Schema source of truth | Zod 4 in `packages/core`; the JSON Schema is generated from it |
| DP-05 | Query layer and migrations | Drizzle, stable line pinned; `wrangler d1 migrations` applies |
| DP-06 | API framework | Hono with `@hono/zod-openapi` and the typed `hc` client |
| DP-07 | Authentication | Better Auth inside `apps/api`, on D1 |
| DP-08 | Authorization | Roles and ownership in D1; Cloudflare Access as a second gate on the studio |
| DP-09 | Domains | Everything under `amorf.co` |
| DP-10 | Media buckets and upload | Three buckets (public, ingest, archive); presigned direct uploads |
| DP-11 | Media processing | Queues and Workflows to orchestrate; light work in Workers, heavy work in Containers |
| DP-12 | Video | Progressive MP4 on R2 as today; Stream only if long films arrive |
| DP-13 | Deep zoom and 3D | `vips dzsave` to IIIF tiles with OpenSeadragon; `gltf-transform` in a Container |
| DP-14 | Publishing | Keep the build-time site; publishing triggers a Workers Builds deploy hook |
| DP-15 | Studio app | Vite + React SPA on Workers static assets |
| DP-16 | Shared rendering code | Extract the field, entity view and media renderers into packages when the studio needs previews |
| DP-17 | Monorepo tooling | Stay on pnpm workspaces; no Turborepo yet |
| DP-18 | Search and embeddings (later) | D1 FTS5 for keywords; Vectorize and Workers AI for semantic search; image path decided by a spike |
| DP-19 | Visitor data | Same D1; large payloads (sketches, and camera samples only if EXP-0010 earns them) as R2 objects |

## DP-01: Platform

- **Recommendation:** Cloudflare for everything: Workers, D1, R2, Queues, Workflows, Containers, Vectorize and Workers AI. Requires the Workers Paid plan (USD 5 a month base). Containers, a 10 GB D1 and the paid Workflows limits need it.
- **Why:** the account, the bucket, the domain and the deploy already live there. R2 egress is free. One vendor, one bill, one set of credentials. D1 can be pinned to the `eu` jurisdiction.
- **Alternatives:** Supabase (Postgres, auth and storage with EU regions) is the strongest single-vendor alternative, but it splits data between two clouds, since media stays in R2. A Node host (Fly, Render) adds a server to run.
- **Risk:** lock-in to Cloudflare APIs (D1, Queues, Workflows). This is limited by DP-05: Drizzle can also target Postgres.

## DP-02: Database

- **Recommendation:** one D1 database in the `eu` jurisdiction for all records: entities and revisions, spaces and placements, journeys, notes, users and roles.
- **Why it fits:**
  - 10 GB per database on Paid, far beyond a corpus of records whose media sits in R2.
  - FTS5 covers keyword search, and JSON functions cover display and layout configs.
  - Time Travel restores to any minute in the last 30 days, at no cost. Migrations are built in.
- **Limits that shape the design:**
  - 2 MB per row: keep large payloads in R2.
  - One query at a time per database: fine at this scale.
  - No real interactive transactions: use `db.batch()`, which runs atomically.
  - Since 2026-11-04, a query result over 50 MB fails: paginate.
  - Read replication is still beta: not needed now.
- **Alternative:** Postgres on Neon (Frankfurt) through Hyperdrive. It brings pgvector and hybrid search in one SQL engine. The costs are a second vendor, 20 to 30 ms per query unless the Worker is placed near the database, and cold starts after scale-to-zero.
- **Backups:** Time Travel covers 30 days. Add a scheduled export to the private archive bucket for anything older.

## DP-03: Where entity data lives

- **Recommendation:** D1 becomes the master copy of entity metadata, with every published revision kept as an immutable row. Publishing writes the current snapshot to R2 as `entities/<id>/entity.json` and rewrites `entities/index.json`, the same files `apps/web` reads at build time today ([ADR-0004](../decisions/adr/0004-entities-loaded-at-build-time.md)). `apps/web` does not change in phase 1.
- **Why:** revisions, drafts, roles and the studio need a database. Keeping the R2 snapshot means the static site, its loader and its build are untouched.
- **Consequences:**
  - [ADR-0003](../decisions/adr/0003-entities-never-in-git.md) still holds: entities never go into git. But "the R2 bucket is the source of truth" becomes "D1 is the source of truth, R2 holds the published copy".
  - The local `apps/web/content/entities/` folders and `entities:sync` are retired after a one-time import.
  - The `entity-intake` skill becomes a client of the API, or a step inside it.

## DP-04: Schema source of truth

- **Recommendation:** define entity, media item, space, placement, journey, note and the registry configs as Zod 4 schemas in `packages/core`. Generate `docs/templates/entity.schema.json` with `z.toJSONSchema()` (draft 2020-12), so editors keep autocompletion. `entities:check`, the API and the studio all validate with the same schemas.
- **Why:** one definition gives runtime validation, TypeScript types, the OpenAPI document (DP-06) and the JSON Schema.
- **Caveat:** `z.fromJSONSchema()` is experimental, so the existing JSON Schema is translated into Zod by hand once.

## DP-05: Query layer and migrations

- **Recommendation:** Drizzle ORM with `drizzle-orm/d1`, pinned to the latest stable line (0.45.x on 2026-11-04). Move to 1.0 when it is released, not while it is a release candidate. `drizzle-kit generate` writes migrations, and `wrangler d1 migrations apply` runs them (`migrations_pattern` supports Drizzle's folders since 2026-05-29).
- **Why:** typed queries, and the same API for D1 and Postgres, which keeps DP-02's alternative open. Better Auth has a Drizzle adapter.
- **Alternative:** Kysely. It has no official D1 dialect, only a community one.
- **Risk:** the docs already point at the 1.0 release candidate. Expect one migration of the ORM code.

## DP-06: API framework

- **Recommendation:** Hono (4.13.x) on Workers, with `@hono/zod-openapi` (Zod 4) for routes and an OpenAPI 3.1 document. The studio and `apps/web` call it through Hono's typed `hc` client.
- **Why:**
  - Hono is the de facto Workers framework. It has Better Auth integration documented.
  - Routes are validated by the schemas from DP-04.
  - The studio gets end-to-end types without code generation.
- **Note:** Hono's RPC types get slow with many routes. Split the API into sub-apps by area (entities, media, spaces, auth, visitor) from the start.

## DP-07: Authentication

- **Recommendation:** Better Auth (MIT) running inside `apps/api`, storing users and sessions in the same D1 database.
  - Plugins: email and password or magic link, passkeys, social login (Google, optional), the admin plugin for roles and bans, and the JWT plugin if a token is ever needed outside the domain.
  - Email through a transactional provider with an EU option (Resend or similar; choose in the ADR).
- **Why:**
  - It is the only option with no third-party processor, so personal data stays in our EU database and GDPR is simplest.
  - No per-user pricing, and no lock-in: we own the tables.
  - Roles live next to the data they protect.
- **Compared (2026-11-04):**

| Provider | Free tier | EU data residency | Fit |
| --- | --- | --- | --- |
| Better Auth (self-run) | Unlimited | Yes (our D1, `eu` jurisdiction) | Best fit; we run it |
| Supabase Auth | 50k MAU | Yes (Frankfurt and others) | Best hosted option; a whole Supabase project for auth only; passkeys in beta |
| Kinde | 10.5k MAU | Yes (Dublin) | Hosted runner-up; has a Workers JWT guide; roles limited on free |
| Auth0 | 25k MAU | Yes if the tenant is created in the EU | Roles and hash export are behind paid plans |
| Clerk | 50k retained users | No (US only) | `@clerk/nextjs` breaks under `output: "export"`; custom roles are a paid add-on |
| WorkOS AuthKit | 1M MAU | No (US only) | Roles only through organizations |
| Stytch, Firebase | 10k, 50k | No | US only; Stytch now owned by Twilio |

- **Risks:**
  - We own sign-in security: pin the version, follow its security releases (one was announced for 2026-11-03), and test every upgrade.
  - D1 lacks real transactions, and a Better Auth upgrade once broke D1 (issue #4732).
  - The `auth generate` CLI cannot reach D1. Generate the tables through Drizzle instead.
- **Fallback:** Supabase Auth in Frankfurt, if running sign-in ourselves proves to be a burden. Its JWKS can be verified the same way.

## DP-08: Authorization

- **Recommendation:**
  - Roles (`user`, `author`, `admin`) and ownership checks live in `apps/api`, in D1, as [backend.md](backend.md#authentication-and-authorization) describes.
  - Every route declares the role it needs. Every visitor record checks its owner and its visibility (`private`, `link`, `public`).
  - The studio additionally sits behind Cloudflare Access with an allow-list of author emails. Access is free for small teams (seat limit unverified).
- **Why:** two independent gates on the part that can change the corpus. Visitor routes need only the first.

## DP-09: Domains

- **Recommendation:** `amorf.co` (site, moved from `amorf.amorf.workers.dev`), `api.amorf.co`, `studio.amorf.co`, `media.amorf.co` (exists).
- **Why:** subdomains of one site are same-site, so Better Auth's session cookie (scoped to `.amorf.co`) works from the site and the studio without third-party cookies or tokens in `localStorage`. The API still needs CORS for the two origins.

## DP-10: Media buckets and upload

- **Recommendation:** three buckets.
  - `amorf-media` (exists): public, published derivatives only, behind `media.amorf.co`. File names stay immutable.
  - `amorf-ingest`: private. Uploads land here and wait for processing.
  - `amorf-archive`: private. Originals and licensed sources (today only on the author's machine, with no backup), D1 exports, and research media with `publish: false`, which is public today.
- **Upload path:**
  1. The studio asks `apps/api` for a presigned `PUT` URL (or one per part for multipart uploads).
  2. The browser uploads straight to `amorf-ingest` through the S3 endpoint. This avoids the Workers request body limit of 100 MB on Free and Pro zones.
  3. R2's `object-create` event notification sends a message to a Queue.
- **Notes:**
  - Presigned URLs work only on the S3 endpoint (`<account>.r2.cloudflarestorage.com`), not on custom domains. The ingest bucket needs CORS for the studio's origin.
  - Presigning each part of a multipart upload is unverified; test it early.

## DP-11: Media processing

- **Recommendation:** each media kind has one processor. A Queue consumer starts a Workflow per upload. Steps pass R2 keys, never bytes, because a step result is capped at 1 MiB.
  - **Light work in the Worker:** image derivatives and thumbnails through the Images binding or URL transformations (input up to 100 MB and 100 megapixels; 5,000 unique transformations a month free, then USD 0.50 per 1,000). Video posters through Media Transformations (input up to 100 MB and 10 minutes).
  - **Heavy work in a Container** (GA since 2026-04-13): ffmpeg, libvips and gltf-transform. Pay per active second.
  - Results are written to `amorf-media`, and the media record in D1 moves to `ready`. The original moves to `amorf-archive`.
- **Phasing:** phase 1 accepts web-ready uploads plus Worker-side derivatives. Containers arrive in phase 3 with the media registry.
- **Unverified:** that the Container image can run ffmpeg and libvips as expected (it runs any Linux image, so this is likely, but test it).

## DP-12: Video

- **Recommendation:** keep H.264/AAC progressive MP4 with `faststart` on R2, as today. Transcoding moves into the Container (DP-11).
- **Why:** it works today, it feeds Web Audio for spatial sound, and the clips are short. Egress is free.
- **Alternative:** Cloudflare Stream (USD 5 per 1,000 minutes stored, USD 1 per 1,000 minutes delivered, encoding free) when long films or adaptive streaming are needed. Media Transformations only make clips and posters; they are not for serving full videos.

## DP-13: Deep zoom and 3D

- **Recommendation:**
  - **Large drawings:** `vips dzsave` in the Container writes IIIF or DZI tiles to `amorf-media` once. Viewed with OpenSeadragon (6.x, BSD). Cloudflare Images stops at 100 MB, 100 megapixels and 12,000 px and does not read TIFF, so it makes previews, not the zoomable master.
  - **3D:** `gltf-transform` with meshopt in the Container: compress, render a poster, check size. Not in a Worker: the stock meshopt and Draco encoders compile WebAssembly at run time, which Workers do not allow, and large GLBs risk the 128 MB memory limit.

## DP-14: Publishing

- **Recommendation:** keep the build-time static site. On publish, `apps/api` writes the R2 snapshot (DP-03) and calls a Workers Builds deploy hook for `apps/web`.
  - Deploy hooks allow 10 builds a minute per Worker, and a repeat call while a build is queued joins it.
  - Move the manual `pnpm run deploy` to Workers Builds: one project per app, its own root directory and watch paths (including `packages/core`), and `packageManager` pinned to an exact pnpm version.
- **Why:** entity pages stay prerendered and fast, and nothing in `apps/web` changes. A publish reaches the site in the length of one build (minutes), which is fine for a few authors.
- **Later:** if publish latency matters, `apps/web` can fetch changed entities from the API at run time. That is a separate decision.

## DP-15: Studio app

- **Recommendation:** `apps/studio`, a Vite + React SPA with `@cloudflare/vite-plugin`, served from Workers static assets with `not_found_handling = "single-page-application"`. Use a typed client router; TanStack Router is likely, but its fit with Cloudflare is unverified.
- **Why:** Next's static export does not support dynamic routes without `generateStaticParams()`, nor cookies or redirects. An authenticated editor with `/entities/:id/edit` would fight that. A Vite SPA has no such limits.
- **Note:** this is a second frontend framework in the repo. It is accepted because the studio has no prerendering needs.

## DP-16: Shared rendering code

- **Recommendation:** extract in two steps.
  - **Phase 2 start (decided 2026-11-04):** `packages/entity-view` (the board, its pieces and the media renderers they use). The studio's board editor renders the real board, so there is no separate preview.
  - **Later:** `packages/field` (the engine), only if field placement moves from the 2D plan into the 3D field.
  - **With the media registry (step 6):** `packages/media`, the media renderer registry.
- **Why:** the board editor and field placement editor must show what the site shows. A copy would drift.
- **Cost:** [packages/README.md](../../packages/README.md) warns the field engine is not extractable without an interface. This is the largest refactor in the plan. Do it only when phase 2 starts, not in phase 0.

## DP-17: Monorepo tooling

- **Recommendation:** stay on pnpm workspaces with `pnpm --filter`, without Turborepo. Each app deploys from its own Workers Builds project with watch paths.
- **Why:** with three apps and just-in-time TypeScript packages there is little to cache. [ADR-0008](../decisions/adr/0008-pnpm-workspaces-monorepo.md) said to revisit at a second app with its own build. This is that revisit, and the answer is "not yet". Revisit when builds get slow or there are more than three packages.

## DP-18: Search and embeddings (phase 6)

- **Keyword search:** D1 FTS5 over the entity text, served by `apps/api`. Until then, the browser-side `?q=` search stays.
- **Text embeddings:** Workers AI. `bge-m3` (multilingual, USD 0.012 per million tokens) or `qwen3-embedding-0.6b`. Stored in Vectorize (GA; up to 1,536 dimensions; metadata filters; a corpus of this size costs well under USD 1 a month).
- **Hybrid search:** run FTS5 and Vectorize in parallel and merge the results in the API (reciprocal rank fusion). Vectorize has no keyword search of its own.
- **Images:** Workers AI has no CLIP-style image embedding model. Options:
  1. Caption each image with a vision model and embed the caption.
  2. Cloudflare AI Search (GA 2026-10-01): managed hybrid search with native image embeddings (Qwen3-VL). Unverified whether it exposes raw vectors and custom metadata filters.
  3. Compute CLIP or SigLIP vectors in the Container.
  - Decide with a short spike when phase 6 starts. The deciding question is whether raw vectors are available for the 2D projection.
- **Semantic layout:** UMAP (or PCA) runs as an offline job in the Container or as a local script. It writes coordinates as a `semantic` layout; pinned coordinates stay on top (decided 2026-11-04).

## DP-19: Visitor data

- **Recommendation:** the same D1 database, with one table per record kind (spaces, placements, journeys, notes).
  - A journey is a sequence of entity views (space, entity ids in order, times), small enough for a row ([DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md)).
  - Large payloads go to R2 with a pointer in the row: sketch images, which are data URLs today, and journey camera samples only if EXP-0010 earns them. Visitor uploads go to a separate prefix with quotas.
  - No Durable Objects unless real-time co-editing of a space is wanted. Durable Objects fit per-space live collaboration, not shared records.
- **Before launch:** retention periods, account deletion (cascade or anonymise), export, and moderation for public content ([backend.md](backend.md#authentication-and-authorization)).

## Plan: phase 0 deliverables

The phase 0 ADRs, written 2026-11-04 with status `proposed`. Once accepted, they win over this page.

1. [ADR-0012](../decisions/adr/0012-cloudflare-platform-d1-and-three-buckets.md): Cloudflare platform, D1 and the three buckets, starting on Free (DP-01, DP-02, DP-10).
2. [ADR-0013](../decisions/adr/0013-d1-master-with-r2-published-snapshot.md): D1 as master with an R2 published copy and a deploy hook. Supersedes ADR-0003 once accepted; ADR-0004 is unchanged (DP-03, DP-14).
3. [ADR-0014](../decisions/adr/0014-backend-with-writes-and-accounts.md): a backend with writes and accounts beside `apps/web`. ADR-0001 stays in force: it already expected a separate backend app (DP-07, DP-08, DP-09).
4. [ADR-0015](../decisions/adr/0015-better-auth-on-d1.md): Better Auth on D1 (DP-07).
5. [ADR-0016](../decisions/adr/0016-studio-as-vite-react-spa.md): studio as a Vite SPA, with the real board as the board editor (DP-15, DP-16).
6. [ADR-0017](../decisions/adr/0017-zod-schemas-hono-api-drizzle.md): schemas in `packages/core` with Zod, the API on Hono, Drizzle (DP-04, DP-05, DP-06).
7. [ADR-0018](../decisions/adr/0018-monorepo-tooling-revisited.md): monorepo tooling revisited, not changed; ADR-0008 stays (DP-17).

Work in phase 0, besides the records:

- Create `amorf-archive` and back up `originals/` (urgent: no copy exists today).
- Write the Zod schemas. They move into `packages/core` when `apps/api` is created at the start of phase 1, because a package needs a second consumer ([ADR-0008](../decisions/adr/0008-pnpm-workspaces-monorepo.md)).
- Define the canonical coordinate system: proposed in [DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md).
- Point the domains.
- Switch deploys to Workers Builds.

## Owner choices (answered 2026-11-04)

1. **Plan:** start on the Workers Free plan and upgrade to Paid when a limit is hit. See [Starting on Free](#starting-on-free).
2. **Auth:** Better Auth, run by us (DP-07).
3. **Domains:** only where needed. They are needed for sign-in. `*.workers.dev` is on the Public Suffix List (unverified), so a cookie cannot be shared between two `workers.dev` subdomains. Put `api.amorf.co` and `studio.amorf.co` on the zone we already own (free). Moving the site itself to `amorf.co` is optional and can wait.
4. **D1 as master:** yes. D1 is Cloudflare's managed SQL database (SQLite).
5. **Phase order:** left to the agent, with the goal of finishing soon. See [Fastest path](#fastest-path).

## Starting on Free

What the Free plan allows, from the research above. Items not researched are marked unverified.

- **D1:** 500 MB per database, 5 million rows read and 100,000 rows written a day (a hard error over the limit since 2026-09-01), 50 queries per request, 7 days of Time Travel. Enough for a few authors and a corpus of records.
- **R2:** 10 GB, 1 million writes and 10 million reads a month free. Today's media fits.
- **Workers:** 100,000 requests a day and 10 ms of CPU per request (unverified). The CPU limit matters for sign-in: password hashing can exceed 10 ms (unverified). Use magic links and passkeys, not passwords, while on Free.
- **Vectorize and Workers AI:** have free tiers, enough for a first semantic search.
- **Images:** 5,000 unique transformations a month, then an error (no bill) on Free.
- **Paid only:** Containers (ffmpeg, libvips, gltf-transform). Queues and Workflows on Free are unverified.

So phases 0 to 2 and rule-based spaces run on Free. Accept only web-ready uploads (as `entity-intake` makes them today) and make derivatives on the author's machine. Upgrade to Paid when heavy media processing (Containers) arrives, or when a D1 or CPU limit is hit.

## Fastest path

To finish soon, cut the scope and reorder:

1. **Phase 0, foundations:**
   - Records: ADR-0012 to ADR-0018 ([listed above](#plan-phase-0-deliverables)).
   - Schemas: the Zod schemas, moved to `packages/core` with `apps/api` in phase 1.
   - Archive: the `amorf-archive` bucket plus a backup of `originals/`.
   - Domains: `api.` and `studio.` set up.
2. **Phase 1, author core:**
   - API, auth and database: `apps/api` (Hono, Better Auth with magic link, D1).
   - Entities: create and edit with revisions, and a one-time import of the existing entities.
   - Studio: forms in `apps/studio`.
   - Upload and publish: direct upload of web-ready files; publishing writes the snapshot to R2 and calls the deploy hook.
3. **Phase 2, spatial authoring:**
   - Placement: pinned coordinates with the field as the default space.
   - Spaces: curated spaces.
   - Rendering: `apps/web` renders stored coordinates. The import computes today's hash-derived positions once and stores them as the field's first placements, so the field looks the same on the day it switches.
   - Studio editors: a top-down plan placement editor first. The full field preview (DP-16) comes later.
   - **Board editor**, per entity: the editor is the real entity board, rendered by the same code as the site and zoomed out, with editing handles on top. There is no separate preview; what the author arranges is what the visitor sees.
     - **Editing:**
       - Drag a piece to set `col` and `row`.
       - Resize it to set `w`, or `h` to crop.
       - Set `z`, `focal` and `narrow`.
       - Pin or unpin it.
     - **Output:** writes `layout.items` exactly as `entity.json` holds them today ([entity-view.md](entity-view.md)). Unpinned pieces keep packing radially around the pinned ones.
     - **Why the real board and not blocks:** heights are not authored. Text is measured at run time, and media height comes from width, aspect and caption. Plain blocks would show the wrong heights, while the real board shows the real ones. It also catches overlaps that `entities:check` can only approximate.
     - **Media in the editor:** the same renderer as the site's entity view, in a still mode:
       - Video shows its poster.
       - Audio shows its waveform.
       - 3D shows its poster.
       - A "play" toggle turns on live playback.
       - A media kind whose look on the site cannot be shown still (sound on approach, a live 3D view) gets a "view as visitor" toggle that switches the editor to full playback.
     - **Cost:** the entity view board and its pieces move to `packages/entity-view` at the start of phase 2 (DP-16). The field engine does not move; field placement stays a 2D plan.
4. **Rule-generated spaces:** a query over metadata. No new infrastructure.
5. **Visitor data:** accounts, saved and shared spaces and journeys.
6. **Media registry and heavy processing:** audio, document and embed renderers, deep zoom, 3D. This needs the Paid plan for Containers.
7. **Semantic search and layout.**

This is the minimum for "finished": steps 1 to 3, which replace the manual workflow and make coordinates real. Each later step ships on its own.

Shortcuts taken for speed:

- The placement editor is a 2D plan, not the 3D field. This defers the field-engine extraction.
- Cloudflare Access is skipped at first.
- No Containers until step 6.
