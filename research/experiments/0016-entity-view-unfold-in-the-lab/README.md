---
id: EXP-0016
title: Entity view in three.js: click a form, the camera moves in, the form unfolds into its flat board
date: 2026-11-06
status: running
question: Can the same instanced rest cube that draws every form also draw the entity view, by unfolding one instance into its cube net in the vertex stage while the camera travels to it, and folding back, without a second mesh or a scene change?
hypothesis: One uniform set (focused index, calm, unfold) on the existing node material is enough: the focused instance fades its shape and outline to the plain box, faces the camera, and hinges its six faces flat into a cross, with its pictures reading upright and in order; the camera travels in one tween and back to exactly where it was. It is wrong if the net tears at a hinge, any face reads mirrored or upside down in a way that cannot be read as a net, the folded cube pops at the start of the unfold, or the camera does not return to its starting pose.
method: In the forms lab (/lab/forms), a click on a form (a ray against one bounding sphere per form, no GPU picking) starts the view; the camera tweens to straight in front of the net while the form calms and unfolds; Esc or the button folds it back and returns the camera. Compared by eye on WebGPU and on ?gl=webgl2, with test cards on and off.
materials: [entity-form, rest-cube, texture-array, entity-media]
tools: [next-prototype, three-js, tsl, first-person-notes]
outcome:
decisions: [DDR-0004, ADR-0019]
tags: [entity-view, entity-form, webgpu, tsl, cube-map, animation]
parts: [entity, field]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# EXP-0016: Entity view in three.js: click a form, the camera moves in, the form unfolds into its flat board

Step 4 of [one world, many cameras](../../../docs/design/one-world-many-cameras.md), tried in the lab only; the DOM entity view in `components/field/interior/` is untouched. The forms come from [EXP-0014](../0014-forms-with-media-faces/README.md) and [EXP-0015](../0015-form-outline-from-one-rest-cube/README.md). The cube net as the flat board is [STU-0006](../../studies/0006-media-projected-on-forms/README.md) deduction 5.

## Hypothesis

1. **One material, no second mesh.** The unfold is a per-instance branch in the same `positionNode`, driven by three uniforms: `focus` (instance index, -1 for none), `open` (0 to 1, the form calms to the plain box and faces +z) and `unfold` (0 folded, 1 flat).
2. **A cross net by hinges.** Left, front, right in a row, top above the front, bottom below it, back below the bottom. Side faces hinge on the front's edges by phi (pi/2 folded, 0 flat); the back hinges on the bottom's far edge, so it turns by 2 phi. The folded pose equals the plain box exactly, so nothing pops when the unfold starts.
3. **One tween.** A single progress value p moves 0 to 1 and back. The form calms over the first 35 %, then unfolds; the camera travels the whole way and ends straight in front of the net, far enough to fit it. Folding back runs p in reverse and ends on the camera pose saved at the click.
4. **Picking without the GPU.** Vertices move in the shader, so a ray is tested against one bounding sphere per form from the known places.

## Method

Code, all in `apps/web/components/forms-lab/`: `form.ts` (net maths, `proportion`, three new uniforms), `scene.ts` (picking, the tween, key and pointer handlers), `FormsLab.tsx` (title and fold-back button).

three.js practice applied, from the threejsresources guides ([scene and renderer](https://threejsresources.com/guides/scene-renderer), [raycaster](https://threejsresources.com/guides/raycaster)):

- Every listener added in `startLab` (pointer on the canvas, key on the window, resize) is removed in `dispose`, with the geometry, material, texture, controls and renderer.
- The pointer is converted to normalised device coordinates against the canvas rectangle, and a press that moves more than 5 px is an orbit drag, not a click.
- The raycaster, vectors and sphere are allocated once, not per event.
- The lab keeps its continuous loop because the forms turn all the time; a static scene would render on demand.

Steps, by eye, on both backends:

1. Click a form: the camera travels in, the form calms and faces you, then unfolds into a cross.
2. Test cards on: in the net, note each face's slot name, arrow and corner dot. The front and the side faces should read upright; note which faces turn over (the bottom and back are expected to, as in a paper net).
3. Net edges: no gaps or overlaps at the hinges, mid-unfold included.
4. Esc or the button: the net folds, the camera returns to where it was, orbit works again.
5. Click while another form is open: ignored. Click on empty ground: nothing.
6. Forms with an outline or sphere shape (per-form on): they calm to the plain box before unfolding.

## Observations

**2026-11-06, built** (branch `exp/0006-spaces`).

- Type-check, lint and `pnpm build` pass; `/lab/forms` still prerenders.
- Owner, first look (2026-11-06): "this is cool". Click, camera travel, unfold and fold back run. Not reported yet: `?gl=webgl2`, Safari 26, test-card orientation of each net face, hinge seams mid-unfold.

Findings from building (from the code and the maths, not from the screen):

1. **The net is hinge angles, not a second mesh.** With W, H, D the form's half-extents (D = W) and phi = (1 - unfold) · pi/2, every side face is `edge ± reach · (cos phi, sin phi)` about its front edge, where `reach = D - z` is the distance from the hinge. The back is the one two-level case: it hangs off the bottom's far edge and turns by 2 phi. At phi = pi/2 every formula gives the plain box back, so the first frame of the unfold equals the last frame of the calm.
2. **Calm and net blend with one factor.** `local = mix(outlinedPosition, net, f)` with `f = open` for the focused instance and 0 for all others. It is continuous because the net at phi = pi/2 equals the plain box, and the outline parameters are multiplied by `1 - f` so the outlined position reaches the plain box at the same moment.
3. **The camera makes the settle free.** The existing settle rule turns a form to face the camera. The view's camera ends straight in front of the net, so the facing angle ends at 0 and the net needs no angle logic of its own; the focused form only has its settle forced on (`near = max(near, f)`).
4. **Net size.** The cross is `2W + 4D` wide and `4H + 4D` tall; its centre sits H below the front's centre. Lifting the focused form by `2H + 2D` keeps it above the ground.
5. **Uv direction in the net (from three's BoxGeometry, to confirm on screen).** Right, left and top continue the front's upright direction across their hinges. The bottom and back come out upside down, as they do in a paper cross.
6. **Picking.** One sphere per form (radius 1.35 · the larger half-extent) is enough at this density; a ray against the vertices would need the shader's result on the CPU.
7. **Typing.** `rotY` is typed on `Node<"vec3">`, not the type of one expression: `JoinNode` rejects a `mix` result.

## Outcome

Not final: the by-eye steps on both backends are not reported. Status stays running.

Deductions, conditional on the remaining checks:

1. **The entity view needs no second system.** The flat board is the same instanced rest cube with three uniforms. This supports STU-0006 deduction 5 (the net as the flat board) and means step 4 can reuse the forms from step 2 without a scene change.
2. **One progress value is the whole transition.** A single p, run forward and back, gives the camera travel, the calm, the unfold and the return pose; no separate fold-back animation exists.
3. **Cost stays per focused form.** Every other instance pays one extra `select` and nothing else; the draw count does not change with the view.
4. **The exploded view is the same move with more pieces.** A composition form (design page, form complexity 2) would give each piece its own hinge or offset in the same vertex stage; this experiment does not test that.
5. **Prediction to test, not a result:** a net that fills the screen shows each 256² face at roughly screen size, so the entity view probably needs its own higher-resolution layers for the focused form, beyond the 128² field budget in STU-0006.

## Next

- Run the by-eye steps on both backends and fill Outcome.
- If it holds, the exploded view (composition, design page step 2 of the form complexity plan) goes in the same view, and the glTF and plan views follow.
- Open: whether the real entity view keeps the DOM board and uses the net only as the transition, or draws the board as the net itself.
