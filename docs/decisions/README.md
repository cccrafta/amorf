---
title: Decision records
updated: 2026-10-31
last_verified: 2026-10-31
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

## Design decision records

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| [DDR-0001](ddr/0001-raw-print-look-and-visual-tokens.md) | Use a raw print look, and keep every colour and font stack in tokens.css | accepted | 2026-10-29 |
| [DDR-0002](ddr/0002-entity-view-fixed-frame-and-board.md) | Build the entity view as a fixed frame over an authored board on a 12-column square grid | accepted | 2026-10-29 |

## How to add one

1. Copy `adr/0000-template.md` or `ddr/0000-template.md` to `NNNN-kebab-title.md`, where `NNNN` is the next number in that folder's own counter.
2. Fill it in with status `proposed`; set it to `accepted` once decided, with the date of the decision.
3. Add one row to the table above.
4. If it replaces an earlier record, follow the supersede steps in the convention page.
