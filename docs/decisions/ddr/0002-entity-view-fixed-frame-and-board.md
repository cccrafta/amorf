---
title: "DDR-0002: Build the entity view as a fixed frame over an authored board on a 12-column square grid"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes:
superseded-by:
related: [DDR-0001, ADR-0003]
evidence: [EXP-0001]
materials: [12-column-grid, square-module, entity-json-layout]
spatial-context: entity view, entered from the field; desktop (12 columns) and narrow screens (4 columns)
updated: 2026-10-31
last_verified: 2026-10-31
---

# DDR-0002: Build the entity view as a fixed frame over an authored board on a 12-column square grid

## Context and Problem Statement

The first entity view placed pieces by seeded random sampling, so the same entity looked different on each viewport, an author could not say where anything goes, and tools (traces, related entities, actions) landed wherever the sampler put them. Pulling past an edge always left the entity, though a reader pulling at an edge expects more, not out.

## Decision Drivers

- Authored placement: the author, not a sampler, composes each entity.
- Tools in one fixed, predictable place.
- Navigation between entities from within the view.
- A layout rule that survives narrow screens without per-breakpoint authoring.

## Considered Options

- Free-position canvas (Readymag, Cargo): maximum freedom, but every breakpoint needs separate work and non-designers break pages.
- Fixed grid with spans (MDN 12-column pattern, Semplice, Payload `size`): snapping keeps pages looking edited.
- Keep seeded sampling.

## Decision Outcome

Chosen option: "fixed grid with spans", in this form:

- Two layers. A **frame** that never pans holds the header, the four neighbour labels and a bottom bar. A **board** that pans holds the entity's content (title, metadata strip, description paragraphs, media).
- The board sits on a 12-column grid of square modules (4 columns below 760 px). Each piece has `col`, `row` and `w`; height is derived from content. Unplaced pieces are packed deterministically, with no randomness.
- Tools open in one drawer from the right, reached from the fixed bar; the board dims but keeps its place.
- Pulling past an edge goes to that edge's neighbour in the field; Esc or the close control exits to the field. Alt plus an arrow key jumps straight to a neighbour. Pinch no longer leaves.

### Consequences

- Good: the same entity renders identically on every load; tools never move; the view has a way onward as well as out.
- Bad: authors must learn a grid and an `entity.json` `layout` block; text height is measured at runtime, so `entities:check` can only approximate overlaps.
- Neutral: neighbour travel is a camera flight through the field, not a direct slide; a direct slide is a possible later change.

## Structural / material logic

The grid is the structure and the ornament at once: square modules mean a piece's pixel height depends only on its width and content, never on the viewport, so the composition is determined by the same few numbers that hold it up. The frame is the load-bearing, unmoving part; the board is the infill the author arranges against it. Nothing is placed by chance, and the packing rule is a visible, repeatable logic rather than a hidden sampler.

## Evidence

[EXP-0001](../../../research/experiments/0001-entity-view-navigation/README.md) holds the pattern research (authorable layouts, annotation and connection interfaces, collection and edge navigation) and the open questions with the defaults that were built.

## More Information

Design specification, wireframes, placement model, navigation thresholds and acceptance criteria: [../../design/entity-view.md](../../design/entity-view.md). Field rules for `layout`: [../../conventions/entities.md](../../conventions/entities.md).
