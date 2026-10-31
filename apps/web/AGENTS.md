<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web app (`@amorf/web`)

Static Next.js export (`output: "export"`) served by a Cloudflare Worker (`wrangler.jsonc`, assets from `./out`).

Commands, from the repo root:

- `pnpm --filter @amorf/web dev` (also `pnpm dev`)
- `pnpm --filter @amorf/web build`: static export to `apps/web/out`
- `pnpm --filter @amorf/web lint`
- `pnpm --filter @amorf/web run deploy`: build + `wrangler deploy` (writes to Cloudflare; use `run`, plain `pnpm deploy` is a pnpm builtin)
- `pnpm --filter @amorf/web entities:check`: validate every entity (also `entities:probe`, `entities:sync`)

Entities live in `apps/web/content/` (gitignored, never commit; published to R2).

`@/*` resolves to `apps/web/*`. Conventions: `../../docs/vault-home.md`.
