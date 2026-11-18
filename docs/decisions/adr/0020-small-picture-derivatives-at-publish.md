---
title: "ADR-0020: Make small picture derivatives at publish time, in entities:sync"
status: proposed
date: 2026-11-15
deciders: [owner]
supersedes:
superseded-by:
related: [ADR-0002, ADR-0004, ADR-0019, EXP-0019, DDR-0005]
updated: 2026-11-15
last_verified: 2026-11-15
---

# ADR-0020: Make small picture derivatives at publish time, in entities:sync

## Context and Problem Statement

The forms lab (`/lab/forms`, EXP-0014 to EXP-0018) draws every picture into a 256² texture layer, but it fetched the full published picture each time. At start it requests every entity's cover and up to nine satellite pictures: 169 requests and 72.6 MB for 34 entities (measured from `entity.json` on 2026-11-15). The owner found the load slow and asked for the fix to start on the publish side. The site is a static export with no server ([ADR-0001](0001-static-export-on-cloudflare-workers.md)), and `apps/api` does not exist yet.

## Decision Drivers

- Bytes on the wire should match what is drawn: a 256² layer needs a picture whose short edge is 256 px.
- No server, no paid image service, and no new npm dependency for one script.
- Every derivative URL must be safe to cache forever, like the media it comes from.
- A published `entity.json` must never name a file that is not in the bucket.

## Considered Options

- Derivatives at publish time, made by ImageMagick in `entities:sync`, recorded in `entity.json`.
- Cloudflare image transformations on request (resize by URL).
- Derivatives at `next build`.
- A KTX2 (Basis) texture array of the whole field at once.

## Decision Outcome

Chosen option: derivatives at publish time in `entities:sync`, because it needs no server or paid service, runs on the machine that already holds the files, and gives immutable names.

- `entities.mjs derive` (also run at the start of `sync`) writes `<id>/derived/<stem>.<hash10>.<tier>.webp` for each media item's picture (a video's poster, any other item's file) and records it in `media[].derived`. `<hash10>` is the first ten hex digits of the SHA-1 of the source bytes and the tier's ImageMagick arguments, so a changed picture or a changed recipe gets a new name and no key is ever rewritten.
- One tier for now: `s256`, short edge 256 px, long edge at most 512 px, WebP quality 80, never upscaled, ICC profile kept. The 34 entities give 176 files, 2.8 MB in total.
- A picture that fails to derive keeps no `derived` field and the lab loads the full picture.
- `sync` uploads an entity's derivatives before its `entity.json`.
- The lab loads `media[].derived.s256` when present and the full picture otherwise. Derivative fetches use the normal browser cache; full pictures keep `cache: "reload"` (see [../../deployment.md](../../deployment.md), Known issue).

### Consequences

- Good: the lab's start load drops from 72.6 MB to about 2.8 MB with no change to the scene code.
- Good: the derivative names are immutable, so they take the same one-year cache as the media.
- Bad: publishing needs ImageMagick 7 (`magick`) on the machine that runs `sync`.
- Bad: the request count stays at 169. If the request count, not the byte count, decides the load time, the atlas option comes back (EXP-0019 measures this).
- Neutral: R2 keeps old derivatives after a picture changes, as it keeps old media; `sync` only uploads.

## Pros and Cons of the Options

- Image transformations on request: no publish step, but it is a paid feature on the zone, every size is a new edge request, and the CORS and edge-cache issues in [../../deployment.md](../../deployment.md) apply to each variant.
- At `next build`: the build only fetches JSON ([ADR-0004](0004-entities-loaded-at-build-time.md)), and the files are not in the repository; it would download every original on each build.
- KTX2 texture array: one request and GPU-compressed layers, but it needs a Basis encoder (not installed) and a transcoder in the page, and one file per field means any entity change rebuilds it. Kept as the next step if EXP-0019 shows the request count is what decides the load.

## More Information

Operational rules: [../../conventions/entities.md](../../conventions/entities.md) (generated field `derived`, the `derive` step). Evidence: [EXP-0019](../../../research/experiments/0019-field-load-from-small-derivatives/README.md). Backend row: [../../design/one-world-many-cameras.md](../../design/one-world-many-cameras.md), Backend needs.
