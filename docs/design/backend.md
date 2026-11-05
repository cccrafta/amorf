---
title: Backend (apps/api), scope and data inventory
status: planned
updated: 2026-11-04
last_verified: 2026-11-04
---

# Backend (apps/api): scope and data inventory

**Planned.** Nothing on this page is built. `apps/api` does not exist. The code is the source of truth for what exists; this page records what the backend is for and what it has to hold, so the epic can be split into decisions and work.

The rules stay in their own pages ([entities.md](../conventions/entities.md), [services-and-data.md](../conventions/services-and-data.md), the ADRs). Where this page disagrees with them, they win.

## Why a backend

Today the site has no server ([ADR-0001](../decisions/adr/0001-static-export-on-cloudflare-workers.md)). That decision rests on "no accounts, no writes, no request-time logic". Every part of the [ontology](../../research/theory/ontology/README.md) except the field itself is either authored by hand or held only in the visitor's browser memory and lost on reload. The ontology asks for the opposite: spaces made by visitors, journeys that are "saved, shared or revisited", coordinates that mean something, and a corpus of entities that can be added and edited. That is a data system, not a static page.

[ADR-0001](../decisions/adr/0001-static-export-on-cloudflare-workers.md) and [ADR-0008](../decisions/adr/0008-pnpm-workspaces-monorepo.md) already place backend work in a separate app, `apps/api`, leaving `apps/web` a static export. When it arrives, shared types move into `packages/core` ([packages/README.md](../../packages/README.md)).

## Inventory: each part, as it is today, and what the backend holds

State of the code on 2026-11-04 (branch `exp/0006-spaces`). Paths are under `apps/web/`.

### 1. Entity

- **Ontology:** a node of knowledge, a subject with metadata and media of any type. One entity appears in many spaces and journeys ([entity](../../research/theory/ontology/entity.md)).
- **Today:** one gitignored folder per entity with an `entity.json` ([schema](../templates/entity.schema.json)), published to R2 by `pnpm entities:sync`, read at build time by `lib/data/entities.ts` ([ADR-0003](../decisions/adr/0003-entities-never-in-git.md), [ADR-0004](../decisions/adr/0004-entities-loaded-at-build-time.md)). Authoring is a local folder, the `entity-intake` skill and `entities:check`. A change reaches the site only after sync, rebuild and deploy.
- **The schema also carries:** `related[]` (the graph edges between entities, with a reason) and `layout` (authored placement inside the entity view).
- **Backend holds:** the corpus. Create, edit and publish entities. Upload media to R2 and generate derivatives. Validate with the same rules as `entities:check`. Manage entity types (backlog: one generic entity, each type adds fields) and relations.
- **Open:** does the site keep reading entities at build time (the API triggers a rebuild on publish) or start reading them at request time?

### 2. Coordinates

- **Ontology:** entities sit at coordinates in the field; proximity should mean something. Open: what the axes mean, and who places (a curator, the metadata, or both) ([coordinates](../../research/theory/ontology/coordinates.md)).
- **Today:** not data. Field position is computed in `Field.tsx` from a hash of each id over a `ceil(sqrt(N))` grid, so every entity moves when an entity is added or removed. Nothing can be pinned or authored. Backlog item "Place by coordinate" is unbuilt.
- **Backend holds:** placements. Because one entity appears in many spaces, a coordinate belongs to the pair (space, entity), not to the entity. The field is one space, so its coordinates are placements too.
- **Proposed:** [DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md), plan `x` and `z` in world units per (space, entity), with pins.
- **Needs first:** one canonical coordinate system. Table positions today are percentages of a table whose size is measured from the viewport (`table.ts`), and the space floor maps them linearly (`spaces.ts` `floorAt`). Stored coordinates must not depend on a screen.

### 3. Set aside (table, catalogue)

- **Today:** `state.table` (entity ids in order) plus `tablePos` (`{ x, y }` in percent per id). Memory only, except under `?spaces=` where `localStorage` key `amorf.space` keeps ids and positions. "Bind it" turns the table into a named walk with a layout in `state.seeded` (memory only) and opens the catalogue.
- **Backend holds:** a visitor's working set across reloads and devices, and bound sets as saved spaces.
- **Open:** is the table one per visitor, or can a visitor keep several?

### 4. Space

- **Ontology:** a field with a specific set of entities at specific coordinates. A journey is also a space. Since 2026-11-04, a space is made by the visitor from the table ([space](../../research/theory/ontology/space.md), [EXP-0006](../../research/experiments/0006-thresholds-between-spaces/README.md)).
- **Today:** there is no space record. A space is the current table mapped to a floor at run time. Atmosphere (fog) is a constant, not per space. No name, owner or address. The URL cannot carry it.
- **Backend holds:** a space record: id, name, owner, kind, members with canonical coordinates, optional order, atmosphere, visibility, created and updated dates.
- **Proposal, not decided:** one record family for the field, author-curated spaces, visitor spaces (bound tables) and journeys, since the ontology says they are all spaces. They differ in who made them and whether order matters.

### 5. Journey and walks

- **Ontology:** the recorded path of discovery; save, share, walk again, tailor (add or remove nodes) ([journey](../../research/theory/ontology/journey.md)). [EXP-0010](../../research/experiments/0010-journey-as-montage/README.md) also records camera views for replay.
- **Today:** `state.trace` holds the visited sequence of the session (id, depth). "Leave the walk" names it into `state.seeded`. Memory only. No timestamps, dwell or camera path. `/walks/<slug>` exists as a route but only resolves seeded walks, and `SEEDED_WALKS` is empty.
- **Backend holds:** journey records: ordered steps with time, optionally camera samples, name, owner, visibility, and edits (a tailored journey).
- **Decided 2026-11-04 (owner):** a journey is the visitor's sequence of entity views: the space plus entity ids in order, with times. No coordinates of its own and no camera samples unless EXP-0010 earns them. See [DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md).
- **Open:** what is recorded, for how long, and where (privacy). Is a tailored journey still a record of discovery?

### 6. Traces and notes

- **Today:** a full note model exists (`FieldNote` in `types.ts`: entity, author, walk, text, SVG stroke marks, a sketch as a data URL), but `TRACES_ENABLED = false` (`notes.ts`) hides it. Notes are memory only. The backlog item "Specify traces" leaves storage open.
- **Backend holds, if traces are public:** note records, sketch images as files in R2 (not data URLs), author, and moderation.

### 7. Wear, visits and kept

- **Today:** visit counts, `kept` flags and "wear" (attention that pulls an entity closer in the field, `wear.ts`) are memory only and per session.
- **Open:** is wear personal, or does the field wear from every visitor together? Shared wear is a backend aggregate; personal wear can stay in the browser.

### 8. Archive

- **Ontology:** conventional, structured browsing of the same entities ([archive](../../research/theory/ontology/archive.md)). Open: what it classifies by.
- **Backend need:** possibly none. Filtering and search over `index.json` can run in the browser at the present corpus size. It needs the API only for server-side search or for spaces and journeys made by others.

### 9. Identity and roles

- **Today:** none. The only author is whoever has R2 credentials.
- **Needed by:** everything above that is owned, shared or written. At least two roles: author (writes the corpus) and visitor (writes their own spaces, journeys and notes). Options run from an anonymous device id with share links to real accounts.

### 10. Stays in the browser

- `localStorage` `amorf.scroll` (scroll and turn sensitivity). A per-device preference; no backend.

## Media storage

The ontology says an entity carries media "of any number of types: image, film, sound, 3D models, text". Today there is one storage shape: a public bucket for files a person prepared by hand. The backend has to hold several kinds of media, and each kind needs different storage, processing, visibility and lifetime.

Today ([entities.md](../conventions/entities.md), [research-log.md](../conventions/research-log.md), [deployment.md](../deployment.md)):

- One R2 bucket, `amorf-media`, public through `media.amorf.co`. Entity media sit under `entities/<id>/`, experiment and study media under `experiments/EXP-NNNN/` and `studies/STU-NNNN/`, and legacy keys at the root.
- Published formats are JPEG, PNG, WebP, AVIF, GIF, MP4 (H.264/AAC, `faststart`), MP3/M4A and PDF. Derivatives are made on the author's machine (ImageMagick, ffmpeg) during intake. A published file name never changes.
- Uploads go through `wrangler r2 object put`, which accepts up to 300 MiB per `put`.
- Audio that feeds Web Audio needs CORS-mode requests ([services-and-data.md](../conventions/services-and-data.md)), and the bucket's CORS rule is a known issue.
- The loader currently drops `audio`, `document` and `embed` items when it builds `FieldObject` (`lib/data/entities.ts`), so they are stored but not shown.

### Kinds of media and what each needs

| Kind | Today | What the backend has to decide |
| --- | --- | --- |
| Image | Web derivative ≤ 2400 px, public | Processing on upload (where it runs; Workers cannot run ImageMagick). Deep zoom tiles (IIIF-style) for drawings and plates that the entity view zooms into. |
| Video | Progressive MP4 with a poster, public | Progressive or adaptive streaming (HLS, Cloudflare Stream). Multipart upload above 300 MiB. |
| Audio | MP3/M4A allowed, not rendered | CORS for spatial audio. Stored and published, but it also has to play in the field. |
| 3D model | Not supported | Format (glTF/GLB, compressed), size limit, a poster or preview, loading in the field. |
| Document | PDF allowed, not rendered | Whether to show pages as images, or link to the PDF. |
| Text | Lives in `entity.json` (`description`) | Stays a record, not a file. |
| External embed | Vimeo or YouTube URL with a local poster | Not stored. Only the poster is stored. |
| Originals | `originals/` on the author's machine only, gitignored, never uploaded | Private storage. Today the full-resolution sources and licensed files have no backup and no second copy. |
| Drafts and uploads | `raw_entities/draft/`, local only | A private staging area where uploads wait until they are published. |
| Research media | Same public bucket | `publish: false` in an experiment's frontmatter does not make its media private: a public bucket serves any key to anyone who knows it. |
| Visitor-made | Sketches as data URLs in memory (`FieldNote.img`) | A separate area for files that visitors upload, with quotas, moderation, retention and deletion. |
| Journey recordings | Not recorded | Camera samples for [EXP-0010](../../research/experiments/0010-journey-as-montage/README.md) are data (a record), not video, unless a replay is rendered. |
| Generated | `index.json` written by sync | Share previews (an image per space or journey), derivatives, indexes. Generated on publish or on request. |

### Tiers this implies

1. **Public, immutable:** published media behind the CDN (`media.amorf.co`). This is today's bucket.
2. **Private archive:** originals and licensed sources, never public, readable only by the author.
3. **Staging:** uploads and drafts before they are published, private.
4. **Visitor content:** files visitors make, kept apart from the corpus so they can be moderated, limited and deleted.
5. **Records:** structured data (spaces, placements, journeys, notes and possibly entity metadata) in a database, not as files.

## CMS (authoring)

Backlog: "Add and edit entities" and "Place by coordinate". Today an author edits `entity.json` by hand or with the `entity-intake` skill, runs `entities:check` and `entities:sync`, and then rebuilds and deploys. Only someone with the repo checked out and R2 credentials can author. The project is made "with architects", so more than one author is expected.

### What it has to edit

| Area | What an author does | Notes |
| --- | --- | --- |
| Metadata | Create an entity, edit its fields, choose its type | Forms generated from the schema. Entity types (backlog) make the schema per type. Validation is the same code as `entities:check`, shared through `packages/core`. |
| Media | Upload, order, caption, credit, set rights, choose the thumbnail, set the focal point | Uploads go to staging, are processed, and are published (see [Media storage](#media-storage)). A published file name never changes, so a replaced file is a new file. |
| Entity view layout | Place pieces on the 12-column board (`layout.items`) | A spatial editor, not a form ([entity-view.md](entity-view.md), [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md)). |
| Field coordinates | Place an entity in the field or in a curated space by dragging it on the plan | A spatial editor. Writes placements (space, entity, coordinate), see [Coordinates](#2-coordinates). |
| Relations | Add `related` links with a reason; accept or reject suggested links | Suggestions can come from embeddings (see [Search](#semantic-search-and-embeddings)). |
| Curated spaces | Make a space, choose members, arrange them, set atmosphere | The same space record that visitors make. |
| Moderation | Review notes and spaces that visitors made public | Only if visitor content is public. |

### Workflow it implies

- **Draft, review, publish.** An entity has a draft state and a published state. Publishing either triggers a rebuild of `apps/web` or makes the change live through the API (open question 5).
- **Revisions are kept.** The manifesto says process over artifact and that superseded decisions stay. A CMS that overwrites in place contradicts it. Keep each published revision, with who changed what and when.
- **Intake inside the CMS.** The `entity-intake` skill (research, captions, tags, relations proposed by a model and checked by an editor) can become a server step on upload. Its hard rule stays: no invented values, and every fact keeps its source.
- **Roles.** At least owner, editor and contributor (a contributor submits drafts and cannot publish).

### Build or adopt

- **Adopt a headless CMS** (Payload, Directus, Sanity and similar). Metadata forms, roles, drafts and revisions come built in. The two spatial editors (board layout, field placement) still have to be built, and the hosted options move the source of truth off R2, which reverses [ADR-0003](../decisions/adr/0003-entities-never-in-git.md)'s premise of R2 as the store.
- **Git-based CMSs** (Decap, Tina, Keystatic) are ruled out: entities never go into git.
- **Build a studio** (a separate app, for example `apps/studio`, against `apps/api`). Everything is shaped to the field and the board, but forms, roles and revisions are work too.
- Either way the spatial editors are custom, because they are the part of the project nobody else has.

## Semantic search and embeddings

Planned for later. Today search is a `?q=` query in the URL, matched in the browser against loaded entities.

### What embeddings could serve

1. **Semantic search.** "Timber shells over an open floor" finds entities by meaning, not by matching words. Best results come from hybrid search: keyword (full-text) and vector, merged.
2. **Multimodal search.** Image embeddings (a CLIP-style model) let a visitor search by what a picture shows, or start from an image and find similar ones. Most entity knowledge is in the media, not the text.
3. **Related suggestions.** Nearest neighbours propose `related` links to the author in the CMS, who accepts them and writes the reason. The rule that a relation names a concrete shared idea stays.
4. **Coordinates from meaning.** The ontology asks what the axes mean and says proximity should mean something ([coordinates](../../research/theory/ontology/coordinates.md)). Projecting embeddings to 2D (UMAP or similar) gives a semantic layout of the field, where near means similar. A curator can then pin or move entities. This is a design choice that deserves an experiment, not only a feature.
5. **Spaces and archive.** Clustering proposes curated spaces or archive categories. A visitor's space or journey can be embedded too, as "find spaces like mine".

### What it needs

- **Text prepared for embedding:** per entity, a document built from title, type, facts, description, tags and captions. Per media item, the image itself.
- **An embedding pipeline:** run on publish and on edit, store the model name and version with each vector, and re-embed everything when the model changes. Embeddings are derived data: rebuildable, never the source.
- **A vector store:** Cloudflare Vectorize with Workers AI models keeps everything on the existing account. Postgres with pgvector is the alternative if the records end up in Postgres.
- **A search endpoint** in `apps/api` (`apps/web` is static, so search at request time has to be an API call), plus the full-text index for the keyword half.
- **Privacy:** visitors' search queries are behavioural data, like journeys.

## Generated spaces (future)

A thought, not a plan yet. Today a space is made by hand: by a visitor from the table, or by a curator. A space could also be generated. The ontology's open question "who makes a space" ([space](../../research/theory/ontology/space.md)) then gets a third answer: a rule, or a prompt.

### From a rule (predetermined)

- A space defined by a query over metadata: one architect (`creator`), one entity type, a movement, a material, a place, a period, a tag. "Every work by Lina Bo Bardi" or "everything in rammed earth".
- Needs only structured metadata and the space record. No embeddings. It can come before semantic search.
- Membership is either **live** (the query reruns, so a new entity appears in the space when it is published) or a **snapshot** (fixed at the moment it was made, then curated by hand).
- Coordinates come from a layout rule, for example year along depth or place across the floor, or a default packing. A curator can pin members over the rule.

### From a word or prompt (later)

- A visitor or author types "thresholds" or "how timber meets stone". Semantic search picks members. A model can rerank them, write one line on why each belongs, and propose an order, which makes the space a journey.
- Coordinates come from projecting the members' embeddings, so near means similar inside the generated space.
- Needs the embeddings pipeline first ([Semantic search and embeddings](#semantic-search-and-embeddings)).
- Model output changes when the model or the corpus changes. Store the prompt, the model and version, the date and the resulting members, so a generated space can be revisited as it was. This is the project's own rule: keep the reasoning behind the result.
- The no-invented-values rule from intake applies: a model may choose and explain from what entities say, never add facts.

### What it adds to the space record

`source`: `manual`, `rule` or `prompt`. For `rule`, the query and whether it is live. For `prompt`, the prompt, the model and version, and the generated date. Members and placements stay the same shape for every source, so the field walks a generated space like any other.

## Presentation as data: spaces, entity display, media renderers

The records above say *what* is there. A second layer says *how it shows*. To scale, this layer follows one rule: **data declares, code renders.** A record names a registered kind and gives settings. The code owns a registry of kinds, each with its implementation. Adding a new way to show something means adding one entry to a registry and one schema, never a special case in the field or the entity view. Unknown kinds fall back to something that always works (a poster, a plate), so old clients never break on new data.

There are three registries: space environments, entity templates and themes, and media renderers. Their types and schemas live in `packages/core`, so `apps/api`, the studio and `apps/web` validate the same shapes. Each config carries a `version`, like `layout.version` today.

### Space environment: how a field shows

- **Today:** the field and the EXP-0006 space are the same engine with constants. The field is a wrapping torus (`TILE` 6200) with dark fog and no floor. The space is a bounded floor (`SPAN_X`, `SPAN_Z`) with its own fog (`--space-room-fog`) and a threshold (`blend` or `gate`). Positions are computed, not stored (see [Coordinates](#2-coordinates)).
- **The field is a space.** It is the default space, with every published entity, and the same record as any other space. What differs between spaces is the environment config, not the engine.
- **A space record then holds three things:**
  1. Members and placements (entity, coordinate, optional order).
  2. A **layout**: `pinned` (stored coordinates only), a rule (`by-year`, `by-place`, `grid`, `radial`), or `semantic` (projected embeddings). Pins always win over the rule.
  3. An **environment**: topology (`wrap` like the field, or `bounded` like a room), bounds, atmosphere (fog colour and density, later ground, light and ambient sound), threshold kind for entering and leaving, camera limits and movement settings, and the card style for thumbnails.
- **Atmosphere values come from tokens or named presets**, not free colours, so a space stays inside the raw print look ([DDR-0001](../decisions/ddr/0001-raw-print-look-and-visual-tokens.md), [styling.md](../conventions/styling.md)).
- EXP-0006 to EXP-0009 test which environment settings matter (thresholds, vantage point, oblique approach, circuit or cul-de-sac). Their results decide which fields the environment schema gets. Add a field when an experiment earns it, not before.

### Entity display config: how an entity view shows

- **Today:** one template places every entity. Pieces are registered by kind ([EXP-0004](../../research/experiments/0004-entity-template-pieces/README.md)). The board layout is authored per entity (`layout`). Colours and type are global tokens.
- **Proposed `display` block on an entity:**
  - `template`: a registered template name (`default`, `drawing-set`, `sound-piece`, `document`). The default can depend on the entity type, so a building and a sound recording open differently without per-entity work.
  - `theme`: a registered theme name (paper, ink, dark), plus a small set of overrides chosen from token values: background, ink, accent, and one of the registered type recipes. No raw CSS and no arbitrary fonts. Otherwise every entity drifts into its own design system, and the shared structure (the grid, the frame) stops being visible.
  - `layout`: the board placement that exists today, unchanged.
  - Optional `field` hints: how its card shows in the field (still or playing, aspect, sound on approach).
- **Templates and themes are code**, registered and reviewed. The studio offers them as choices with a preview. A new template is a design decision and gets a DDR.

### Media renderers: how each medium shows

- **Today:** a medium is `file` or `embed` with a `kind`. The loader keeps images and video and drops `audio`, `document` and `embed` (`lib/data/entities.ts`). There is no 3D.
- **Proposed:** each media item names a **media kind**. Each kind is one registry entry with five parts:
  1. **Schema:** the kind's own settings. A 3D model has `format` (`glb`), `poster`, `scale`, `up`, default camera, `lod[]` and `environment`. Audio has `spatial`, `loop`, `gain` and a waveform. A sequence has frames and `fps`.
  2. **Processor** (backend): what happens on upload. A model is compressed (Draco or Meshopt), a poster is rendered and the size is checked. Audio gets a loudness check and a waveform. An image gets derivatives and deep-zoom tiles.
  3. **Renderers** (web), one per context: `card` (thumbnail in the field), `piece` (in the entity view), `full` (focused or fullscreen). A context a kind does not implement falls back to its poster.
  4. **Capabilities:** what it needs (WebGL, Web Audio with CORS, autoplay rules) and its cost. The field uses these to budget how many live renderers run at once, and to follow the media loading rule: layout before load, lazy loading, prefetch neighbours.
  5. **Fallback:** always a poster, so an unknown or failed kind still shows.
- **Kinds to expect:** `image`, `image-tiled` (deep zoom), `video`, `video-stream`, `audio`, `model` (3D), `panorama` (360°), `point-cloud`, `sequence`, `document`, `embed`, `text`. Phase 1 needs only the kinds in use today. The registry is what makes the others cheap later.
- **3D in the field:** a model renders as its poster on the card until the visitor comes close or opens the entity. Only then is the live WebGL view loaded, with a cap on how many run at once.

### What this means for the backend

- The API stores these configs as validated JSON on the space and entity records, and never interprets them. Rendering stays in the clients.
- The studio builds its editors from the same registries. It shows each kind's settings form, previews it with the real renderer and lists only registered templates and themes.
- Processors run in the media pipeline (see [Media storage](#media-storage)). A kind without a processor is published as uploaded.

## Authentication and authorization

Wanted (2026-11-04): users and admins, with a third-party provider allowed.

### Split the two

- **Authentication (who you are)** goes to a third-party identity provider. It owns sign-in, passwords or passkeys, social login, email verification and sessions. The site never stores a password.
- **Authorization (what you may do)** stays in our database. Roles and ownership live in `apps/api`, keyed by the provider's user id. The provider can then be swapped without migrating permissions, and the rules sit next to the data they protect.

### Roles

| Role | Can |
| --- | --- |
| Visitor (no account) | Walk the field and public spaces, use the table and journeys locally in the browser. |
| User | Everything a visitor can, plus save spaces, journeys and notes to the account, share them by link or make them public, and see them on any device. |
| Author | Use the studio: create and edit entities, media, coordinates and curated spaces, and submit for publishing. |
| Admin | Everything an author can, plus publish, manage users and roles, moderate public visitor content, and change site-wide config. |

Two kinds of rule: a role check (can this person use the studio?) and an ownership check (is this space theirs?). Visibility on each visitor record (`private`, `link`, `public`) decides who can read it. A contributor role (submit drafts only) can be added between user and author later.

### How it fits a static site

- `apps/web` stays a static export. Sign-in runs in the browser through the provider's client SDK. The browser sends the provider's token (a JWT) with each API call.
- `apps/api` verifies the token on every request against the provider's public keys (JWKS), looks up the role in its own table and checks ownership. No session state is needed in the Worker.
- The studio uses the same sign-in and also requires the author or admin role. It can additionally sit behind Cloudflare Access as a second gate.
- **Anonymous first:** nobody needs an account to walk the site. When a visitor signs up, what they kept in the browser (table, spaces, journeys) moves into the account.

### Options

- **Hosted provider (Clerk, WorkOS AuthKit, Auth0, Supabase Auth, Firebase Auth):** least work, prebuilt sign-in UI, issues JWTs that a Worker can verify. User emails and profiles are held by the provider, which then processes personal data on the project's behalf (GDPR: check the region and the data processing agreement). Check current pricing at decision time.
- **Library in our own Worker (Better Auth, with D1):** no third party, all data stays in the Cloudflare account, but we run sign-in, email delivery and security fixes ourselves.
- **Cloudflare Access only:** fine for a handful of studio authors, not for public users. Usable as the studio's extra gate.
- **Recommendation:** a hosted provider for identity, with roles in our own database. Choose between Clerk and WorkOS AuthKit in an ADR, on EU data residency, free-tier limits and how well the SDK works in a static Next export.

### Consequences

- Accounts are personal data. Users need to be able to export and delete their data, and deleting an account deletes or anonymises their spaces, journeys and notes.
- Public visitor content needs moderation tools for admins before it is switched on.
- This is the point where ADR-0001's "no accounts, no writes" premise ends for the system. `apps/web` stays static, but the system no longer is. Record that in an ADR.

## Cross-cutting constraints

- **Public repo.** No secrets, entity content or visitor data in git. Credentials live in Cloudflare secrets.
- **R2 stays the store for entity media** ([ADR-0002](../decisions/adr/0002-large-media-in-r2.md)).
- **`apps/web` stays a static export.** Routes are prerendered, so anything a visitor makes (a shared space, a journey) is fetched by the client from the API, under a route shape that a static export can serve.
- **Privacy.** Journeys and wear are behavioural data. Retention and consent need deciding before anything is recorded.
- **Shared types.** Entity, space, placement and journey types move to `packages/core` when `apps/api` is created.

## Shape and phases

Proposed 2026-11-04, not decided. Each phase becomes decision records and backlog items before it is built. The stack choices for these parts, with the research behind them, are in [backend-decisions.md](backend-decisions.md).

### Parts

| Part | What it is |
| --- | --- |
| `apps/api` | Cloudflare Worker: records in D1, media in R2 (by tier), auth checks, publishing; search later. |
| `apps/studio` | The authoring app for the owner and a few authors: forms, media upload, board editor, field placement editor, spaces editor, revisions. |
| `apps/web` | Stays a static export. Reads published entities and spaces; later fetches visitor and shared data from the API. |
| `packages/core` | Types, schemas, validation (the `entities:check` rules), registry schemas, the canonical coordinate system. |
| Media pipeline | One processor per media kind (derivatives, posters, compression), off the request path. |

Records: entity (with type and revisions), media item (with kind), space (members, placements, layout, environment, source), journey, note, user and role. Embeddings come later and are derived data.

### Phases

0. **Foundations.** ADRs for hosting and storage, the studio app, the identity provider and the end of ADR-0001's "no writes" premise. Extract `packages/core`. Define the canonical coordinate system and the space record. Do now, because it is cheap: a private bucket for `originals/`, which have no backup today.
1. **Author core.** `apps/api` with sign-in and roles, entity create and edit with revisions, upload to staging then publish, studio forms, and migration of the existing entity folders. Publishing writes JSON to R2 and triggers a rebuild of `apps/web`.
2. **Spatial authoring.** The field becomes the default space with pinned coordinates. Curated spaces. The board editor. `apps/web` renders stored coordinates instead of hash-computed ones.
3. **Presentation registries.** Media kinds (audio, document and embed first, then deep zoom, then 3D), entity display config, space environment config.
4. **Rule-generated spaces** (by architect, type, material). No embeddings needed.
5. **Visitor data.** User accounts, saved and shared tables, spaces and journeys, privacy and retention, moderation.
6. **Semantic.** Embeddings, hybrid search, related suggestions, semantic layout, spaces generated from a prompt.

Phases 0 to 2 are the backend's minimum: they replace the manual intake and sync workflow and make coordinates real. Phases 3 to 6 build on them and can be reordered; visitor data can move ahead of the registries if journeys matter more.

## Open questions for this epic

1. Who writes first: the author (corpus, coordinates, curated spaces) or the visitor (table, spaces, journeys)? This sets phase 1.
2. Visitor identity: anonymous with share links, or accounts? **Answered 2026-11-04:** accounts (users and admins) through a third-party provider, and anonymous walking stays open. See [Authentication and authorization](#authentication-and-authorization).
3. Are visitor spaces and journeys private, shared by link, or public in the field for others to walk?
4. Do coordinates come from a curator, from metadata axes, or both?
5. Entities at build time or request time once an API exists?
6. Is wear personal or collective?
7. Hosting: recommended Cloudflare Workers with D1 (records), R2 (media) and possibly Durable Objects, since the account and bucket are already there. Needs an ADR.
8. Does visitor-written data supersede ADR-0001's "no writes" premise for the system? Needs a record either way.

9. Where do originals live: a private R2 bucket, a private prefix with no public route, or elsewhere?
10. Where does media processing run: on the author's machine as today, Cloudflare Images and Stream, or a container or queue worker?
11. Which media kinds come in the first phase: are 3D models and streamed video in or out?
12. Can visitors upload files at all, or only make records (placements, journeys, strokes)?
13. Does entity metadata stay as `entity.json` files in R2, or move into the database with R2 holding only media?

14. CMS: adopt a headless CMS for forms, or build a studio app? Either way, the board and field-placement editors are built. **Answered 2026-11-04:** build a studio app against `apps/api`. Needs an ADR.
15. Who are the authors: you alone, a few architects, or contributors who submit for review? **Answered 2026-11-04:** the owner and a few authors first. A contributor role can come later.
16. Should publishing make a change live at once (the API serves entities) or after a rebuild?
17. Search: text only first, or multimodal (images) from the start?
18. Should the field's coordinates come from embeddings (semantic layout), from a curator, or from both, with the curator able to pin? This could be an experiment under `coordinates`. **Answered 2026-11-04:** both, in order. Pinned coordinates set by authors come first; an embedding layout may follow later, with pins kept over it.
19. Generated spaces: should a rule-based space be live or a snapshot by default? Which metadata fields can a rule use?
20. Entity theme: how far can an entity depart from the shared look? Named themes only, or token-limited overrides as proposed? Needs a DDR, since it touches [DDR-0001](../decisions/ddr/0001-raw-print-look-and-visual-tokens.md).
21. Does the field's environment (torus, fog, card style) become data that authors can change, or stay in code as the default preset?
22. Which media kinds come after the current ones: 3D models first, or deep-zoom images and audio, which are already in the corpus?
23. Identity provider: Clerk or WorkOS AuthKit (hosted), or Better Auth (self-run)? Decide on EU data residency, cost and static-export fit. Needs an ADR. Users and admins are wanted and a third party is allowed (2026-11-04).
24. Can users make their spaces and journeys public from the start, or only private and shared by link until moderation exists?

Each answered question becomes an ADR, a DDR or a backlog item, and is linked here.
