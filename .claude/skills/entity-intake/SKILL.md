---
name: entity-intake
description: Turn submissions in raw_entities/draft/ into publishable amorf entities under apps/web/content/entities/<id>/ (web-ready media, originals kept, entity.json filled from cited research and from looking at the images), or enrich an existing entity with the same research. Use when the user asks to process, intake, import or publish drafts or submissions, or to enrich, caption, tag or relate an existing entity.
model: opus
---

# Entity intake

A draft is a folder in `raw_entities/draft/` (repository root, gitignored), named after its subject and holding images as found, sometimes a `template.txt` or other notes. Intake turns it into one entity folder in `apps/web/content/entities/<id>/` that `pnpm entities:check` accepts and `pnpm entities:sync` can publish to R2. Rules: `docs/conventions/entities.md` (fields, naming, formats, workflow) and `docs/templates/entity.schema.json`. If this skill and those pages disagree, the pages win; fix this skill.

The thesis the context is written against: structure is the primary ornament (structural necessity, material properties, layout logic and honest joinery), process matters more than the artifact, decisions carry recorded reasoning. Source: `AGENTS.md`, `research/theory/`.

## Modes

- `intake [<draft name> ...]`: process the named drafts, or every folder in `raw_entities/draft/` when none is named.
- `enrich <id> [...]`: run Research, Captions and Relations on an existing entity. Never rename, replace or remove a published media file (names are immutable once in R2). Never rewrite human-written text: add missing fields and paragraphs, and show the diff before saving.

## Hard rules

- **Never invent a value.** Every fact (year, place, creator, client, collaborators, area, program, movement, materials, medium) comes from a source you opened, or from the draft's own notes. Without one, omit the field. A caption describes only what the image shows.
- Notes in the draft (`template.txt`, `*.txt`, `*.md`) are the editor's word: they win over research. Record any disagreement in `intake.md`; do not silently overwrite them.
- Nothing from `raw_entities/` or `apps/web/content/` goes into git. Never `git add` these paths.
- Never run `pnpm entities:sync`, deploy, move draft folders or edit another entity's `entity.json` without the user saying yes in chat, after the report (see Finish).

## 1. Plan the batch (main thread)

1. List the drafts. For each, propose `id` (lowercase ASCII kebab-case, from the subject, not the folder's noise: `Waterloopbos, Flevoland` becomes `waterloopbos`), `title` (an `_` in a folder name usually stood for `:`), and `kind` (`building`, `drawing`, `photograph`, `document`, `film`, `sound`, `material`, `fragment`).
2. Check that each id is not already used by a folder in `apps/web/content/entities/`. On a clash, ask whether this is the same entity (then use `enrich`) or needs another id.
3. Kind is code-facing (it picks plates and layouts). Choose by what the record is: built work or a typology of them is `building`; prints, plates and plans are `drawing`; a magazine, a book or a page set is `document`; furniture and other made objects are `fragment`. When two fit equally, ask in one question for the whole batch, then go on.
4. Read once and pass on to each worker: every existing entity's `id`, `title`, `kind`, `tags` and first description paragraph (for related and tag reuse), and the tag vocabulary already in use.

## 2. One worker per draft

For a batch, launch one `general-purpose` agent per draft with `model: "opus"`, up to four at a time, in one message so they run in parallel. Give each its draft path, its id, title and kind, the existing-entity summary from step 1.4, and this file's path, telling it to follow sections 3 to 7. For a single draft, do the work in the main thread. Each worker returns only the short report from section 7. Workers never run `entities:probe` or `entities:check`: probe rewrites every entity's `entity.json`, so parallel runs race. The main thread runs both once, after the last worker.

## 3. Media

1. Make `apps/web/content/entities/<id>/originals/` and copy every draft file into it unchanged, with its original name. The originals are never published.
2. Look at every image (Read it). Drop exact duplicates (same SHA-1) and near-duplicates that add nothing, such as the same shot at another size; note which ones you dropped.
3. Name each published file in lowercase ASCII kebab-case after what it shows (`exterior-south-facade.jpg`, `plate-31-jellyfish.jpg`, `cover-november-1971.jpg`). Names are unique within the entity and never carry an order number for its own sake.
4. Convert every image to a web derivative. Never upscale:
   ```sh
   magick "<original>[0]" -auto-orient -colorspace sRGB -resize '2400x2400>' -strip -interlace Plane -quality 82 "<id folder>/<name>.jpg"
   ```
   ImageMagick misreads some names before `[0]` (a comma, for one): convert a copy with a plain temporary name instead. A screenshot that only has transparent padding around an opaque image gets the padding trimmed and becomes JPEG. Use `.webp` (same flags, `-quality 82`) instead when the image uses transparency (`magick identify -format '%[opaque]'` prints `False`). Copy an animated GIF unchanged. Video: H.264/AAC MP4 with `-movflags +faststart`, and a poster JPEG from a representative frame. Flag any result over 1.5 MB, and any image under 800 px on its long edge (usable, but never the thumbnail).
5. Order `media[]` for reading: the strongest overall view first, then views that explain the structure (section, plan, joint, material), then the rest. Set `original` to `originals/<file>`. Set `thumbnail` to the strongest image at 800 px or more.

## 4. Research

Aim for accuracy over coverage.

1. Search the web for the subject. Prefer primary and institutional sources: the architect's or artist's office, a museum or archive record (Het Nieuwe Instituut, MoMA, Vitra, RKD, Europeana), a heritage register, the publisher, peer-reviewed or monographic writing. Use Wikipedia to find leads and cite what it cites where possible. Open every page you use; never cite a search snippet.
2. Fill a field only when a source states it. When sources disagree, use the better source, and record both in `intake.md`.
3. `year` is free text as the sources give it (`1970`, `1921–1940`, `1899–1904`). `place` is short and human (`Flevoland, Netherlands`). `creator` and `creatorRole` together (`Verner Panton`, `designer`). `area` keeps its unit as written. `materials` is an array of plain nouns.
4. Put every source you relied on into `links` as `{ "label": "<publisher or site: page title>", "url": "…" }`, best first.
5. File names and the draft are evidence too: `foto_jan_kempenaers`, `EstebanSchimpf_2022` and `Tim-Smith` name a photographer, so they can go into that item's `credit`, noted as "from file name" in `intake.md`. Set `source` only to a URL you know the file came from. Set `rights` only when a source states it.

## 5. Description and context

`description` is an array of paragraphs, 2 to 4 of them, in the plain, declarative voice of the existing entities (read two of them first). No marketing adjectives and no superlatives that a source does not support.

1. **What it is:** what, who, when, where and why it was made, from the sources.
2. **Context:** read the work in the project's terms. Say what holds it up and how, what the material does and allows, the layout logic, where the joints and the making show, and what process or constraint produced the form. Anchor every claim in something a source says or an image shows, and name it (the image, the section, the joint). Interpretation is allowed. Unsupported fact is not.
3. Optional: what happened to it since (reuse, ruin, restoration, reception), when sourced.

The context paragraphs are drafted by the model. `intake.md` marks them so, and the editor accepts, changes or removes them before sync.

## 6. Captions, tags, relations

- `caption` for every media item: what the image shows, plainly (`Visiona 2, 1970: stepped upholstered landscape in red and orange, visitors seated within it.`). Add the date or place of the photograph only when sourced. `alt` only when it would say something the caption does not. `kind` per item: `photograph`, `detail`, `material`, `drawing`, `video`, `audio`, `document`.
- `tags`: 4 to 8, lowercase kebab-case. Reuse the existing vocabulary first, then add what the thesis needs to find it again: structural system (`shell`, `cantilever`, `timber-frame`), material, program or typology, period or movement, and one of the field's own themes where it fits (`threshold`, `landscape-as-structure`). The first five show, so put the most telling first.
- `related`: 0 to 3 existing ids, each with a concrete reason that names the shared structural, material or spatial idea (`"Both make the roof the whole building: a single timber shell over an open floor."`). None is better than a weak one. Propose reverse links on the other entities in the report; do not write them.
- Omit `layout`: the default radial board places the pieces.

## 7. Write and report (worker)

1. Write `entity.json` with `"$schema": "../../../../../docs/templates/entity.schema.json"`, `"schema": 1`, the fields above, and no empty strings for unknowns (leave them out). Never type `mime`, `bytes`, `width`, `height` or `duration`.
2. Write `originals/intake.md` (never published): the date, the draft path, a table of `field | value | source URL | note` for every filled field, conflicts between sources, which description paragraphs are model-drafted context, credits taken from file names, the files you dropped and why, size flags, and open questions for the editor.
3. Return in at most 12 lines: id, kind and why, the media count and thumbnail, the fields you filled, the fields you left empty, the flags, the proposed reverse links. Return nothing else.

## Finish (main thread)

1. Run `pnpm entities:probe`, then `pnpm entities:check`. Fix every error the check reports and rerun until it reports 0 errors.
2. Report to the user per entity, briefly: id, title, kind, media count, thumbnail, filled and empty fields, flags, and the path to its `intake.md` so they can review the sources and the drafted context.
3. Ask, as separate yes or no questions, and act only on a yes:
   - Publish with `pnpm entities:sync`, which uploads to the public R2 bucket. A rebuild and deploy (`pnpm run deploy`) is still needed to show it; never run that yourself.
   - Move each processed draft folder from `raw_entities/draft/` to `raw_entities/published/`.
   - Add the proposed reverse `related` links to the other entities.
4. Do not commit.
