---
title: Deployment (Cloudflare Workers + R2)
updated: 2026-10-31
last_verified: 2026-10-31
status: live at https://amorf.amorf.workers.dev; media CORS issue open (see Known issue); commands run from the repository root with pnpm
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

`pnpm run deploy` runs `next build && wrangler deploy` in `apps/web`. **`NEXT_PUBLIC_MEDIA_BASE` must be set for the build.** The `deploy` script does not set it, and the value is frozen into the JS at build time. A build without it points media at `/media/…` on the Worker, where the mp4 does not exist (it is excluded by `apps/web/public/.assetsignore`), so videos 404.

`pnpm preview` builds and runs `wrangler dev` locally.

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

## Custom domain for the app

`amorf.co` is not yet attached to the Worker (Workers → `amorf` → Settings → Domains & Routes → Add → Custom domain). The CORS rule already allows `https://amorf.co` and `https://www.amorf.co`.

## Entities

Entity files live in gitignored `apps/web/content/entities/` and are published to R2 under `entities/<id>/` with `CLOUDFLARE_ACCOUNT_ID=d9a270a1f4adcaec08c276e75c0e52ed pnpm entities:sync`. Then `pnpm run deploy`: the page reads entities at build time ([ADR-0004](decisions/adr/0004-entities-loaded-at-build-time.md)). Experiment media would use the same bucket under `experiments/` (see [conventions/research-log.md](conventions/research-log.md)).

## What is not in git

`apps/web/content/` (entities and originals), `apps/web/public/entities/`, `apps/web/public/media/`, and `.wrangler/`. The ignore rules for these paths live in the root `.gitignore`. The GitHub repo is public: nothing that is entity content goes into git. Large originals live on the developer's disk and in R2. A fresh clone has no videos locally; point `NEXT_PUBLIC_MEDIA_BASE` at R2 to run it.
