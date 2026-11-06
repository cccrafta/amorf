---
title: "DDR-0005: Show an entity as one thumbnail form with its media as satellite forms around it, and let forms have more than six sides"
status: proposed
date: 2026-11-06
deciders: [cccrafta]
supersedes:
superseded-by:
related: [DDR-0004, ADR-0019, DDR-0002]
evidence: [EXP-0014, EXP-0016, EXP-0017, EXP-0018]
materials: [entity-form, rest-cube, entity-media]
spatial-context: the field, each entity seen from the walking camera; later the entity views
updated: 2026-11-06
last_verified: 2026-11-06
---

# DDR-0005: Show an entity as one thumbnail form with its media as satellite forms around it, and let forms have more than six sides

## Context and Problem Statement

[DDR-0004](0004-entity-form-with-media-faces-derived.md) gives every entity one cube-based form whose six faces carry its media; pictures beyond six appear only in the entity view. Two owner statements on 2026-11-06, after the board entity view ([EXP-0017](../../../research/experiments/0017-entity-view-board-explode-in-the-lab/README.md)) worked, widen that:

1. **A form is not limited to six sides.** The cube is the rest shape, not the ceiling. A form may have more faces (or other topology), each able to carry media.
2. **An entity is one thumbnail form plus satellites.** The form depicts one thumbnail (the cover). The rest of the entity's media are shown as smaller forms surrounding it, so the field shows how much an entity holds. The satellites are "noise forms": together they express the entity's complexity or amount of content.

## Decision Drivers

- The thesis: structure is the ornament. Satellite count and shape must come from the entity's data (media count, kinds, area), never be added for looks alone.
- Legibility in the field: a visitor should read "a lot in here" or "little in here" without opening the entity.
- Cost: one draw for all forms must hold; satellites are more instances of the same rest cube, not a second system ([ADR-0019](../adr/0019-webgpu-first-with-tsl.md)).
- The field's density: satellites must not hide neighbouring entities or make picking ambiguous.

## Considered Options

- **A. Six faces only (DDR-0004 as it stands).** One form per entity; extra media only in the entity view.
- **B. Satellite forms around a thumbnail form.** One main form; each further medium becomes a small form orbiting or clustered near it.
- **C. More faces on one form.** The form itself gains faces (a prism, a truncated form) as the entity gains media.
- **B + C.** The satellites carry the media beyond the main form's faces; the main form's own face count follows the entity's data too.

## Decision Outcome

Proposed, not chosen. The owner's direction points to **B + C**: a main form for the thumbnail and satellites for the rest, both derived from the entity's data. The open points below need an experiment before this becomes accepted.

### Owner clarifications

- The thumbnail form shows one medium, the cover, on all faces (2026-11-06, after the first satellites were seen). This narrows [DDR-0004](0004-entity-form-with-media-faces-derived.md), whose faces carried up to six pictures; every other picture is a satellite. Both records are proposed, so the narrowing is written here and DDR-0004 is reconciled when either is accepted.

### Open points

- Arrangement, answered by the owner on 2026-11-06: satellites both cluster and orbit, in a random and good way. Read as: placement is random but seeded by the entity id (stable per entity), spread so satellites cluster loosely without overlapping each other or the main form, and each moves on its own slow orbit around the main form. EXP-0018 reads this as Kepler ellipses with the form at the focus, sizes from many small to few large, and the whole cluster floating with the form. What "good" means (spacing, orbit radius and speed ranges, density limits in the field) is for EXP-0018 to tune by eye.
- What "noise" means: random placement that is stable per entity (seeded by the entity id), or a layout from data. Seeded and data-driven fits the thesis better than free noise.
- What the satellites show: one picture each, the same media as the board, or abstract forms whose size and shape stand for kind (video, image, text).
- What a click on a satellite does: open the entity at that medium on the board.
- Picking and depth: one bounding sphere per entity today; satellites need a larger sphere or per-satellite picking.
- Face count beyond six: which topology (prism, polyhedron from the same rest cube with more subdivisions) and how the texture array maps more faces.

### Consequences

- Good: the field shows the content amount of each entity; the board's pictures have a visible origin in the field; it extends the exploded entity view naturally (satellites fly to the board).
- Bad: more instances and more layers in the texture array; a denser field; satellites compete with the main form for attention.
- Neutral: DDR-0004's cover-first rule and face filling still hold for the main form.

## Structural / material logic

The satellites are the entity's media made visible as structure: their count is the media count, so the form of an entity is read from what it holds. This follows the thesis only if the arrangement is derived from data (count, kind, size) and not decorated; if it is placed by taste alone, the exception must be written down here.

## Evidence

Builds on EXP-0014 (forms and media faces), EXP-0016 (unfold) and EXP-0017 (board explode). [EXP-0018](../../../research/experiments/0018-satellite-forms-around-the-entity-form/README.md) tests satellites in the forms lab (built, not yet seen): seeded orbits in concentric shells, one satellite per picture after the cover, one draw. No experiment tests more than six faces yet.

## More Information

[One world, many cameras](../../design/one-world-many-cameras.md), section "Form complexity", items 2 (composition) and 3 (data), which this record specialises.
