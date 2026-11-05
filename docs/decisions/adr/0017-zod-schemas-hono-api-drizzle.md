---
title: "ADR-0017: Define schemas with Zod 4 in packages/core, build the API with Hono and @hono/zod-openapi, and query D1 with Drizzle 0.45.x"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0008, ADR-0012, ADR-0014, ADR-0015, ADR-0016]
updated: 2026-11-04
last_verified: 2026-11-04
---

# ADR-0017: Define schemas with Zod 4 in packages/core, build the API with Hono and @hono/zod-openapi, and query D1 with Drizzle 0.45.x

## Context and Problem Statement

The entity shape is described today by a hand-written JSON Schema (`docs/templates/entity.schema.json`), which editors use for autocompletion. `entities:check` does not read that schema; it runs its own separate checks. The API, the studio and `apps/web` will all read and write the same records: entities, media items, spaces, placements, journeys, notes. Where does the one definition of these shapes live, what serves them over HTTP, and what talks to D1?

## Decision Drivers

- One definition gives runtime validation, TypeScript types, the OpenAPI document and the JSON Schema.
- The studio gets end-to-end types without a code generation step.
- Typed queries, with a path to Postgres if D1 limits bite ([ADR-0012](0012-cloudflare-platform-d1-and-three-buckets.md)).
- Works on Workers and with Better Auth ([ADR-0015](0015-better-auth-on-d1.md)).

## Considered Options

- Schemas: Zod 4; keep JSON Schema as the source and generate types; TypeBox or Valibot.
- API: Hono with `@hono/zod-openapi`; itty-router or plain `fetch` handlers; tRPC.
- Query layer: Drizzle ORM; Kysely; raw D1 SQL.

## Decision Outcome

Chosen option: "Zod 4 + Hono + Drizzle", because together they give one schema from storage to studio with typed calls at every step, and each is the standard choice on Workers.

- **Schemas:** Zod 4 schemas in `packages/core` (`@amorf/core`, just-in-time TypeScript per [ADR-0008](0008-pnpm-workspaces-monorepo.md)) for entity, media item, space, placement, journey, note and the registry configs. `docs/templates/entity.schema.json` is generated from them with `z.toJSONSchema()` (draft 2020-12), so editors keep autocompletion. The API and the studio validate with these schemas, and `entities:check` moves to them for as long as it exists. The existing JSON Schema is translated to Zod by hand once, because `z.fromJSONSchema()` is experimental.
- **API:** Hono (4.13.x) on Workers, with `@hono/zod-openapi` (Zod 4) for routes and an OpenAPI 3.1 document. The studio and `apps/web` call it through Hono's typed `hc` client. Split the API into sub-apps by area (entities, media, spaces, auth, visitor) from the start, because RPC types get slow with many routes.
- **Query layer:** Drizzle ORM with `drizzle-orm/d1`, pinned to the 0.45.x line. Move to 1.0 when it is released, not while it is a release candidate. `drizzle-kit generate` writes migrations; `wrangler d1 migrations apply` runs them (`migrations_pattern` supports Drizzle's folders).

### Consequences

- Good: a schema change shows up as a type error in the API, the studio and the site at once.
- Good: Drizzle has a Better Auth adapter and also targets Postgres, which keeps the Neon escape route open.
- Bad: the hand translation of the JSON Schema is a one-time risk of drift. Diff the generated JSON Schema against the current one before switching.
- Bad: Drizzle's docs already point at the 1.0 release candidate. Expect one migration of the ORM code when 1.0 ships.
- Neutral: `packages/core` is the first package. It is created together with `apps/api` at the start of phase 1, not before, because [ADR-0008](0008-pnpm-workspaces-monorepo.md) keeps `packages/` empty until a second consumer exists. Its consumers are `apps/web`, `apps/api` and, later, `apps/studio`.

## Pros and Cons of the Options

- **JSON Schema as the source:** no runtime validators or route types without extra generators.
- **tRPC:** end-to-end types, but no OpenAPI document and a heavier client; Hono's `hc` gives the same types with plain HTTP.
- **Kysely:** a good query builder, but it has no official D1 dialect, only a community one.
- **Raw D1 SQL:** no types and no migration generation.

## More Information

Versions and sources (checked 2026-11-04): [../../design/backend-decisions.md](../../design/backend-decisions.md) (DP-04, DP-05, DP-06). Entity fields: [../../conventions/entities.md](../../conventions/entities.md). Package rule: [../../../packages/README.md](../../../packages/README.md).
