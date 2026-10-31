# amorf

amorf is a design-research project with architects. It starts from a claim: structure is the primary ornament. Structural necessity, material properties, layout logic and honest joinery are the ornament, so nothing is added for looks alone. It also holds that process matters more than the final artifact (failed experiments and trade-offs are kept), and that decisions are backed by recorded reasoning.

The site in `apps/web` is a spatial browser of research entities: buildings, drawings, photographs, films, sounds, materials and fragments. Alongside it the repository keeps the theory, experiments and decision records behind the work.

## Architecture

```
apps/web/     The site (Next.js 16, static export, package @amorf/web)
apps/api/     Future backend app
packages/     Shared @amorf/* packages, empty until a second consumer exists
research/     Theory, experiments, portfolio
docs/         Conventions, decision records (ADR and DDR), design notes, deployment
```

Entities (metadata and media) are not in this repository. They live in a Cloudflare R2 bucket and are read when the site is built.

## Stack

- Next.js 16 (App Router, `output: "export"`), React 19, Tailwind CSS 4, TypeScript
- Cloudflare Workers (static assets) for the site, R2 for media and entities
- pnpm workspaces; no Turborepo or Nx yet

## Quick start

Requires Node 20.9 or later and pnpm.

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build            # static export to apps/web/out
pnpm entities:check   # validate local entities (needs apps/web/content/)
```

A fresh clone has no entities or large media locally. The dev server reads `NEXT_PUBLIC_MEDIA_BASE` from `apps/web/.env.development` and loads published media from R2.

## Where things are

- Docs, start at [docs/vault-home.md](docs/vault-home.md)
- Decisions: [docs/decisions/README.md](docs/decisions/README.md)
- Research: [research/README.md](research/README.md)
- Commit and contribution conventions: [docs/conventions/git.md](docs/conventions/git.md)
