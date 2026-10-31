---
title: amorf docs vault
updated: 2026-10-31
last_verified: 2026-10-31
---

# amorf docs

Start here. Read only the page that matches the task; each page is self-contained.

| Page | Read it when |
| --- | --- |
| [conventions/folder-structure.md](conventions/folder-structure.md) | creating, moving or naming a file or folder; deciding where code belongs; the monorepo layout |
| [conventions/entities.md](conventions/entities.md) | adding or editing an entity, its folder, its `entity.json`, its media, or the probe and check scripts |
| [conventions/services-and-data.md](conventions/services-and-data.md) | touching media URLs, env vars, entity data, or anything that fetches |
| [conventions/next-16-static-export.md](conventions/next-16-static-export.md) | adding a route, a server feature, an image, or anything that might break `output: "export"` |
| [conventions/styling.md](conventions/styling.md) | changing colors, fonts or any visual styling; adding a color or a type recipe |
| [conventions/git.md](conventions/git.md) | writing a commit message, choosing a scope, or deciding what may be committed |
| [conventions/decision-records.md](conventions/decision-records.md) | deciding whether something needs an ADR, a DDR or an experiment; superseding a record |
| [conventions/research-log.md](conventions/research-log.md) | creating or updating an experiment, its frontmatter, tags or media |
| [decisions/README.md](decisions/README.md) | finding why something is the way it is; the index of every ADR and DDR; adding a record |
| [design/entity-view.md](design/entity-view.md) | changing the entity view: fixed frame, tools drawer, authored placement, edge-to-neighbour navigation (built) |
| [deployment.md](deployment.md) | deploying, changing the bucket, CORS, the domain, or debugging missing media on the live site |
| [../research/README.md](../research/README.md) | working on theory, experiments or the portfolio; what the project claims and has tried |

## What this project is

amorf is a design-research project with architects. Its thesis: structure is the primary ornament (structural necessity, material properties, layout logic and honest joinery are the ornament), process matters more than the final artifact (failed experiments and trade-offs are kept), and decisions are backed by recorded reasoning. Theory is in [../research/theory/manifesto.md](../research/theory/manifesto.md).

- A pnpm workspaces monorepo ([ADR-0008](decisions/adr/0008-pnpm-workspaces-monorepo.md)): `apps/web` (the site), `packages/` (empty until a second consumer exists), `research/`, `docs/`. A backend app (`apps/api`) is expected later.
- `apps/web` is Next.js 16 App Router, exported as static files (`output: "export"`), served by a Cloudflare Worker (static assets). One page (`app/page.tsx`) renders the `Field` client component, a spatial browser of entities. There is no server code and no API.
- Large media and all entities live in a Cloudflare R2 bucket, not in git.
- Package manager is pnpm. Run commands from the repository root (`pnpm dev`, `pnpm build`, `pnpm entities:check`); they delegate to `@amorf/web`.

## Repo facts

- Git remote: `origin` is `git@github-personal:cccrafta/amorf.git`. The `github-personal` alias in `~/.ssh/config` selects the `cccrafta` key. Commit identity is set per repo (`cccrafta`). Commit rules: [conventions/git.md](conventions/git.md).
- Next.js here is **not** the version most training data describes. Before writing Next code, read the matching guide in `apps/web/node_modules/next/dist/docs/` (see `apps/web/AGENTS.md`).

## Rules of this vault

- These pages record conventions and decisions. The code is the source of truth for what exists; if a page and the code disagree, fix whichever is wrong and bump `updated:` and `last_verified:`.
- A convention page states how; a decision record states why. Accepted records are never edited; see [conventions/decision-records.md](conventions/decision-records.md).
- Pages marked **Target** or **Planned** describe something not yet built. Do not assume it exists.
