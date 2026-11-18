---
title: Deployment (Cloudflare Workers + R2)
updated: 2026-11-18
last_verified: 2026-11-18
status: live at https://amorf.amorf.workers.dev (site) and https://studio.amorf.workers.dev (studio, behind Cloudflare Access); media CORS issue open (see Known issue); commands run from the repository root with pnpm
---

# Deployment

## Shape

- The static export (`apps/web/out/`) is served by the Worker `amorf` using Workers static assets ([ADR-0001](decisions/adr/0001-static-export-on-cloudflare-workers.md); `apps/web/wrangler.jsonc`, `assets.directory = ./out`, `not_found_handling = "404-page"`).
- Media is served from the R2 bucket `amorf-media` at `https://media.amorf.co`.
- Cloudflare account: `Amorf` (id `d9a270a1f4adcaec08c276e75c0e52ed`). The login also sees a second account (`crafta.cc`), so every Wrangler command needs `CLOUDFLARE_ACCOUNT_ID=d9a270a1f4adcaec08c276e75c0e52ed` or the account is ambiguous. `apps/web/wrangler.jsonc` pins `account_id` for deploys.

## Deploy

Log in once with `pnpm --filter @amorf/web exec wrangler login`, then, from the repository root:

```
CLOUDFLARE_ACCOUNT_ID=d9a270a1f4adcaec08c276e75c0e52ed pnpm run deploy
```

`NEXT_PUBLIC_MEDIA_BASE` comes from `apps/web/.env.production` (and `apps/web/.env.development` for `pnpm dev`).

`pnpm run deploy` runs `pnpm run build && wrangler deploy` in `apps/web`. **`NEXT_PUBLIC_MEDIA_BASE` must be set for the build.** The `deploy` script does not set it, and the value is frozen into the JS at build time. A build without it points media at `/media/…` on the Worker, where the mp4 does not exist (it is excluded by `apps/web/public/.assetsignore`), so videos 404.

`pnpm preview` builds and runs `wrangler dev` locally.

The entity list and every `entity.json` are fetched from R2 during the build, and Next stores those responses in `apps/web/.next/cache/fetch-cache` for a year. The `build` script deletes that folder first, and `deploy` and `preview` go through `build`. Run `next build` directly and the field is built from the last cached copy: new entities get their own page but are missing from the field, and edits to existing ones do not show.

## Studio

The Worker `studio` (`apps/studio/wrangler.jsonc`) serves the studio SPA and its `/api` routes at `https://studio.amorf.workers.dev` ([ADR-0021](decisions/adr/0021-thin-studio-on-access-and-r2-before-the-backend.md)). Preview URLs are off. Bindings: `MEDIA` (`amorf-media`), `ARCHIVE` (`amorf-archive`), `ASSETS`.

- Deploy from the repository root: `pnpm studio:deploy` (type check, Vite build, `wrangler deploy`). The config pins `account_id`.
- **Sign-in fails closed.** Every request, assets included (`run_worker_first`), goes through `worker/access.ts`, which needs the Worker secrets `ACCESS_TEAM_DOMAIN` (`https://<team>.cloudflareaccess.com`) and `ACCESS_AUD` (the Access application's AUD tag). Without both, every request gets `403 Forbidden`.
- **Access setup (done 2026-11-18):** Zero Trust (Free), team `amorf-studio` (`https://amorf-studio.cloudflareaccess.com`). In the dashboard: Workers & Pages > `studio` > **Access** tab. That tab shows the Worker policy ("Manage access") and the application values (AUD tag, JWKS). The policy must list the three authors' emails; they live in Access only, never in the repository. The default policy allows all Cloudflare account members. If the Access application is ever recreated, its AUD changes: run `pnpm exec wrangler secret put ACCESS_AUD` from `apps/studio` with the new tag. Secrets apply without a redeploy.
- **Local:** `pnpm studio:seed` once (copies `index.json` and every `entity.json` from `media.amorf.co` into the simulated R2 under `apps/studio/.wrangler/state`; run it again to reset), then `pnpm studio:dev` (Vite with the Worker in workerd, http://localhost:5173). Local R2 is simulated: saves never reach the real buckets. Put `ACCESS_DEV_EMAIL=<any email>` in `apps/studio/.dev.vars` (gitignored) to sign in; the Worker honours it only on `localhost` or `127.0.0.1`.

## Local development

- `pnpm dev` reads `NEXT_PUBLIC_MEDIA_BASE` from `apps/web/.env.development` (`https://media.amorf.co`), so media loads from R2. Clear the variable to serve from `apps/web/public/`.
- The bucket's CORS rule allows `http://localhost:3000` only (plus the production origins). If port 3000 is taken, Next picks 3001 and CORS blocks the media. Free port 3000 or add the port to the rule.

## R2 bucket

- Upload (remote, 300 MiB limit per `put`):
  `CLOUDFLARE_ACCOUNT_ID=… pnpm --filter @amorf/web exec wrangler r2 object put amorf-media/<key> --file <path> --content-type <type> --remote`
  Without `--remote` the object goes to a local simulator, not the bucket. Keys sit at the bucket root, except entities (`entities/<id>/`), see [conventions/services-and-data.md](conventions/services-and-data.md).
- Public access is through the custom domain `media.amorf.co` (R2 → bucket → Settings → Custom Domains). Do not use the `r2.dev` URL for production; it is rate-limited and for testing only. The S3 endpoint `<account>.r2.cloudflarestorage.com` needs signed requests and cannot be used as a media base.
- CORS (inspect with `pnpm --filter @amorf/web exec wrangler r2 bucket cors list amorf-media`; set with `cors set --file <json>`):
  - Allowed origins on 2026-10-29: `http://localhost:3000`, `https://amorf.co`, `https://www.amorf.co`, `https://amorf.amorf.workers.dev`.
  - Methods `GET` (and `HEAD`). The JSON field for exposed headers is `exposeHeaders`, not `exposed`.
  - Add any new serving origin here, or audio through `spatial.ts` goes silent.

## Known issue: cached responses without CORS headers

`media.amorf.co` sits behind the Cloudflare cache. If a file is first fetched without an `Origin` header (a direct link, a `curl`, a plain image load), the edge can cache that response without `access-control-allow-origin` and serve it to later cross-origin requests, so the page fails with a CORS error even though the bucket rule is correct. Observed on 2026-10-29: the same jpg returned the header for `http://localhost:3000` but not for `https://amorf.amorf.workers.dev`.

Fixes, in the `amorf.co` zone dashboard (the Wrangler login has no cache-purge scope):
- Purge the two media URLs (Caching → Configuration → Purge Cache → Custom Purge).
- Permanent: a Transform Rule (Rules → Transform Rules → Modify Response Header) for hostname `media.amorf.co` that sets `Access-Control-Allow-Origin: *`. The media is public and requested without credentials, so this is safe. Alternatively, a Cache Rule that bypasses the cache for that host, at the cost of serving the 192 MB video from R2 every time.

Status: not confirmed fixed. Update this section when it is.

### Edge caching for media

Objects in the bucket already send `cache-control: public, max-age=31536000, immutable`, but responses showed `cf-cache-status: DYNAMIC` (checked 2026-11-01): the Cloudflare edge does not cache them, so every first view in a browser goes to R2. The entity view preloads pictures ahead of the reader, which makes edge hits matter. Fix, in the `amorf.co` zone dashboard (Caching → Cache Rules): a rule for hostname `media.amorf.co` set to "Eligible for cache" with "Respect origin TTL". Do this together with the CORS header rule above, so the cached copy carries `access-control-allow-origin`. Status: working (checked 2026-11-18): a `GET` answers `MISS`, then `HIT` on the second request, and an allowed origin gets its `access-control-allow-origin` header from the cached copy. A `HEAD` (`curl -I`) still shows `DYNAMIC`, so confirm with a `GET`: `curl -s -o /dev/null -D - -H "Origin: https://amorf.amorf.workers.dev" <media url> | grep -i "cf-cache-status\|access-control"`.

## Versioned deployments

Owner rule (2026-11-18): every release stays viewable at its own numbered address, `https://v<N>.amorf.workers.dev`. Versions are numbered in the order they were deployed, taken from the Worker's own history (`wrangler deployments list`, `wrangler versions list`); there are no Pages projects on the account.

- Cloudflare keeps every version of the Worker `amorf` and serves each one at its preview URL, `https://<first 8 characters of the version id>-amorf.amorf.workers.dev` (preview URLs are on by default; they send `x-robots-tag: noindex`). A version can only be given a name when it is uploaded, so the numbered address is a separate small Worker `v<N>` that forwards every request to that preview URL and keeps its own address in the browser bar.
- Make one with `CLOUDFLARE_ACCOUNT_ID=d9a270a1f4adcaec08c276e75c0e52ed pnpm --filter @amorf/web exec node scripts/version-alias.mjs <N> <version id>` (from the repository root). It uses the `global_fetch_strictly_public` compatibility flag, because a Worker may not otherwise fetch another Worker's workers.dev address on the same account (error 1042).
- `https://amorf.amorf.workers.dev` always shows the version currently deployed.
- Releasing: `pnpm run deploy` as usual, read the new version id from `wrangler deployments list`, run `version-alias.mjs` with the next number, and add the row below in the same session. Never reuse a number.
- Media on these addresses: plain `<img>` and `<video>` loads work, but anything fetched with CORS (WebGPU textures, audio through `spatial.ts`) is blocked, because the R2 CORS rule lists exact origins only. Fix once for every version with the `Access-Control-Allow-Origin: *` Transform Rule under Known issue, or add each `v<N>` origin to the CORS rule.
- Deploys so far were made from uncommitted working trees, so no commit is recorded for v1 to v8.
- Checked 2026-11-18: v4 to v8 answer 200 and serve the same HTML as their preview URLs.

| Version | Address | Source | Deployed (UTC) |
| --- | --- | --- | --- |
| v1 | https://v1.amorf.workers.dev | Worker `depth-field-poc`, renamed to `v1` in the dashboard (live version `839deeb2`) | 2026-08-21 11:32 |
| v2 | https://v2.amorf.workers.dev | Worker `amorf-poc-2`, renamed to `v2` (live version `a3672063`) | 2026-08-28 10:11 |
| v3 | https://v3.amorf.workers.dev | Worker `amorf-poc-3`, renamed to `v3` (live version `c398bcb7`) | 2026-09-03 18:03 |
| v4 | https://v4.amorf.workers.dev | `amorf` version `12e7a39b-3093-4fcb-bcfc-f27dc059c7a0` | 2026-10-29 19:04 |
| v5 | https://v5.amorf.workers.dev | `amorf` version `ba4d16e5-afae-44d8-8122-23b86a4ed108` | 2026-10-29 20:18 |
| v6 | https://v6.amorf.workers.dev | `amorf` version `86e61e8b-a293-45d4-a3f4-4330ca8df651` | 2026-11-05 21:20 |
| v7 | https://v7.amorf.workers.dev | `amorf` version `83af8e71-5253-4fea-9233-9aecd1f81681` | 2026-11-05 21:26 |
| v8 (live) | https://v8.amorf.workers.dev | `amorf` version `63e295a0-729c-4b8f-84d6-f4b52906b93d` | 2026-11-06 17:56 |

v1 to v3 are the proofs of concept made in the dashboard before this repository. Their earlier dashboard versions have no preview URL and cannot be shown, so each proof of concept counts as one version (its last). Next deploy: v9.

## Custom domain for the app

`amorf.co` is not yet attached to the Worker (Workers → `amorf` → Settings → Domains & Routes → Add → Custom domain). The CORS rule already allows `https://amorf.co` and `https://www.amorf.co`.

## Entities

Entity files live in gitignored `apps/web/content/entities/` and are published to R2 under `entities/<id>/` with `CLOUDFLARE_ACCOUNT_ID=d9a270a1f4adcaec08c276e75c0e52ed pnpm entities:sync`. `sync` first makes the small picture derivatives under `<id>/derived/` with ImageMagick 7 (`magick` must be on the PATH; [ADR-0020](decisions/adr/0020-small-picture-derivatives-at-publish.md)). Then `pnpm run deploy`: the page reads entities at build time ([ADR-0004](decisions/adr/0004-entities-loaded-at-build-time.md)). Experiment media would use the same bucket under `experiments/` (see [conventions/research-log.md](conventions/research-log.md)).

## What is not in git

`apps/web/content/` (entities and originals), `apps/web/public/entities/`, `apps/web/public/media/`, and `.wrangler/`. The ignore rules for these paths live in the root `.gitignore`. The GitHub repo is public: nothing that is entity content goes into git. Large originals live on the developer's disk and in R2. A fresh clone has no videos locally; point `NEXT_PUBLIC_MEDIA_BASE` at R2 to run it.
