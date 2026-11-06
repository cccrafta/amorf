---
id: EXP-0013
title: The field's ground on WebGPURenderer with TSL, against the WebGLRenderer ground
date: 2026-11-06
status: running
question: Does the ground, moved from WebGLRenderer to WebGPURenderer with a TSL node material, look and behave the same on the WebGPU backend and on the forced WebGL 2 backend as it did on WebGLRenderer?
hypothesis: The same plane, texture and camera, with the onBeforeCompile fog fade rewritten as a TSL opacity node, draw a ground that cannot be told apart from the WebGLRenderer one on either backend, stay at 0 px against the CSS projection, and keep three out of the eager bundle. It is wrong if the backends differ visibly (texture direction, filtering, fade, colour), if the cards drift against the grid, or if three appears in an eager chunk.
method: Port the ground to three/webgpu (step 1 of one world, many cameras), rerun the Node projection comparison under WebGPU's clip space, check the build's eager chunks, then compare the ground by eye on the WebGPU backend, on ?gl=webgl2 and on ?gl=0, in Chrome and Safari 26.
materials: [field-ground]
tools: [next-prototype, three-js, first-person-notes]
outcome:
decisions: [ADR-0019]
tags: [ground, webgpu, tsl, renderer]
parts: [field]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# EXP-0013: The field's ground on WebGPURenderer with TSL, against the WebGLRenderer ground

Step 1 ("scene core") of [one world, many cameras](../../../docs/design/one-world-many-cameras.md). Decision record under test: [ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md) (proposed). The ground itself was tested in [EXP-0012](../0012-webgl-ground-against-css-void/README.md); this experiment only asks whether it survives the renderer change. Evidence for the renderer choice: [STU-0004](../../studies/0004-renderer-path-for-3d-field/README.md), [STU-0005](../../studies/0005-tesseract-reference/README.md).

## Hypothesis

Nothing the visitor sees should change. The world module (`apps/web/components/field/world.ts`) now owns one `WebGPURenderer`, one scene and one camera; the ground (`ground.ts`) is the first object in it. If the port is right, the only difference is underneath: one shader source for both backends, and a scene that step 2 can add entities to.

## Method

1. Port: `three/webgpu` and `three/tsl` by dynamic import, `await renderer.init()` once, synchronous `render()` from `frame()`. The ground uses `MeshBasicNodeMaterial`: `colorNode` samples the canvas texture at `uv * k + offset` (a `uniform` written per frame, replacing `Texture.offset` and `repeat`), and `opacityNode` is `1 - smoothstep(P + 400, P + 1.3 FAR, -positionView.z)`, the old `onBeforeCompile` fog fade.
2. Flags: `?gl=0` keeps the CSS-only field and loads no three; `?gl=webgl2` forces the WebGL 2 backend. The canvas carries `data-backend="webgpu"` or `"webgl2"` once the renderer has started.
3. Node checks: the projection comparison of EXP-0012, rerun under both clip spaces; the build's eager chunks searched for three internals.
4. By eye: the designer compares the ground on the default backend, on `?gl=webgl2` and on `?gl=0`, walking and turning, in Chrome and Safari 26.

## Observations

**2026-11-06, port built** (branch `exp/0006-spaces`).

- Camera. `WebGPURenderer` only relabels a camera's `coordinateSystem` at render time and does not rebuild its projection matrix, so a camera fitted for WebGL keeps a -1 to 1 depth range on WebGPU's 0 to 1 clip and loses its near half. The world sets `camera.coordinateSystem = renderer.coordinateSystem` before `fitCamera`. The principal-point shift (`projectionMatrix.elements[9]`) is the same in both coordinate systems.
- Projection. Node script: 4000 random poses per run, ground points and points up to 600 units above the ground, at 1440x900 and 390x844, projected through `fitCamera` and `eyeAt` and compared with the CSS pinhole (perspective 900, origin 50% 46%). Max error 0.0000 px under both `WebGLCoordinateSystem` and `WebGPUCoordinateSystem`; no visible point's depth falls outside clip range in either.
- Bundle. `pnpm build` passes. No eager script in `out/index.html` holds three's internals (searched for `WGSLNodeBuilder`, `GLSLNodeBuilder`, `copyExternalImageToTexture`); the eager field chunk only names `WebGPURenderer` as a property of the imported module. The lazy three chunks are 701 KB (core) and 466 KB (WebGPU and nodes), 1.17 MB raw and about 311 KB gzipped together, against about 744 KB raw for the `three` chunk before. That is larger than the 792 KB third-party figure in STU-0004 Reading 2.
- Not yet checked: anything in a browser. Texture direction under WebGL 2 versus WebGPU (a flipped v would make the grid slide the wrong way when walking forward), mipmap and anisotropic filtering toward the horizon, the fade, colour, and GPU memory on a long walk on the WebGL 2 backend (issue 34597).

Session notes go below, one dated entry per session.

- First look (2026-11-06, owner). The WebGPU backend runs smoothly. The field is "not as 3D as I thought": expected, since step 1 changes the engine and not the picture; the cards are still DOM, so nothing in the scene has depth yet besides the ground. Under `?gl=0` the owner prefers where the cards sit, near the middle of the screen; with the ground on they stand lower, because their bottom edge is pinned `EYE_HEIGHT` (480) below the eye. Carry into step 2: once cards are objects in the scene, eye height and a slight downward pitch can be tuned so cards sit near the middle while still standing on the ground.

## Outcome

## Next

- Run the by-eye comparison and fill Outcome. If it holds, the owner judges ADR-0019 for acceptance.
- Step 2: entities in the scene (instanced planes with thumbnails, a 3D thumbnail form, MSDF text, picking), its own experiment.
