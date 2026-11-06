---
id: EXP-0015
title: How far one rest cube stretches as an entity's outline (taper, twist, bend, relief, cut-outs) before its media stop reading
date: 2026-11-06
status: running
question: Which outline deformations of the one rest cube (round, taper, twist, bend, relief, cut-outs), set per form, keep the entity's media legible and the field calm, while still drawing every form in one call on both backends?
hypothesis: All five deformations run per instance in the same TSL material, still one draw for all forms, with the pictures fixed to the surface. Mild values read as variations of one family; strong twist, bend and relief make the media unreadable beyond a few form-widths, and a field where every form differs reads as noise. It is wrong if any deformation needs its own mesh or draw, if pictures tear at face edges, or if strong values still read well.
method: The forms lab (/lab/forms) gets sliders for taper, twist, bend, relief and cut, applied to all forms, and a per-form mode where each form gets one or two of them at seeded strengths; the owner judges legibility and calm by eye on WebGPU and ?gl=webgl2.
materials: [entity-form, rest-cube, texture-array, entity-media]
tools: [next-prototype, three-js, tsl, first-person-notes]
outcome:
decisions: [DDR-0004]
tags: [entity-form, webgpu, tsl, form-outline]
parts: [entity, field]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# EXP-0015: How far one rest cube stretches as an entity's outline

First of the four form-complexity steps the owner asked for on 2026-11-06 ([one world, many cameras](../../../docs/design/one-world-many-cameras.md), "Form complexity"): outline, then composition, then forms from data, then voids. Built on the bench of [EXP-0014](../0014-forms-with-media-faces/README.md).

## Hypothesis

Every outline is a function of the rest-cube point, so it belongs to the same system as the box-to-sphere morph: per-instance numbers, one material, one draw. The open part is not technical but visual: how much deformation the media survive, and how much variety the field survives.

## Method

All in `apps/web/components/forms-lab/form.ts`, in the vertex stage, in this order on the rest cube `c`:

1. Shape: cube to tan-warped sphere (EXP-0014).
2. Relief: four vertical ribs per face pushed out along the normal, faded to zero in a band at every face edge so faces still meet (adjacent faces' uv do not line up, so an unfaded relief would crack the edges).
3. Proportion from the cover (DDR-0004).
4. Taper: x and z shrink with height (1 = point). Twist: x and z turn about y with height (1 = a quarter turn). Bend: x leans with the square of the height (1 = one half-width at the top).
5. The form's own turn, then its place.

Cut-outs are in the fragment stage: a centred window in each of the four side faces, removed by alpha test; the material is double-sided so the inside of the far faces shows through. Shading now comes from screen derivatives of the world position, so any deformation shades correctly without its own normal maths; the normal is turned toward the camera because the derivative's sign differs between the WebGPU and WebGL framebuffers. `SEG` went from 16 to 24 for the ribs.

The lab's per-form mode gives each form one or two of the five at seeded strengths 0.3 to 1, so the variety is repeatable.

Steps, by eye, on WebGPU then `?gl=webgl2`:

1. Each slider alone, 0 to 1, at mid distance and close: where does the media stop reading?
2. Combine with the cube-to-sphere slider: anything tearing or inverting?
3. Per-form mode, turning on: one family, or noise?
4. Status line: still the same draw count as EXP-0014.

## Observations

**2026-11-06, built** (branch `exp/0006-spaces`). Type-check and lint pass. Not yet checked in a browser.

First run (owner, WebGPU): `Vertex buffer count (10) exceeds number vertex buffers (8)`, pipeline invalid, nothing drawn. WebGPU's default `maxVertexBuffers` is 8; position, normal, uv, `faceSlot`, three's `instanceMatrix` and five per-instance vec4 attributes made 10. Fixed by packing the five into one interleaved instanced array (stride 20). Second run: forms exploded into large flat triangles across the field. three wrapped the bare typed array in a plain `InterleavedBuffer`, and the WebGPU backend picks per-instance stepping only for `InstancedInterleavedBuffer`, so every vertex read a different form's data. Fixed by passing an `InstancedInterleavedBuffer` in directly. Budget for later steps: 6 of 8 buffers used, so further per-instance data goes into the same array, not new attributes.

Known by construction: taper at 1 collapses the top face to a point, so its picture vanishes; cut-outs show the inside of the opposite faces, which carry their own pictures seen from behind (mirrored).

## Outcome

## Next

- Owner's look on both backends; fill Outcome with which deformations and ranges stay.
- Then composition (several rest-cube pieces per entity), its own experiment.
