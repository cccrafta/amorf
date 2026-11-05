---
title: "ADR-0014: Add a backend with writes and accounts; keep apps/web a static export with no server code"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0001, ADR-0004, ADR-0008, ADR-0012, ADR-0013, ADR-0015, ADR-0016]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0014: Add a backend with writes and accounts; keep apps/web a static export with no server code

## Context and Problem Statement

[ADR-0001](0001-static-export-on-cloudflare-workers.md) chose a static export on Worker static assets because "the project has no accounts, no writes and no request-time logic". That premise ends for the project as a whole. Authors need a studio to create and edit entities, spaces and board layouts. Visitors will save and share spaces, journeys and notes. Both need accounts, roles and request-time writes. ADR-0001 already expected this: backend work lives in a separate app and does not change its decision for `apps/web`. So ADR-0001 stays in force, and this record decides how the backend is added beside it.

## Decision Drivers

- Authors edit without a terminal; visitors keep what they make.
- The public site stays fast, prerendered and cheap.
- Personal data stays in our EU database ([ADR-0012](0012-cloudflare-platform-d1-and-three-buckets.md)).
- No server to run while idle.

## Considered Options

- Keep the project serverless: authoring stays in local files and scripts; visitor data stays in the browser.
- Move `apps/web` to a server runtime (Next on Workers through an adapter) and add writes there.
- Keep `apps/web` a static export, and add a separate API app and studio app for writes and accounts.

## Decision Outcome

Chosen option: "static `apps/web`, separate API and studio", because it adds writes and accounts without giving up anything the static site has.

- **`apps/web`:** stays a static export with no server code, as [ADR-0001](0001-static-export-on-cloudflare-workers.md) decides. Every rule in [next-16-static-export.md](../../conventions/next-16-static-export.md) still applies. It reads published data at build time ([ADR-0004](0004-entities-loaded-at-build-time.md)) and, later, calls the API from the browser for visitor features.
- **`apps/api`:** a Worker that holds all request-time logic: writes, sign-in, roles, publishing, uploads. Auth: [ADR-0015](0015-better-auth-on-d1.md). Stack: [ADR-0017](0017-zod-schemas-hono-api-drizzle.md).
- **`apps/studio`:** the authoring app ([ADR-0016](0016-studio-as-vite-react-spa.md)).
- **Domains:** `api.amorf.co` and `studio.amorf.co` on the zone we already own, so the session cookie is same-site with the studio and the site. The site itself may stay on `amorf.amorf.workers.dev` until it needs the cookie.
- **Authorization:** roles (`user`, `author`, `admin`) and ownership live in D1 and are checked in `apps/api`. Every route declares the role it needs; every visitor record checks owner and visibility (`private`, `link`, `public`). Cloudflare Access on the studio is a later second gate, skipped at first.

### Consequences

- Good: the site keeps every property ADR-0001 chose it for.
- Good: accounts and writes live in one app with one security boundary.
- Bad: we now run sign-in, an API and a database, with security releases to follow and data to protect. Before visitor features launch: retention periods, account deletion (cascade or anonymise), export, and moderation for public content.
- Bad: the API needs CORS for the site and studio origins.
- Neutral: `apps/web` stays free of server features; a task that needs one still needs a new record.

## More Information

Research: [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-07, DP-08, DP-09, owner choices). Scope and roles: [../../design/backend.md](../../design/backend.md#authentication-and-authorization). Deploy: [../../deployment.md](../../deployment.md).
