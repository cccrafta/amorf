---
id: EXP-0020
title: Do forms placed over the field's cards read as the field's objects without losing its navigation?
date: 2026-11-18
status: running
question: When the field's entity cards are replaced by 3D forms anchored to the same places, do the forms read as the field's objects while pan, zoom, wrap, click and focus behave as before?
hypothesis: Forms anchored in the eye frame from the card's own maths sit exactly where the cards are at every yaw and across the torus seam, and the field keeps its navigation because the cards stay as the hit targets. It is wrong if a form drifts from its card at some yaw or offset, if a blank moment shows before the form is ready, or if the field's controls change behaviour with forms on.
method: Build phase 1 behind ?forms=1 and a HUD toggle (card pictures hidden, forms drawn by the world's scene, a click still opens the DOM entity view). Check the card-to-eye-frame mapping numerically at several yaws and wrapped offsets, then the owner looks at it on both backends.
materials: [forms-lab, entity-pictures]
tools: [three-webgpu, tsl]
outcome:
decisions: [DDR-0005, ADR-0019]
tags: [forms, field, anchors]
parts: [field, entity]
media: []
publish: false
case_study: null
updated: 2026-11-18
last_verified: 2026-11-18
---

# EXP-0020: Forms in the field

Rules: [../../../docs/conventions/research-log.md](../../../docs/conventions/research-log.md). Design context: [one-world-many-cameras](../../../docs/design/one-world-many-cameras.md), step 2.

## Hypothesis

Forms read as the field's objects, and the field keeps its navigation, if each form is placed from the same numbers as its card and the card stays as the hit target. Wrong if a form drifts from its card at any yaw, offset or across the seam, if a blank moment shows, or if any field control changes.

## Method

Phase 1 only: `?forms=1` (or the HUD "FORMS" toggle, disabled while the world is off) loads the forms code by dynamic import. The forms-lab form mesh is reused by import (`components/forms-lab/form.ts`, `layers.ts`, `satellites.ts`), and `/lab/forms` is unchanged. New code is in `components/field/forms/`. A click on a form's card opens the existing DOM entity view; the flight into the board (phase 2) is out of scope.

## Observations

Built 2026-11-18, not yet seen in a browser. What was built:

- **Placement.** Each entity is one instance in the world's scene. The anchor is computed per frame from the card's numbers (`forms/anchor.ts`, pure): with yaw `r`, torus wrap `w`, card offset `(lx, lz)` and `cz = lz - P`, the eye-frame point is `wx = lx cos r - cz sin r`, `wz = lx sin r + cz cos r`, `wy = cardH - 133`. The form faces the card's way (`yaw = w - r`), is scaled so its front face matches the card's plate (`k = min(200/sx, 133/sy)`), and its centre is pushed back by half its depth so the front face lies in the card's plane. Satellites use their parent's anchor. A numeric check of the front-face centre against the CSS plate centre gave 0.0000 px error at yaws 0, 37, 90, 181, -123 and 359, with offsets that wrap across the torus seam.
- **Replace.** Only the card's picture parts (plate svg, thumbnail, media slot) get `visibility: hidden`, and only once that entity's cover layer is loaded, so the layout box, hover, focus, click and Enter are unchanged and there is no blank moment. Turning forms off restores every card.
- **Render gate.** `paintWorld` renders every frame while forms are on and any motion is on; otherwise the eye-key gate plus a forms-changed counter decides.
- **Calm defaults.** Float on, satellites on one orbit plane per entity, satellite spin, morph and turn off; `prefers-reduced-motion` turns all motion off. The "tune forms" popup edits them and persists to `localStorage` key `amorf.forms`.
- **Textures.** The lab's layer store, loaded from the small derivatives (ADR-0020) only when forms turn on, and disposed with the mesh when they turn off or the field unmounts.

Three and WebGPU facts learned:

- The form mesh uses all 16 vertex attributes WebGPU allows, so the anchor cannot get its own attribute. A first version passed anchors in a TSL `uniformArray` indexed by instance; it drew nothing in the field (2026-11-18). Anchors now ride in the instance buffer, in slots the field leaves unused (D for x, y, z and opacity, C.x and C.y for yaw and scale), and each satellite carries a copy of its form's anchor. The buffer is re-sent only when an anchor changes.
- Placing forms in the eye frame (camera at the origin, `rotation.y = -yaw`) makes the card maths reusable as is; world space would need the torus offset folded in per instance.
- The lab's light is fixed to the model, so in the field it is rotated by a `lightYaw` uniform to stay fixed to the camera, as the cards' shading is.

## Outcome

Open: waiting for the owner's look on WebGPU and `?gl=webgl2`.

## Next

Phase 2 (hybrid, D6): the click flies the form's pictures out into the board, as in [EXP-0017](../0017-entity-view-board-explode-in-the-lab/README.md), instead of opening the DOM view. Risks to watch: the vertex cost of instances behind the camera (all forms and satellites run the vertex shader, SEG 24), the DOM blur (not mirrored on forms), and `compileAsync` being best effort.

## 2026-11-18: first light

Forms show in the field on WebGPU after the anchors moved from a `uniformArray` to the instance buffer (see the facts above). The owner confirmed they appear and follow the cards, and judged the look poor: placement works, the visual quality is the next step (scale against the plate, shading, the fog fade, satellite size and orbit). Phase 2 (the open into the entity view) waits on that.
