# amorf

amorf is a design-research project with architects. Thesis: structure is the primary ornament (structural necessity, material properties, layout logic and honest joinery are the ornament); process matters more than the final artifact; decisions are backed by recorded reasoning. The repository holds the site, the research behind it and the decisions that shaped it. The GitHub repo is public: entity content and media never go into git.

## Layout

```
apps/web/     The site: Next.js 16 static export on Cloudflare (package @amorf/web)
apps/api/     Future backend app (not created yet)
packages/     Shared @amorf/* packages; empty until a second consumer exists (see packages/README.md)
research/     theory/, experiments/, portfolio/ (see research/README.md)
docs/         Conventions, decisions (ADR and DDR), design notes, templates, deployment
```

## Package manager and commands

pnpm workspaces; no Turborepo or Nx. Run from the repository root; scripts delegate to `@amorf/web`:

`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm run deploy`, `pnpm entities:check` (also `entities:probe`, `entities:sync`).

## Start at docs/vault-home.md

It indexes everything. Read the page that matches the task before changing code:

- Creating, moving or naming files or folders: `docs/conventions/folder-structure.md`. Group by feature (logic and view in one folder), not by kind of file.
- Adding or editing an entity (one folder under gitignored `apps/web/content/entities/<id>/` with an `entity.json`; never committed, published to R2): `docs/conventions/entities.md`. Say "entity", never "entry". Run `pnpm entities:check` after any change.
- Media URLs, env vars, entity data, anything that fetches: `docs/conventions/services-and-data.md`.
- Routes, images, server features, anything that could break `output: "export"`: `docs/conventions/next-16-static-export.md`.
- Colors, fonts, visual styling: `docs/conventions/styling.md`.
- Deploying, the R2 bucket, CORS, or missing media on the live site: `docs/deployment.md`.
- Commit messages and what may be committed: `docs/conventions/git.md`.
- Writing or superseding a decision record: `docs/conventions/decision-records.md`.
- Experiments and the research log: `docs/conventions/research-log.md`.

## Record decisions

- A significant technology choice gets an ADR in `docs/decisions/adr/`.
- A design, spatial or material choice gets a DDR in `docs/decisions/ddr/`.
- A study that answers a question gets an experiment in `research/experiments/`.
- Never edit an accepted record; supersede it. Index: `docs/decisions/README.md`.

## Next.js

`apps/web/AGENTS.md` holds the Next-specific rules, including the block `next dev` writes and re-adds. This Next has breaking changes from what you may know: read the guide in `apps/web/node_modules/next/dist/docs/` before writing Next code.

If the docs and the code disagree, fix whichever is wrong and bump `updated:` and `last_verified:` on the page.
