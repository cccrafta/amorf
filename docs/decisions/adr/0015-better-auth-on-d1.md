---
title: "ADR-0015: Run sign-in with Better Auth inside apps/api, on D1, with magic links and passkeys"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0012, ADR-0014, ADR-0017]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0015: Run sign-in with Better Auth inside apps/api, on D1, with magic links and passkeys

## Context and Problem Statement

Authors and, later, visitors need accounts ([ADR-0014](0014-backend-with-writes-and-accounts.md)). Who runs sign-in, and where do users, sessions and roles live? Personal data should stay in the EU, roles should sit next to the data they protect, and the Free plan allows only about 10 ms of CPU per request (unverified).

## Decision Drivers

- No hosted identity provider; user records stay in our EU database.
- Roles and ownership in our own database, next to the records.
- No per-user pricing and no lock-in to a vendor's user store.
- Fits Workers and the Free plan's CPU limit.

## Considered Options

- Better Auth (MIT), run by us inside `apps/api`, on D1.
- Supabase Auth (Frankfurt).
- Kinde (Dublin).
- Auth0 (EU tenant).
- Clerk, WorkOS AuthKit, Stytch or Firebase.

## Decision Outcome

Chosen option: "Better Auth on D1", because it is the only option with no hosted identity provider: users and sessions stay in our D1 database in the EU, and we own the tables. The email provider that sends magic links still processes email addresses, so it is chosen for an EU option.

- **Where:** a library inside `apps/api`; users, sessions, accounts and verification tokens in the same D1 database, through the Drizzle adapter.
- **Sign-in:** magic link and passkeys. No passwords while on Free: hashing can exceed the CPU limit (unverified). Google sign-in is optional.
- **Roles:** the admin plugin for roles and bans. Roles (`user`, `author`, `admin`) are rows in D1, checked in `apps/api`.
- **Cookie:** scoped to `.amorf.co`, so the site and the studio share the session.
- **Email:** a transactional provider with an EU option (Resend or similar), chosen when phase 1 starts.

### Consequences

- Good: GDPR is simplest; no MAU pricing; users can be exported and migrated because we own the tables.
- Bad: we own sign-in security. Pin the version, follow its security releases (one was announced for 2026-11-03), and test every upgrade before deploying it.
- Bad: D1 has no interactive transactions. Better Auth's multi-step writes are not atomic on D1, and an upgrade once broke D1 (issue #4732). Test sign-up, sign-in and sign-out against D1 on every upgrade.
- Bad: the `auth generate` CLI cannot reach D1. Generate the auth tables through the Drizzle schema and `drizzle-kit`, then apply them with `wrangler d1 migrations` ([ADR-0017](0017-zod-schemas-hono-api-drizzle.md)).
- Neutral: the JWT plugin is available if a token is ever needed outside `.amorf.co`.

## Pros and Cons of the Options

- **Supabase Auth:** best hosted option, EU region, 50k MAU free. Costs a whole Supabase project for auth only, and passkeys are in beta. The fallback if running sign-in ourselves becomes a burden: its JWKS can be verified in a Worker the same way.
- **Kinde:** EU (Dublin), 10.5k MAU free, a Workers JWT guide; roles limited on the free tier.
- **Auth0:** EU only if the tenant is created there; roles and hash export are behind paid plans.
- **Clerk, WorkOS, Stytch, Firebase:** US-only data. Clerk's `@clerk/nextjs` breaks under `output: "export"`, and custom roles are a paid add-on.

## More Information

Comparison and sources (checked 2026-11-04): [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-07, DP-08, "Starting on Free"). Roles and visibility: [../../design/backend.md](../../design/backend.md#authentication-and-authorization).
