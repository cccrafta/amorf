---
title: Backlog
updated: 2026-11-01
last_verified: 2026-10-31
---

# Backlog

Work not started yet, grouped by area. Nothing here is built; the code is the source of truth for what exists. When an item turns into a decision, record it (ADR or DDR, see [decision-records.md](conventions/decision-records.md)) and link it from the item. Remove items once they ship. A choice nobody has made yet goes in [open-questions.md](open-questions.md), not here.

Source is noted per item: **plan** (planned work) or **feedback** (feedback session, 2026-10-31).

## Priority

1. **Plan / map view: thumbnails as nodes** (plan; also raised in feedback). Replace the plain markers in the plan view with entity thumbnails.
2. **Opening sequence** (plan). Research and experiment first, build second. Start with an experiment in `research/experiments/` (see [research-log.md](conventions/research-log.md)), then a DDR for the chosen sequence.
3. **Entity lifecycle** (feedback, 2026-11-01). Entering and leaving an entity, from the field or between entities, as one lifecycle (prepare, enter, active, exit, unload) instead of per-path flags. Research: [STU-0002](../research/studies/0002-entity-lifecycle/README.md). Next: choose the open points there, then target design and a DDR.
4. **Feedback session items**, below.

## Field (3D space)

- **Thumbnail angle.** Should thumbnails turn to face the viewer? (feedback)
- **Line and height balance.** Track lines and card heights don't feel balanced yet. Decide whether card heights stay random or not. (feedback)
- **Floor.** The horizon is visible; should the floor show too? (feedback)
- **Layering of tracks.** How overlapping tracks stack and read. (feedback)
- **Sound control.** A way for the viewer to control the surrounding (spatial) audio. (feedback)

## Moving between entities

- **Traversal animation.** The transition between entities doesn't feel good yet. Planned: [entity-view.md, round 2](design/entity-view.md#round-2) B, EXP-0003. (feedback)
- **Radial entry.** Entering an entity should open radially, not only to the right. Relates to [design/entity-view.md](design/entity-view.md). (feedback)
- **Zoom in an entity.** Zoom in and out inside the entity view. Note: the entity-view proposal currently swallows pinch; settle this together. (feedback)

## Entity view

- **Floating text.** Text as a floating component that people can see. (feedback)
- **Specify traces.** Define what a trace is, what it holds, where it is stored (browser, shared backend via `apps/api`, or authored in `entity.json`) and who sees it. Traces are switched off until then: `TRACES_ENABLED` in `apps/web/components/field/notes.ts`. (feedback)

## Entity model and editing

- **Entity types.** Entity types, separate from media types. Every type extends one generic entity declaration (title, etc.); each type adds its own fields (e.g. a building has architect and client). Update `docs/templates/entity.schema.json` and [entities.md](conventions/entities.md). (feedback)
- **Place by coordinate.** An entity is assigned to the space by giving it a coordinate in that space. (feedback)
- **Add and edit entities.** Entities can be added and edited (authoring flow). Entities live in R2, never in git; see [entities.md](conventions/entities.md). (feedback)
