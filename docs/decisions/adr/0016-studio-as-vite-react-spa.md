---
title: "ADR-0016: Build the studio as a Vite + React SPA in apps/studio, with the real entity board as its board editor"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0001, ADR-0008, ADR-0014, ADR-0017, DDR-0002]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0016: Build the studio as a Vite + React SPA in apps/studio, with the real entity board as its board editor

## Context and Problem Statement

Authors need an app to edit entity metadata, upload media, place entities in spaces and arrange each entity's board ([DDR-0002](../ddr/0002-entity-view-fixed-frame-and-board.md)). It is authenticated, has routes like `/entities/:id/edit` with ids known only at run time, and never needs prerendering. What is it built with, and how does the board editor show what visitors will see?

## Decision Drivers

- Authenticated, dynamic routes with no build-time data.
- The board editor shows exactly what the site shows. Board heights are not authored: text is measured at run time, and media height comes from width, aspect and caption.
- Shares React components and schemas with `apps/web`.
- Hosted on Workers, like the rest ([ADR-0012](0012-cloudflare-platform-d1-and-three-buckets.md)).

## Considered Options

- A Next app with `output: "export"`, like `apps/web`.
- A Next app on a server runtime.
- A Vite + React SPA served from Workers static assets.
- An off-the-shelf headless CMS.

## Decision Outcome

Chosen option: "Vite + React SPA", because the studio has no prerendering needs, and a static Next export does not support dynamic routes without `generateStaticParams()`, nor cookies or redirects.

- **App:** `apps/studio`, built with Vite and `@cloudflare/vite-plugin`, served from Workers static assets with `not_found_handling = "single-page-application"`, at `studio.amorf.co`. A typed client router (TanStack Router likely; its fit with Cloudflare is unverified).
- **Data:** calls `apps/api` through the typed `hc` client ([ADR-0017](0017-zod-schemas-hono-api-drizzle.md)) with the shared session cookie ([ADR-0015](0015-better-auth-on-d1.md)).
- **Board editor (WYSIWYG):** the editor is the real entity board, rendered by the same code as the site and zoomed out, with editing handles on top. There is no separate preview.
  - Editing sets `col` and `row` (drag), `w` and `h` (resize or crop), `z`, `focal`, `narrow`, and pinned or unpinned.
  - Output is `layout.items` exactly as `entity.json` holds them today. Unpinned pieces keep packing around pinned ones.
  - Media shows in a still mode (video and 3D posters, audio waveform), with a "play" toggle and a "view as visitor" toggle for kinds that cannot be shown still.
- **Shared code:** the entity view board, its pieces and the media renderers they use move to `packages/entity-view` at the start of phase 2, not before. The field engine stays in `apps/web`; field placement is edited on a 2D plan.

### Consequences

- Good: no fight with static-export limits; authored layout equals visitor layout, and overlaps show as they will on the site.
- Bad: a second frontend framework in the repository (Vite next to Next). Accepted because the studio has no prerendering needs.
- Bad: extracting `packages/entity-view` is real refactoring work at the start of phase 2.
- Neutral: phase 1 studio is forms only (metadata, upload, publish); the board editor and placement editor arrive in phase 2.

## Pros and Cons of the Options

- **Next static export:** every editor route would need `generateStaticParams()` or a catch-all workaround, with no cookies or redirects.
- **Next on a server runtime:** a server for an app with no server rendering needs.
- **Headless CMS:** covers metadata forms, but the board editor would still have to be built and integrated into it, so it saves little of the hard part. A hosted CMS also adds a vendor holding entity data.

## More Information

Research: [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-15, DP-16, "Fastest path" phase 2). Board model: [../../design/entity-view.md](../../design/entity-view.md). Package rule: [../../../packages/README.md](../../../packages/README.md).
