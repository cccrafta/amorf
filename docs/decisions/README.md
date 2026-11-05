---
title: Decision records
updated: 2026-11-05
last_verified: 2026-11-05
---

# Decision records

Technology decisions are ADRs, design, spatial and material decisions are DDRs. Format is MADR 4. When to write one, the lifecycle and the numbering rules: [../conventions/decision-records.md](../conventions/decision-records.md).

## Architecture decision records

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-0001](adr/0001-static-export-on-cloudflare-workers.md) | Serve a static export from Cloudflare Worker static assets, with no server code | accepted | 2026-10-29 |
| [ADR-0002](adr/0002-large-media-in-r2.md) | Keep large media in R2 behind media.amorf.co, never in git | accepted | 2026-10-29 |
| [ADR-0003](adr/0003-entities-never-in-git.md) | Keep entities out of git; R2 is the source of truth | accepted | 2026-10-29 |
| [ADR-0004](adr/0004-entities-loaded-at-build-time.md) | Load entities at build time from a Server Component | accepted | 2026-10-29 |
| [ADR-0005](adr/0005-media-base-and-media-url.md) | Read NEXT_PUBLIC_MEDIA_BASE literally, build media URLs with mediaUrl(), use CORS-mode requests | accepted | 2026-10-29 |
| [ADR-0006](adr/0006-turbopack-no-custom-webpack.md) | Use Turbopack and no custom webpack configuration | accepted | 2026-10-29 |
| [ADR-0007](adr/0007-group-code-by-feature.md) | Group code by feature, with a barrel only at a feature's index.ts | accepted | 2026-10-29 |
| [ADR-0008](adr/0008-pnpm-workspaces-monorepo.md) | Use a pnpm workspaces monorepo without Turborepo or Nx | accepted | 2026-10-31 |
| [ADR-0009](adr/0009-decision-records-madr.md) | Record decisions with MADR, separate ADR and DDR counters, never edit accepted records | accepted | 2026-10-31 |
| [ADR-0010](adr/0010-scripts-live-with-what-they-operate-on.md) | Keep repo-level scripts in root scripts/, app scripts in their app | accepted | 2026-11-01 |
| [ADR-0011](adr/0011-file-research-under-ontology-parts.md) | File research under ontology parts, with studies and a generated index | accepted | 2026-11-01 |
| [ADR-0012](adr/0012-cloudflare-platform-d1-and-three-buckets.md) | Run the backend on Cloudflare Workers, with D1 in the eu jurisdiction and three R2 buckets, starting on the Free plan | proposed | 2026-11-04 |
| [ADR-0013](adr/0013-d1-master-with-r2-published-snapshot.md) | Make D1 the master copy of entities, publish an R2 snapshot, and rebuild the static site by deploy hook (supersedes ADR-0003 once accepted) | proposed | 2026-11-04 |
| [ADR-0014](adr/0014-backend-with-writes-and-accounts.md) | Add a backend with writes and accounts; keep apps/web a static export with no server code | proposed | 2026-11-04 |
| [ADR-0015](adr/0015-better-auth-on-d1.md) | Run sign-in with Better Auth inside apps/api, on D1, with magic links and passkeys | proposed | 2026-11-04 |
| [ADR-0016](adr/0016-studio-as-vite-react-spa.md) | Build the studio as a Vite + React SPA in apps/studio, with the real entity board as its board editor | proposed | 2026-11-04 |
| [ADR-0017](adr/0017-zod-schemas-hono-api-drizzle.md) | Define schemas with Zod 4 in packages/core, build the API with Hono and @hono/zod-openapi, and query D1 with Drizzle 0.45.x | proposed | 2026-11-04 |
| [ADR-0018](adr/0018-monorepo-tooling-revisited.md) | Keep pnpm workspaces without a task runner after adding apps/api and apps/studio | proposed | 2026-11-04 |
| [ADR-0019](adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md) | Use three.js for the field's ground, on by default with ?gl=0 as the opt-out | proposed | 2026-11-05 |

## Design decision records

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| [DDR-0001](ddr/0001-raw-print-look-and-visual-tokens.md) | Use a raw print look, and keep every colour and font stack in tokens.css | accepted | 2026-10-29 |
| [DDR-0002](ddr/0002-entity-view-fixed-frame-and-board.md) | Build the entity view as a fixed frame over an authored board on a 12-column square grid | accepted | 2026-10-29 |
| [DDR-0003](ddr/0003-placements-in-plan-units-per-space.md) | Place entities by stored plan coordinates per space, in world units, with pins that never move | proposed | 2026-11-04 |

## How to add one

1. Copy `adr/0000-template.md` or `ddr/0000-template.md` to `NNNN-kebab-title.md`, where `NNNN` is the next number in that folder's own counter.
2. Fill it in with status `proposed`; set it to `accepted` once decided, with the date of the decision.
3. Add one row to the table above.
4. If it replaces an earlier record, follow the supersede steps in the convention page.
