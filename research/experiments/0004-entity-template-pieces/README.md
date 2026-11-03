---
id: EXP-0004
title: Entity templates built from registered piece kinds
date: 2026-11-01
status: running
question: Can an entity template declare its content as pieces of registered kinds, so that adding a new kind (text now, more later) touches one renderer file and nothing in the view, placement or gesture code?
hypothesis: A piece registry shaped like the existing media registry (kind to measure and render) plus a template per entity type keeps a new kind to one file and one registration; it is wrong if placement or the frame needs a branch per kind.
method: Move the current text pieces (title, meta, paragraphs) into registered kinds driven by a template, then add a throwaway second kind (a quote) and count the files touched.
materials: [entity-json-layout, entity-template]
tools: [typescript, next-prototype]
outcome:
decisions: []
tags: [entity-view, architecture, entity-template, content-types]
parts: [entity]
media: []
publish: false
case_study: entity-view
---

# EXP-0004: Entity templates built from registered piece kinds

## Hypothesis

Feedback (2026-10-31): the floating text can be part of an entity template; for now only text, but the view should accommodate any number of content types. Today `interior/layout.ts` builds each piece kind inline and `interior/view.tsx` renders it in one `switch`. Media already has a registry (`apps/web/lib/media/registry.ts`: kind to renderer). Doing the same for pieces, and letting a template choose which pieces an entity type shows and where (board or floating layer), should make a new kind a one-file change. It is wrong if placement, zoom or the frame need per-kind code.

## Method

1. Define a piece kind as `{ kind, layer: "board" | "float", measure(entity, width), render(props) }` and a registry `registerPiece` / `pieceFor`, in `interior/pieces/` (one file per kind).
2. Define a template per entity type: an ordered list of `{ kind, source }` (e.g. `text` from `description`), with a default template for entities with no type.
3. Port title, meta and paragraph pieces; the floating text column renders whatever the template puts on the `float` layer.
4. Add a `quote` kind as a test and list every file it touched.

## Observations

2026-11-01, method steps 1 to 3 built (round 2 step 1; details in [entity-view.md, D. Shipped](../../../docs/design/entity-view.md#d-shipped-step-1)). `view.tsx` and `placement.ts` no longer name any kind: the view renders through `pieceFor(kind).render`, placement reads only `layer`, `cols`, `tall` and `at`. One shape change from the method: `measure(entity, width)` became `build(ctx, source)` returning pieces that each carry `tall(w)`, because one kind can yield several pieces. Step 4 (the `quote` kind and the file count) is still to do.

## Outcome

Not started.

## Next

If it holds: an ADR for the piece registry and template, and the entity-types backlog item (generic properties plus type-specific ones) builds its templates on it.
