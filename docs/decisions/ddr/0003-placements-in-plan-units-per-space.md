---
title: "DDR-0003: Place entities by stored plan coordinates per space, in world units, with pins that never move"
status: proposed
date: 2026-11-04
deciders: [cccrafta]
supersedes:
superseded-by:
related: [DDR-0002, ADR-0013, ADR-0016, ADR-0017]
evidence: [EXP-0006]
materials: [field-plan, space-floor, world-unit, placement-record]
spatial-context: the field and every space (curated, visitor-bound, generated); the studio's top-down plan editor; the visitor's table when it is bound into a space
updated: 2026-11-04
last_verified: 2026-11-04
---

# DDR-0003: Place entities by stored plan coordinates per space, in world units, with pins that never move

## Context and Problem Statement

The ontology says entities sit at coordinates and proximity should mean something ([coordinates](../../../research/theory/ontology/coordinates.md)). Today no coordinate is data. The field computes each position from a hash of the id over a `ceil(sqrt(N))` grid in `Field.tsx`, so every entity moves when one is added or removed. The visitor's table stores positions as percentages of a table measured from the viewport (`table.ts`), and a space maps them to a floor at run time (`spaces.ts` `floorAt`). An author placing an entity, a curator making a space, and a visitor binding a table all need a position that is stored once and means the same thing on every screen. What is a coordinate, and what does it belong to?

## Decision Drivers

- A placed entity stays where it was placed: adding or removing other entities never moves it.
- A coordinate does not depend on a screen, a viewport or the number of entities.
- One entity can stand in many spaces at different positions.
- The field looks the same on the day stored coordinates replace computed ones.
- `apps/web` reads a stored coordinate without conversion.
- Authors place by hand first; rules and semantic layouts come later and must not overwrite a hand placement.

## Considered Options

- Keep computed positions, but make the hash independent of `N` (hash to a fixed grid).
- Store one coordinate per entity, as a field in `entity.json`.
- Store a placement per (space, entity) pair, in percentages or in 0 to 1 of the space's bounds.
- Store a placement per (space, entity) pair, in absolute plan coordinates in the engine's world units.

## Decision Outcome

Chosen option: "a placement per (space, entity) pair, in absolute plan coordinates in world units", because it is the only option where a position survives a change in screen, in membership and in the space's bounds, and where one entity can stand differently in each space.

- **A placement** is a record of space, entity, `x`, `z`, `pinned`, and an optional `order`. It belongs to the pair, not to the entity. `entity.json` keeps no field coordinate; its `layout` stays the board placement inside the entity view ([DDR-0002](0002-entity-view-fixed-frame-and-board.md)).
- **The plan is 2D.** `x` runs across, `z` runs in depth, on the ground plane. Height is not authored: the environment derives it (the field's vertical scatter comes from the id, not from the count).
- **Units are the engine's world units**, the same units the camera moves in. A placement is absolute, so it does not stretch when a space's bounds or a screen change.
- **Origin and range come from the space's topology**, and match what the engine draws today, so `apps/web` uses the numbers as they are:
  - `wrap` (the field): `x` and `z` in `[0, TILE)`, wrapping, with `TILE` 6200 today.
  - `bounded` (a room): origin at the middle of the entrance edge; `x` across, `z` negative going in, as `spaces.ts` lays out the floor.
- **The field is the default space.** It holds a placement for every published entity, like any other space.
- **Pins win.** A member with `pinned: true` stays at its stored coordinate. A member without a pin gets its position from the space's layout rule (`pinned`, a rule, or later `semantic`), computed only in free plan area, so a pinned member never moves. Publishing a new entity proposes a free spot in the field, which the author can accept as a pin or move.
- **First placements:** the one-time import computes today's hash positions (`hx`, `hz`) once and stores them as pinned field placements.
- **The visitor's table stays in percent while it is a table.** When it is bound into a space, the positions are converted once to plan coordinates, so the stored space never holds percentages.
- **A journey has no coordinates of its own.** It is the visitor's sequence of entity views: the space it was walked in plus the entity ids in order, with times. Its map is drawn from that space's placements. Moving a placement later redraws the map, and the sequence stays true.

### Consequences

- Good: "Place by coordinate" becomes possible; the field stops reshuffling when the corpus grows.
- Good: one record shape for the field, curated spaces, bound tables and generated spaces; only the layout rule and environment differ.
- Good: the studio's top-down plan editor ([ADR-0016](../adr/0016-studio-as-vite-react-spa.md)) edits `x` and `z` directly, with no mapping to explain.
- Bad: the field's density is now authored. If entities are added without good free spots, the field crowds where the author put them, not evenly.
- Bad: two origins, one per topology. Code that works across spaces reads the topology first.
- Bad: if `TILE` or a room's bounds change, placements do not follow. Changing bounds is a deliberate edit of the space, with its placements reviewed.
- Neutral: the placement and space schemas go into `packages/core` ([ADR-0017](../adr/0017-zod-schemas-hono-api-drizzle.md)); the placement table lives in D1 ([ADR-0013](../adr/0013-d1-master-with-r2-published-snapshot.md)). How `apps/web` gets placements at build time (in `index.json` or a separate file) is decided when phase 2 starts.

## Structural / material logic

A plan is the architect's honest record of where things stand: absolute positions on a ground plane, in one unit, independent of the sheet it is printed on. Percentages of a screen are the sheet, not the building. Storing positions in the plan's own units makes the arrangement itself the authored material, which is the thesis: the layout logic is the ornament. A placement belongs to the pair (space, entity) the way an object's position belongs to the room it stands in, not to the object. Height is left to the environment because it carries no authored meaning yet; adding an axis no one sets would be ornament for its own sake. A journey stores the sequence and not the path because the sequence is what the visitor made; the path is a drawing of it over the plan.

## Evidence

- [EXP-0006](../../../research/experiments/0006-thresholds-between-spaces/README.md): the table-to-floor mapping in `spaces.ts`, which this record makes a one-time conversion.
- Owner answers of 2026-11-04 in [backend.md](../../design/backend.md#open-questions-for-this-epic) (question 18: pins first, semantic layout later, pins kept over it) and the owner's statement that a journey is the sequence of entity views.
- No experiment yet tests stored placements against computed ones. The import keeps the field's look unchanged, so the switch itself is the first check.

## More Information

Scope: [backend.md](../../design/backend.md#2-coordinates), [space environment](../../design/backend.md#space-environment-how-a-field-shows). Plan: [backend-decisions.md](../../design/backend-decisions.md) ("Fastest path", phase 2). Reopen if an experiment shows that height or facing must be authored, or if a semantic layout needs a coordinate range the plan cannot hold.
