---
title: Entities and entity.json
updated: 2026-10-31
last_verified: 2026-10-31
status: entities in apps/web/content/entities/, synced to R2 with entities:sync, loaded by the app at build time (apps/web/lib/data/entities.ts)
---

# Entities and `entity.json`

An **entity** is one record in the field: a building, drawing, photograph, document, film, sound, material or fragment. Always say "entity", not "entry" or "object", in docs, folder names and new identifiers. (Legacy code identifiers `FieldObject` and `OBJECTS` keep their names until a rename is its own change.)

Each entity has one folder, and the folder has one metadata file, `entity.json`. The folder is the single place a person edits an entity.

## Where entities live: never in git

Entity metadata and media are **not committed and not pushed**: the GitHub repo is public. The source of truth is the R2 bucket `amorf-media`; the local working copy is gitignored ([ADR-0003](../decisions/adr/0003-entities-never-in-git.md)). Paths below are relative to the repository root.

```
apps/web/content/                  gitignored, on the editor's disk
  entities/<id>/                  everything about one entity, in one folder
    entity.json
    exterior-south-facade.jpg     web-ready media, published to R2 as entities/<id>/…
    walkthrough.mp4
    walkthrough-poster.jpg
    originals/                    untouched sources: full-size files, saved pages, notes. Never published.
  index.json                      written by entities:sync
  .sync-manifest.json             written by entities:sync; hashes of what is already in R2
docs/templates/entity.json        empty template (in git)
docs/templates/entity.schema.json JSON Schema (in git)
apps/web/scripts/entities.mjs      probe, check and sync (in git)
```

- **All content media belongs to an entity.** There is no shared media folder: a video, image or sound always sits in the folder of the entity it belongs to. `apps/web/public/media/` is retired; the interview video that was there is now the entity `souto-de-moura-interview`. `apps/web/public/` holds only site assets (favicon, icons).
- Do not put entities in `apps/web/public/`: everything there is copied into `out/` and deployed on the Worker. `apps/web/public/entities/` and `apps/web/public/media/` are gitignored as a guard.
- `originals/` inside each entity folder is the archive: sources as found (`template.txt` notes, saved web pages, full-resolution files). `entities:sync` publishes only the files `entity.json` lists, never `originals/`.

## Folder rules

Collection standards (IIIF, Europeana EDM, Smithsonian open-access records) keep one record per object with a list of media, and record each item's type in metadata, not in folder names. Hence:

- **One folder per entity, flat.** No `images/`, `video/`, `audio/` subfolders; `kind` and `mime` say what a file is. A subfolder is allowed only for a set that is one media item (an image sequence).
- `<id>` is a lowercase ASCII kebab-case slug (`kowloon-walled-city`), equal to the folder name and the `id` field. **An id never changes once published**: it is the R2 prefix and what other entities point to.
- **File names**: lowercase ASCII kebab-case, descriptive where possible (`exterior-south-facade.jpg`). No spaces, apostrophes or non-ASCII.
- **Files are immutable once published.** The CDN caches them long, so overwriting a name serves the old file for days. To replace one, add a new name (`exterior-south-facade-2.jpg`) and point `entity.json` at it.
- **Order is the order of `media[]`**, never a number in the file name.
- **Web formats only** are published: JPEG, PNG, WebP, AVIF, GIF, MP4 (H.264/AAC with `faststart`), MP3/M4A, PDF. Convert anything else (JPEG XL, MOV, WAV, TIFF) and keep the source in `originals/`.

## Workflow

1. Create `apps/web/content/entities/<id>/` and put sources in its `originals/` as found.
2. Copy [`docs/templates/entity.json`](../templates/entity.json) into it, fill in what you know. The template's `$schema` is `./entity.schema.json`, which resolves only beside the schema file; in the copy, point it at `../../../../../docs/templates/entity.schema.json` (five levels up from the entity folder) for editor validation.
3. Copy or convert the files to publish into the folder, renamed by the rules above, and list them in `media[]`.
4. `pnpm entities:probe` writes the generated fields (`mime`, `bytes`, `width`, `height`, `duration`). Never type them by hand.
5. `pnpm entities:check` must report 0 errors. It checks required fields, id equals folder, kebab-case names, `kind` values, referenced files exist, `related` ids exist, orphan files, stale generated fields, non-web formats, and `layout` (refs resolve, no overlap, nothing past `board.cols`; a warning when `title` or `meta` starts outside the entry frame, or a `media[].at` is still used).
6. `pnpm entities:sync` (with `CLOUDFLARE_ACCOUNT_ID` set, see `deployment.md`) runs the check, uploads changed files to `amorf-media/entities/<id>/`, and writes `entities/index.json`. Media get `Cache-Control: public, max-age=31536000, immutable`; `entity.json` and `index.json` get `max-age=60`.
7. Rebuild and deploy (`pnpm run deploy`): the page reads the entities at build time, so a deploy is needed to show changes.

Editors with JSON Schema support validate and autocomplete through the `$schema` line in each `entity.json`; `entities:check` does not read it.

## Fields

Required: `schema`, `id`, `title`, `kind`. Everything else is optional: **omit or leave empty what you do not know. Never invent a value.** The entity view leaves unknown fields out of its meta strip and facts drawer rather than showing placeholders.

| Field | Type | Meaning |
| --- | --- | --- |
| `schema` | number | Version of this convention. Currently `1`. |
| `id` | string | The slug; equals the folder name. |
| `title` | string | Display title. |
| `kind` | string | One of `building`, `drawing`, `photograph`, `document`, `film`, `sound`, `material`, `fragment`. The renderers pick plates and layouts from it. Adding a kind is a code change (`apps/web/components/field/plate.ts`). |
| `year` | string | Free text, not a number. Existing values: `1958`, `1921–1940`, `12th century`, `Safavid era`, `1907 (present structure)`. `apps/web/components/field/chronology.ts` parses these irregular forms. |
| `place` | string | Where it is or was made, as a short human place: `Montevideo, Uruguay`. |
| `creator` | string | Who made it: architect, painter, author, designer, recordist, archive. Shown as the entity's source. |
| `creatorRole` | string | `architect`, `painter`, `author`, `designer`, `photographer`, `composer`, … free text. |
| `client` | string | Commissioner. |
| `collaborators` | string[] | Engineers, studios and others who worked on it. |
| `program` | string | Type of program: `housing`, `public`, `religious`, … |
| `movement` | string | Movement or tendency, if any. |
| `materials` | string[] | `["brick", "concrete"]`. |
| `area` | string | Surface area with its unit, as written: `12,000 m²`. A string, because sources mix units. |
| `medium` | string | The medium of the work itself (`photograph`, `oil on canvas`, `model`). Distinct from `kind`. |
| `discipline` | string | `architecture`, `painting`, `music`, … |
| `thumbnail` | string | File name from `media[]` shown on the entity's card in the field. Image or video: a video plays on the card. Default: the first video, else the first image. |
| `description` | string[] | Paragraphs, in reading order. One array item per paragraph. |
| `tags` | string[] | Lowercase, kebab-case where they have several words. The first five are shown. |
| `links` | `{ label, url }[]` | External references (Vimeo, Wikipedia, an archive). |
| `related` | `{ id, reason }[]` | Other entities this one connects to, with a short reason. `id` must be another entity's id. Replaces the hand-kept association list. |
| `media` | object[] | The entity's media, in display order (see below). |
| `layout` | object | Authored placement in the entity view: `board`, `entry`, and `items` of `{ ref, col, row, w, h?, z?, narrow? }` on a 12-column grid of square modules. `ref` is `title`, `meta`, `p:<n>` or `media:<file>`. Omit it, or list only some pieces, and the rest are packed deterministically. Rules and defaults: [design/entity-view.md](../design/entity-view.md). |

### `media` items

Each item has exactly one of `file` or `embed`. Fields follow schema.org `MediaObject` and IIIF usage: `alt` and `caption` are separate, `credit` maps to `creditText`, `rights` is a URI.

| Field | Written by | Meaning |
| --- | --- | --- |
| `file` | you | File name in the entity folder. Never a URL or a path. |
| `embed` | you | `{ "provider": "vimeo" \| "youtube", "url": "…" }` for external video. Give it a local `poster`, so no third-party player loads until the reader asks. Web pages go in `links`, not here. |
| `kind` | you | `photograph`, `detail`, `material`, `drawing`, `video`, `audio`, `document`. |
| `caption` | you | Shown under the piece. |
| `alt` | you | For screen readers. Leave empty when the caption says the same thing. |
| `credit` | you | Photographer, author or archive. |
| `rights` | you | Creative Commons or rightsstatements.org URI, when known. |
| `source` | you | URL where the file was found. |
| `original` | migration | Source path inside the entity folder, `originals/…`. |
| `poster` | you | Poster image for a video or embed. |
| `focal` | you | `[x, y]` (0–1) point to keep in view when cropped. |
| `at` | you | Deprecated: use `layout.items`. `[x, y]` (0–1) placement, read only when `layout.items` does not list the file; `entities:check` warns. |
| `mime`, `bytes`, `width`, `height`, `duration` | `entities:probe` | Generated from the file; never typed. |

External video example: `{ "embed": { "provider": "vimeo", "url": "https://vimeo.com/185081713" }, "poster": "talk-poster.jpg", "kind": "video", "caption": "…" }`.

## Worked example

Built from the existing yakhchal record in `apps/web/lib/field-data.ts`. Unknowns are omitted, not guessed.

```json
{
  "schema": 1,
  "id": "yakhchal",
  "title": "Yakhchāl (یخچال), ice pit",
  "kind": "building",
  "year": "Safavid era",
  "place": "Iranian plateau",
  "creator": "unattributed",
  "materials": ["mud-brick"],
  "description": [
    "A conical mud-brick shell tapering to a capped apex, sunk over a pit deeper than it is tall. …"
  ],
  "tags": ["thermal-architecture", "civic-infrastructure", "mud-brick", "ritual", "desert-preservation"],
  "media": [
    { "file": "yakhchal-exterior.png", "kind": "photograph", "caption": "Exterior, conical mud-brick shell tapering to a capped apex, stepped courses visible." },
    { "file": "yakhchal-dome-oculus.jpg", "kind": "detail", "caption": "Interior dome and oculus, spiral brick coursing drawing light down into the pit." }
  ]
}
```

## How it maps to the current code

`apps/web/lib/field-data.ts` holds the records the app runs on today. Each `entity.json` field corresponds as follows, so converting is mechanical:

| `entity.json` | `FieldObject` | Note |
| --- | --- | --- |
| `id` | `id` | Existing ids are `o01`…`o12`; new entities use slugs. |
| `title` | `t` | |
| `kind` | `k` | |
| `year` | `y` | |
| `place` | `place` | |
| `creator` | `src` | `src` is shown as "source" in the entity view. |
| `description` | `p` | |
| `tags` | `tags` | |
| `media[].file`, `kind`, `caption`, `poster` | `media[].img` or `src`, `kind`, `cap`, `poster` | `file` becomes a URL through the media URL builder. |
| `media[].at` | `media[].at` | |
| `related` | `ASSOC` triples | `[id, other id, reason]`. |
| `client`, `collaborators`, `program`, `movement`, `materials`, `area`, `medium`, `discipline`, `links`, `creatorRole`, `media[].credit` | none | Stored for the record; nothing displays them yet. |

User notes (`notes`) are not part of `entity.json`. They are reader annotations, seeded separately (`NOTE_SEED`).

## From `template.txt`

The earlier plain-text `template.txt` fields map to JSON like this, and `entity.json` replaces it:

| `template.txt` | `entity.json` |
| --- | --- |
| YEAR | `year` |
| LOCATION | `place` |
| SURFACE AREA | `area` |
| TYPE OF PROGRAM | `program` |
| MOVEMENT | `movement` |
| MATERIAL | `materials` |
| ARCHITECT (or painter, author, designer…) | `creator` + `creatorRole` |
| CLIENT | `client` |
| COLLABORATOR | `collaborators` |
| MEDIUM | `medium` |
| DISCIPLINE | `discipline` |
| DESCRIPTION | `description` |
| LINK | `links` |

`id`, `title`, `kind`, `tags`, `related` and `media` are new: they are what the field needs to place and show the entity.

## Not yet built

- Showing `audio`, `document` and `embed` media in the field: they are stored but `apps/web/lib/data/entities.ts` skips them (no renderer yet).
- Deleting files from R2 when they are removed locally: `entities:sync` only uploads.
- Web derivatives (resized WebP/AVIF, small placeholder) generated from `originals/`. Today `apps/web/content/entities/` holds files as found, renamed; some are large PNG screenshots (up to 4.5 MB).

`mediaUrl()` (`apps/web/lib/media/url.ts`) already maps `/entities/<id>/<file>` to the R2 base, keeping the prefix.
