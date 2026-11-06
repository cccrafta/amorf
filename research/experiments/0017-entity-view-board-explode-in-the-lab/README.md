---
id: EXP-0017
title: Entity view as a board: click a form, its pictures fly out of it into the radial board of all media
status: running
date: 2026-11-06
question: Can the three.js entity view show the same radial board of all media as the DOM entity view, by flying every picture of the opened entity out of its form into the board layout, without a second scene and without the DOM?
hypothesis: One extra instanced mesh of flat quads (one per picture of every entity, collapsed to a point inside its form) plus two uniforms (focus, explode) is enough: when a form is opened its pieces leave the form in rings around the hero picture and land on the DOM board's layout, the form shrinks away and every other form recedes, the camera ends straight in front of the board, and Esc runs it back. It is wrong if the pieces do not read as one board (overlaps, gaps, wrong order), if the load of the pictures stalls the flight, or if the pictures look unusably soft at board size.
method: In the forms lab (/lab/forms), "open as: board of all media" is the default and "cube net" keeps EXP-0016. Click a form and compare, by eye on WebGPU and on ?gl=webgl2, the board with the DOM entity view of the same entity; check the first open (pictures load lazily) against a second open.
materials: [entity-form, rest-cube, texture-array, entity-media]
tools: [next-prototype, three-js, tsl]
outcome:
decisions: [DDR-0004, ADR-0019]
tags: [entity-view, entity-form, webgpu, tsl, board, animation]
parts: [entity, field]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# EXP-0017: Entity view as a board: click a form, its pictures fly out of it into the radial board of all media

Follows [EXP-0016](../0016-entity-view-unfold-in-the-lab/README.md), whose cube net was the flat view of one entity. The owner asked for the view the entities have today: a board where all the media can be seen. The board rule is the DOM board's (`components/field/interior/placement.ts`, `radialFill`), see [entity view](../../../docs/design/entity-view.md). Step 4 of [one world, many cameras](../../../docs/design/one-world-many-cameras.md).

## Hypothesis

1. **A second mesh, one material, no scene change.** The board is one `InstancedMesh` of unit planes in its own texture array. Every picture of every entity is one instance, collapsed to its form's centre, so the draw count grows by one.
2. **The layout is data, not shader logic.** `board.ts` packs an entity's pictures in rings around the hero (first picture) on a module grid: landscape 5 modules wide, portrait 4, video 7, one empty module between pieces, golden-angle preferred directions. The result is written per instance (offset, size, ring delay) once at start.
3. **The flight is one smoothstep per piece.** `explode` runs 0 to 1; a piece's `t = smoothstep(delay, delay + 0.6, explode)` moves it from the form's centre to its slot and scales it from a point to its size. Pieces of other entities stay a point.
4. **The form gives way.** While the view opens, the focused form shrinks to nothing (`explode`) and every other form shrinks (`recede`), so the board is the only thing in view. The camera ends at the board's centre, far enough to fit it.
5. **Pictures load when needed.** The board layers fill only when an entity is first opened (hero first, four at a time), not at start.

## Method

Code, in `apps/web/components/forms-lab/`: `board.ts` (layout), `board-mesh.ts` (mesh, material, lazy layers), `form.ts` (`explode` and `recede` uniforms), `scene.ts` (`entityView` option, camera fit to the board), `FormsLab.tsx` (the "open as" select), `faces.ts` (`board` list per entity), `layers.ts` (`loadImage` and `makeStore` shared with the faces).

Steps, by eye, on both backends:

1. Click a form: the other forms shrink away, the form shrinks, the pictures leave it ring by ring and settle into the board; the camera frames the board.
2. Compare with the same entity in the DOM view: hero in the middle, same side-by-side spread, no overlaps.
3. First open: pictures pop in as they load, the flight is not delayed by them. Second open: all there at once.
4. Esc or the button: the pieces return, the forms grow back, the camera goes home.
5. Switch "open as" to cube net: EXP-0016 behaviour is unchanged.
6. An entity with no picture opens as the net.

## Observations

**2026-11-06, built** (branch `exp/0006-spaces`). Type-check and lint pass (lint: 0 errors, the 6 existing warnings are outside the lab). Not yet seen on screen; the steps above are for the owner.

From the code, before the by-eye check:

1. **The board layout is a copy of the DOM rule without text.** Same module widths, one empty module, golden-angle direction, the vertical stretch by 16/9. The DOM board also places text blocks; this one does not.
2. **Pictures are drawn uncropped.** Each picture is drawn at its own ratio into the centre of a 256² layer, and the quad samples that centre only; the layer margin is transparent and never shown.
3. **Cost up front.** One layer per picture of every entity (max 256 layers) is about 44 MB of texture memory plus mips, allocated at start but filled only on first open.

## Outcome

Not final: nothing is seen yet. Status stays running.

Predictions to test, not results:

1. At 256² a hero piece that fills much of the screen will look soft. If it does, the board needs its own larger layers for the opened entity (the same limit as EXP-0016 deduction 5).
2. Receding the other forms by scale makes the board readable without a separate scene; if it still looks busy, fade them instead.
3. If the flight reads well, the DOM board in `components/field/interior/` can be dropped in favour of this one.

**2026-11-06, handoff added by [EXP-0018](../0018-satellite-forms-around-the-entity-form/README.md).** The hero picture now starts as the form's front face and the other pictures start from their satellites' live positions, instead of every piece leaving a point at the form's centre. Hypothesis 3 (each piece scales from a point) holds only for pictures without a satellite. The tuning numbers moved to `components/forms-lab/config.ts`.

## Next

- Owner runs the click list and reports.
- If the softness shows, test per-entity higher-resolution layers loaded on open.
- Video pieces show a still; playing them in the board is a separate step.
