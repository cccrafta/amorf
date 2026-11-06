---
title: "ADR-0019: Use three.js WebGPURenderer with TSL for the field's world, WebGL 2 as its automatic fallback, ?gl=0 as the opt-out"
status: proposed
date: 2026-11-06
deciders: [cccrafta]
supersedes:
superseded-by:
related: [EXP-0012, EXP-0013, STU-0003, STU-0004, STU-0005, ADR-0006, ADR-0007]
updated: 2026-11-06
last_verified: 2026-11-06
---

# ADR-0019: Use three.js WebGPURenderer with TSL for the field's world, WebGL 2 as its automatic fallback, ?gl=0 as the opt-out

## Context and Problem Statement

The field is CSS 3D: cards in perspective on a gradient, with no ground, depth buffer, shadows or haze, so it reads as cards floating in a void ([STU-0003](../../../research/studies/0003-place-not-void/README.md), deductions 1, 2 and 12). A spike drew a textured ground behind the cards with three.js `WebGLRenderer` ([EXP-0012](../../../research/experiments/0012-webgl-ground-against-css-void/README.md)); on 2026-11-05 the owner liked it and made it the default, with `?gl=0` as the opt-out. This record first chose that `WebGLRenderer` ground.

On 2026-11-06 the owner set a larger direction, [one world, many cameras](../../design/one-world-many-cameras.md): ground, entities, routes and spaces become objects in one real-time 3D scene, and the field, plan and journey views become cameras on it. The question is no longer only which renderer draws a ground, but which renderer the whole world is built on. [STU-0004](../../../research/studies/0004-renderer-path-for-3d-field/README.md) recommended staying on `WebGLRenderer` for now; the owner chose WebGPU first instead, so that a second migration does not follow the first. [STU-0005](../../../research/studies/0005-tesseract-reference/README.md) shows the chosen setup shipping on three r186.

The record was still `proposed`, so it is rewritten rather than superseded ([decision records](../../conventions/decision-records.md)). Since step 1 of the design page (2026-11-06, [EXP-0013](../../../research/experiments/0013-scene-core-on-webgpu/README.md)) the code runs `WebGPURenderer`: the renderer, scene and camera in `apps/web/components/field/world.ts`, the ground as a TSL node material in `ground.ts`.

## Decision Drivers

- One scene for the whole world, seen through several cameras, holding ground, instanced entity planes, 3D thumbnails, glTF models and routes, and later scaling to 100,000 entities (STU-0004 Reading 5).
- One shader language for both backends: custom shading written once runs on WebGPU and on the WebGL 2 fallback without a second hand-written path.
- About 11 to 13% of visitors have no WebGPU (STU-0004 Reading 1), so every feature needs a WebGL 2 path, and a visitor with neither still gets a working site.
- The field's loop is an imperative `requestAnimationFrame` function in a class component (`Field.frame()`); the renderer is driven from it, not from a second loop or a React tree.
- The eager bundle must not grow: three loads by dynamic import after first paint, and a visitor with `?gl=0` does not download it.
- Static export, client only ([next-16-static-export](../../conventions/next-16-static-export.md)); no Next-specific loader or plugin ([ADR-0006](0006-turbopack-no-custom-webpack.md)).

## Considered Options

- three.js `WebGLRenderer`, with stock materials and one `onBeforeCompile` patch (the STU-0004 recommendation).
- three.js `WebGPURenderer` from `three/webgpu`, with node materials and TSL, falling back to its WebGL 2 backend.
- Raw WebGPU and WebGL 2, without a library.
- react-three-fiber.

## Decision Outcome

Chosen option: "three.js `WebGPURenderer` from `three/webgpu`, with node materials and TSL", because it gives one scene graph and one shader language across WebGPU and the WebGL 2 fallback, opens compute for later scale work without a second engine, and keeps the imperative loop in charge.

Rules that follow from it:

- **Import and start.** Load `three/webgpu` (and `three/tsl` for nodes) by dynamic import from the field, never statically. Create one `WebGPURenderer`, `await renderer.init()` once, then call the synchronous `render()` from `frame()`. Do not use `setAnimationLoop`, `renderAsync` or `computeAsync` (deprecated since r181).
- **Backend.** Read `renderer.backend.isWebGPUBackend` once after `init()`. Any WebGPU-only path (compute culling, indirect draw, storage textures) checks it and has a CPU or WebGL 2 path beside it. The WebGL 2 backend gets the lower quality tier.
- **Shading.** Node materials and TSL only. No `ShaderMaterial`, no `RawShaderMaterial`, no `onBeforeCompile`, no `EffectComposer` or pmndrs postprocessing; post-processing, if any, goes through `RenderPipeline`.
- **Text.** Labels and overlays stay DOM, placed by projecting world points through the scene camera. Text that must lie in the world or be hidden behind it uses MSDF text with a node material. troika-three-text is not used; it does not run on this renderer.
- **Flags.** `?gl=0` keeps the CSS-only field and does not load three. `?gl=webgl2` forces the WebGL 2 backend (`forceWebGL: true`) for testing; the canvas carries `data-backend` with the backend in use. If both backends fail, the field falls back to CSS-only for the session, as today.
- **Camera.** Set `camera.coordinateSystem = renderer.coordinateSystem` before building its projection: the renderer relabels a camera's coordinate system at render time but does not rebuild the matrix.

### Consequences

- Good: one scene and one shader source for both backends; the field, plan and journey cameras ([STU-0005](../../../research/studies/0005-tesseract-reference/README.md) deduction 4) and the later entity views share one world.
- Good: compute (`Fn(...)().compute(n)`, storage buffers) is available on the WebGPU backend for culling and per-instance state once the field passes about 100k entities (STU-0004 deduction 5).
- Bad: the ground's `onBeforeCompile` fog fade must be rewritten as a TSL node (alpha times one minus a smoothstep on view depth), and the `CanvasTexture` with anisotropy path must be re-tested on both backends; neither is verified yet (STU-0004 Reading 2 and "Not verified").
- Bad: the WebGL 2 fallback is a separate code path from `WebGLRenderer`, with open bugs, among them GL programs, shaders and VAOs that are never deleted ([issue 34597](https://github.com/mrdoob/three.js/issues/34597)). Both backends are checked by hand at each step, and leaks are watched on long walks.
- Bad: the official manual is reported to still call `WebGPURenderer` experimental, and some many-mesh scenes run slower on it (STU-0004 Reading 2, second-hand). Mitigation: few draw calls through `InstancedMesh` or `BatchedMesh`, which the scale plan needs anyway.
- Bad: a larger lazy bundle. Measured in step 1: 1.17 MB raw (about 311 KB gzipped) across two lazy chunks, against about 744 KB raw for the `WebGLRenderer` chunk; the third-party figure of 792 KB (STU-0004 Reading 2) was low. It stays lazy; the reference site ships about 880 KB of three eagerly, which amorf does not copy (STU-0005 deduction 2).
- Bad: two projections still stay in step by hand while the DOM field exists: CSS `perspective: P` with its origin at 46% height, and the three.js camera. `fitCamera` in `components/field/ground-math.ts` edits `projectionMatrix.elements[9]`, and WebGPU uses a 0 to 1 clip depth, so the Node projection comparison must pass again on the new renderer before anything else moves.
- Neutral: `three` and `@types/three` stay the dependencies; `three/webgpu` and `three/tsl` are entry points of the same package. If the world is dropped, remove `world.ts`, `ground.ts`, `ground-math.ts`, their call sites in `Field.tsx`, `tracks.ts`, `ui/stage.tsx` and `route.ts`, and both dependencies.

### Confirmation

- `pnpm build` succeeds (static export), and the eager chunks listed as scripts in `out/index.html` contain none of three's internals. *Met 2026-11-06 (EXP-0013).*
- The Node projection comparison (4000 random poses at two viewport sizes, 0 px on `WebGLRenderer` on 2026-11-05) reports 0 px against the camera the new renderer uses. *Met 2026-11-06: 0.0000 px under both coordinate systems (EXP-0013).*
- The ground renders the same on the WebGPU backend and with the WebGL 2 backend forced, at least in Chrome and Safari 26, and `?gl=0` loads no three chunk.
- The status stays proposed until step 1 of [one world, many cameras](../../design/one-world-many-cameras.md) has run and the owner has judged it.

## Pros and Cons of the Options

### three.js `WebGLRenderer`

- Good: the ground already works on it, and the manual still recommends it for WebGL 2 applications.
- Good: troika text and every existing example and add-on run on it.
- Bad: custom shading through `onBeforeCompile` and `ShaderMaterial` would be rewritten when the world moves to WebGPU; the more of the world is built first, the larger that rewrite.
- Bad: no compute; GPU culling and indirect draw are WebGPU-backend only.

### three.js `WebGPURenderer` with TSL

- Good: one scene graph and one shader language for both backends; compute where available.
- Good: shipping practice on current three (STU-0005 deduction 1).
- Bad: newer, with a separate fallback path that has open bugs, and fewer working add-ons (no troika, no `EffectComposer`).

### Raw WebGPU and WebGL 2

- Good: smallest code, no dependency.
- Bad: two renderers written by hand, plus mipmaps, anisotropy, colour management, a scene graph, glTF loading and picking. Not justified for a design-research site.

### react-three-fiber

- Good: declarative scene.
- Bad: it runs its own render loop and React reconciler, which fights the imperative `frame()` loop that already owns the camera and the card styles. Rejected.

## More Information

- Direction and order of work: [one world, many cameras](../../design/one-world-many-cameras.md).
- Operational notes on today's ground: the "Ground (2026-11-05, experiment)" section of [the entity view design page](../../design/entity-view.md).
- Evidence: [STU-0004](../../../research/studies/0004-renderer-path-for-3d-field/README.md) (support, gaps, scale), [STU-0005](../../../research/studies/0005-tesseract-reference/README.md) (reference build), [EXP-0012](../../../research/experiments/0012-webgl-ground-against-css-void/README.md), [STU-0003](../../../research/studies/0003-place-not-void/README.md).
- The file name keeps the first title so existing links hold.
