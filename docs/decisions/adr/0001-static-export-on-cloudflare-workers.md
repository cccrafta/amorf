---
title: "ADR-0001: Serve a static export from Cloudflare Worker static assets, with no server code"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0002, DDR-0002]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0001: Serve a static export from Cloudflare Worker static assets, with no server code

## Context and Problem Statement

The site is a spatial browser of research entities. Everything it shows is known at build time, and the project has no accounts, no writes and no request-time logic. It needs cheap, fast, low-maintenance hosting under a custom domain.

## Decision Drivers

- No server to run, patch or pay for while idle.
- Same provider as the media bucket (see ADR-0002), so one dashboard and one set of credentials.
- Entity data is public and changes only when the author publishes.

## Considered Options

- Next.js server runtime on a Node host or Vercel.
- Next.js on Cloudflare Workers through an adapter (server rendering at the edge).
- Static export (`output: "export"`) served by a Cloudflare Worker with static assets.

## Decision Outcome

Chosen option: "static export on Worker static assets", because the product has no request-time behaviour to justify a runtime, and a static export removes a whole class of failure and cost.

### Consequences

- Good: nothing to operate; every page is a file; builds are the only moving part.
- Bad: server features are unavailable (Server Actions, ISR, cookies, redirects, request-dependent route handlers, `proxy.ts`). A task that needs one needs a different deployment mode and a new decision record.
- Bad: data changes need a rebuild and redeploy (see ADR-0004).
- Neutral: backend work, when it comes, lives in a separate app (`apps/api`, see ADR-0008) and does not change this decision for `apps/web`.

## More Information

Operational rules: [../../conventions/next-16-static-export.md](../../conventions/next-16-static-export.md). Deploy steps, account and domain: [../../deployment.md](../../deployment.md).
