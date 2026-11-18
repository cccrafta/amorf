---
title: "ADR-0021: Run a thin studio Worker on Cloudflare Access and R2 before the backend exists"
status: proposed
date: 2026-11-18
deciders: [owner]
supersedes:
superseded-by:
related: [ADR-0003, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, DDR-0003, DDR-0006]
updated: 2026-11-18
last_verified: 2026-11-18
---

# ADR-0021: Run a thin studio Worker on Cloudflare Access and R2 before the backend exists

## Context and Problem Statement

Three people (the owner and two teammates) need to author entities now: create them, upload images and text, edit `entity.json` and pin entities in the field. Today only the owner can publish, by editing local folders and running `pnpm entities:sync`. The planned backend ([ADR-0012](0012-cloudflare-platform-d1-and-three-buckets.md) to [ADR-0017](0017-zod-schemas-hono-api-drizzle.md): `apps/api`, D1 as master, Better Auth) is proposed but not built, and the spaces and journey shapes it would store are still being tested. How do we give three people a studio without building that backend first, and without a dead end when it arrives?

## Decision Drivers

- Ship in days, for three known people, on the Free plan.
- R2 stays the source of truth ([ADR-0003](0003-entities-never-in-git.md)); nothing new goes into the public repository.
- No route open by mistake: sign-in must fail closed.
- The later backend can take over by importing the same R2 files, with no data migration in the studio.

## Considered Options

- Wait for the full backend (`apps/api` on D1 with Better Auth), then build the studio on it.
- One thin Worker, `studio`: the SPA and its own small Hono API in one Worker, signing in with Cloudflare Access, reading and writing R2 directly.
- Keep publishing by hand with `entities:sync`, and share the local folders with teammates.

## Decision Outcome

Chosen option: "one thin Worker", because it is the smallest thing that lets three people author now, and every part of it is a part the backend plan already uses (Hono, Vite + React, R2 buckets).

- **App:** `apps/studio`, package `@amorf/studio`, Worker `studio` at `https://studio.amorf.workers.dev`. Vite + React SPA as in [ADR-0016](0016-studio-as-vite-react-spa.md), but its data comes from `/api/*` routes in the same Worker, not from `apps/api`.
- **Sign-in:** Cloudflare Access (Zero Trust Free) on the `workers.dev` route, allow-list of three emails held in Access only. The Worker also verifies `Cf-Access-Jwt-Assertion` against the team's keys and the application's AUD tag (Worker secrets `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`). Without both secrets, every request gets 403. `run_worker_first` puts the static assets behind the same check. Preview URLs off.
- **Storage:** R2 only, no D1. Bindings `MEDIA` (`amorf-media`, public) and `ARCHIVE` (`amorf-archive`, private, originals). JSON writes are conditional puts on the loaded ETag. All storage access sits behind `worker/store.ts`.
- **Deferred, not rejected:** D1 as master ([ADR-0013](0013-d1-master-with-r2-published-snapshot.md)), Better Auth ([ADR-0015](0015-better-auth-on-d1.md)), `packages/core` ([ADR-0017](0017-zod-schemas-hono-api-drizzle.md)), the custom domain `studio.amorf.co`. This record supersedes nothing.

### Consequences

- Good: three people can author within the step plan in [studio-v0.md](../../design/studio-v0.md); no database, no session code, no email sending.
- Good: Access is in front of the Worker, so unauthenticated traffic never reaches the code.
- Bad: `entities:sync` and the studio both write `index.json` and manifests; `entities:sync` has to be retired before the studio writes (step 0.3 in the design page).
- Bad: no revisions or audit trail beyond R2 object metadata until D1 arrives.
- Neutral: when `apps/api` starts, its one-time import reads the same R2 keys, and the studio's routes move behind it; the Hono and Zod code moves with them.

## More Information

Operational rules: [deployment.md](../../deployment.md) (section "Studio"), [folder-structure.md](../../conventions/folder-structure.md) (inside `apps/studio`). Plan and steps: [studio-v0.md](../../design/studio-v0.md). Studio type: [DDR-0006](../ddr/0006-studio-type-director-and-letter-gothic.md). Reopen if Access cannot protect the `workers.dev` route, or if more than a handful of people need to author.
