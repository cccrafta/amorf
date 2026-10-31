---
title: Next 16 and static export constraints
updated: 2026-10-31
last_verified: 2026-10-31
status: summarised from the Next docs bundled in node_modules; re-check against the installed version when upgrading
---

# Next 16 and static export constraints

`apps/web/next.config.ts` sets `output: "export"` and `images.unoptimized` ([ADR-0001](../decisions/adr/0001-static-export-on-cloudflare-workers.md)). `next build` writes static files to `apps/web/out/`, and Cloudflare serves that directory. Doc paths below are relative to `apps/web/node_modules/next/dist/docs/` (these docs ship with the installed Next, so they match the version in use). Next-specific agent rules are in `apps/web/AGENTS.md`.

## What `output: "export"` does not support

From `01-app/02-guides/static-exports.md`:

- Dynamic routes without `generateStaticParams`, and `dynamicParams: true`.
- Route Handlers that depend on the request. A GET handler must set `export const dynamic = "force-static"`.
- Cookies, rewrites, redirects, headers, and `proxy.ts` (the Next 16 name for middleware).
- Server Actions, ISR, Draft Mode, intercepting routes.
- The default `next/image` loader. Use `images.unoptimized` (set) or a custom loader.

If a task needs one of these, it needs a different deployment mode. Stop and discuss before adding it.

## Rules that follow

- **Client components are prerendered at build time.** Touch `window`, `document`, `AudioContext` and media elements only in effects or event handlers, never at module scope or during render (`static-exports.md`, "Browser APIs").
- **A Server Component's `fetch` runs at build time**, not per visit.
- **Env values are frozen at build.** `NEXT_PUBLIC_MEDIA_BASE` must be set when `next build` runs (`01-app/02-guides/environment-variables.md`).
- **`'use client'` marks a module-graph boundary**, and needs to sit only on the entry a Server Component renders. Push it down to the smallest interactive component when new components are added (`01-app/01-getting-started/05-server-and-client-components.md`).
- **`server-only` / `client-only`** packages are optional; Next handles the imports itself. There is no server here, so they are not needed.

## Next 16 differences from 13–15

- `middleware` is now `proxy`.
- Turbopack is the default for `dev` and `build`; a custom `webpack` config fails the build (`01-app/02-guides/upgrading/version-16.md`). This repo uses Turbopack with no custom webpack ([ADR-0006](../decisions/adr/0006-turbopack-no-custom-webpack.md)).
- `params` and `searchParams` are async.
- Node 20.9 or later is required (the repo develops on Node 26).
- `experimental.turbopack` moved to a top-level `turbopack` option. In the pnpm workspace, Turbopack must resolve the repository root (where `pnpm-lock.yaml` sits), so `turbopack.root` is set explicitly in `apps/web/next.config.ts`; without it Turbopack can pick the wrong root or warn about a lockfile outside the app. Workspace packages that export TypeScript (`packages/*`, none yet) are transpiled by Turbopack without extra configuration.

## Not verified

- Whether `cacheComponents` is compatible with `output: "export"`. Leave it off.
- Cloudflare Workers specifics are community-sourced (the Next docs only link Cloudflare's own guide, `01-app/01-getting-started/17-deploying.md`). `deployment.md` records what this repo actually runs.
