---
id: EXP-0002
title: The entity view as a table, radial board with zoom
date: 2026-11-01
status: planned
question: Does an entity view laid out like a table (content around a centre, pannable in every direction, zoomable from overview to detail) lead readers to explore more of an entity than the current board that extends only right and down?
hypothesis: Readers of the radial, zoomable board reach more pieces and describe the entity as "laid out" rather than "scrolled"; it is wrong if coverage does not rise or if readers lose their place when zoomed out.
method: Build the radial board and zoom behind a flag, then have five readers open the same three entities in both versions, recording which pieces enter the viewport and asking them to describe the experience in their own words.
materials: [centred-grid, ring-packing, entity-json-layout]
tools: [next-prototype, screen-recording, think-aloud]
outcome:
decisions: []
tags: [entity-view, layout, navigation, zoom, table-metaphor]
parts: [entity]
media: []
publish: false
case_study: entity-view
---

# EXP-0002: The entity view as a table

## Hypothesis

Feedback (2026-10-31): entering an entity reveals content only to the right, and the flat view should feel like information and media put on a table that the reader can zoom into and move across in all directions. A board centred on the entry frame, packed in rings outward, with zoom from a full overview down to 2x detail, should make the whole entity explorable. It is wrong if readers see no more of the entity than before, or lose orientation when zoomed out.

## Method

1. Prototype per [docs/design/entity-view.md#round-2](../../../docs/design/entity-view.md#round-2) sections A and C: centred coordinates, ring packing by distance with golden-angle stepping, opening staggered from the centre, zoom 0.4 to 2x anchored on the pointer, overview at minimum zoom.
2. Five readers, three entities each, old and new board in alternating order.
3. Ask each reader to leave the entity by pinching out past the overview; note whether the exit feedback (board shrinking back to its card, field fading in, `release to leave`) was understood before release.
4. Record viewport coverage (pieces that were at least half on screen) and a short think-aloud.

## Observations

2026-11-01: zoom built (round 2 step 3, ahead of step 2) together with edges as walls, following EXP-0003; see [entity-view.md, C. Shipped](../../../docs/design/entity-view.md#c-shipped-zoom-edges-as-walls). Radial entry (step 2) built the same day for unauthored boards; see [entity-view.md, A. Shipped](../../../docs/design/entity-view.md#a-shipped-radial-entry).

Not started.

## Outcome

Not started.

## Next

If it holds: a DDR superseding the placement and entry parts of DDR-0002.
