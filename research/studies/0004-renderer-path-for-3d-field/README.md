---
id: STU-0004
title: Which renderer path lets the field embed 3D content and read as a real place
date: 2026-11-06
status: running
parts: [field, entity]
question: Which renderer path lets the field embed 3D content (models) and read as a real place, and still scale from hundreds to 100,000 entities: WebGLRenderer, WebGPURenderer with its WebGL 2 fallback, or DOM cards over a WebGL ground?
sources:
  - "gpuweb wiki, Implementation Status (edited 2026-10-02), https://github.com/gpuweb/gpuweb/wiki/Implementation-Status"
  - "caniuse, WebGPU (October 2026 usage), https://caniuse.com/webgpu"
  - "web.dev, WebGPU is now supported in major browsers (2025-11-25), https://web.dev/blog/webgpu-supported-major-browsers"
  - "three.js docs, WebGPURenderer, https://threejs.org/docs/pages/WebGPURenderer.html"
  - "Utsubo, Migrate Three.js to WebGPU (updated 2026-09-24, checked on r186), https://www.utsubo.com/blog/webgpu-threejs-migration-guide"
  - "three.js wiki, Migration Guide (r180 to r187), https://github.com/mrdoob/three.js/wiki/Migration-Guide"
  - "three.js wiki, Three.js Shading Language, https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language"
  - "three.js issue 26719 and troika issue 359 (troika and WebGPURenderer)"
  - "three.js PR 35191 (GPUDrivenDrawer) and Three.js Blocks ComputeBatchCulling"
  - "Khronos KTX and Basis Universal; Don McCurdy figures via threejsresources.com"
  - "web3dsurvey, MAX_ARRAY_TEXTURE_LAYERS"
  - "PixPlot, Yale DH Lab"
  - "three.js forum, instanced mesh picking; @three.ez/instanced-mesh"
deductions:
  - "Stay on WebGLRenderer for step 2 (cards as textured planes); WebGPURenderer buys nothing amorf needs and costs a rewrite of the ground's fog patch."
  - "Keep text in the DOM, projected through the CSS-matched camera; troika-three-text cannot run on WebGPURenderer, so in-scene text would make migration harder."
  - "Write the scene against the portable subset (node-compatible materials, InstancedMesh or BatchedMesh, KTX2, no postprocessing library) so a later swap is one file."
  - "Scale is a data and texture-residency problem, not a renderer problem: cell-sharded instance data, a thumbnail pyramid published as KTX2, and cell-grid culling and picking reach 100k on WebGL 2."
  - "WebGPU compute is a drop-in replacement for the culling step, first useful around 100k and necessary only beyond it; it cannot be the only path because about 12% of visitors lack WebGPU."
raises: [EXP-0012]
tags: [webgl, webgpu, three-js, scale, ground, place-not-void]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# STU-0004: Which renderer path lets the field embed 3D content and read as a real place

## Question

[ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md) put a three.js `WebGLRenderer` ground behind the CSS cards ([EXP-0012](../../experiments/0012-webgl-ground-against-css-void/README.md)). The owner now wants to embed 3D models, make the field "more real", reach far more entities than today's few hundred, and is weighing `WebGPURenderer` with TSL. The question is which path serves that: `WebGLRenderer`, `WebGPURenderer` with its WebGL 2 fallback, or cards that stay DOM over a WebGL ground. It extends [STU-0003](../0003-place-not-void/README.md) deductions 1, 11 and 12 and serves the [field](../../theory/ontology/field.md) and the entity.

A pasted claim reached the owner: "WebGL will choke on thousands of entities; compute shaders are needed; use Lit components". It does not fit amorf; see Deduction 6.

## Sources

Desk research on 2026-11-06, current to three r187 (the installed version is 0.187.0). Most three.js claims come from the official docs and wiki; where only a third-party guide says it (mainly Utsubo, tested on r186), it is marked. Facts I could not confirm are in "Not verified" at the end of Reading. Links are in the frontmatter and inline below.

## Reading

### 1. WebGPU support now

- **Chrome and Edge:** on by default from 113 on Windows (D3D12), macOS and ChromeOS; Android from 121 for ARM, Qualcomm and Intel GPUs on Android 12 or later; Imagination GPUs on Android 16 from 139; Samsung Xclipse not yet; Linux only for Intel Gen12+ (144) and NVIDIA on Wayland (147); Windows on ARM64 behind a flag ([gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)).
- **Safari:** on by default from 26.0 on macOS, iOS, iPadOS and visionOS (shipped September 2025); only on the version 26 operating systems ([gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status), [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)).
- **Firefox:** Windows from 141; Apple Silicon Macs from 145 on macOS 26 and from 147 on any macOS; Intel Macs and Linux Nightly only; Android off by default (behind a setting in Beta and Nightly) ([gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)).
- **Coverage:** caniuse shows 86.83% full plus 1.8% partial (Safari desktop) = 88.63% global usage, with a banner dating the figure to October 2026 ([caniuse](https://caniuse.com/webgpu)). Utsubo quotes about 87% for August 2026 ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). So about 11 to 13% of visitors take the fallback: Firefox on Linux, Android and Intel Macs, older iOS and macOS, Android devices with unlisted GPUs.

### 2. WebGPURenderer status at r187

- **Fallback:** the renderer tries a WebGPU backend and otherwise "falls back to a WebGL 2 backend"; `forceWebGL: true` always uses the WebGL 2 backend ([three.js docs](https://threejs.org/docs/pages/WebGPURenderer.html)). The choice is made once at init and never switches; `renderer.backend.isWebGPUBackend` and `isWebGLBackend` tell which one runs. If WebGL 2 is also missing, `init()` rejects ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)).
- **Init:** `renderAsync()` and `computeAsync()` have been deprecated since r181. `setAnimationLoop()` initialises the renderer; otherwise call `await renderer.init()` first, and `KTX2Loader.detectSupport()` only after it ([three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)). In r186 `render()` before init throws ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). This repo's `frame()` loop is its own `requestAnimationFrame`, so it must await `init()` once, then call the sync `render()`.
- **Imports:** `three/webgpu` and `three/tsl`, since r171; both entry points share one core, but `three/webgpu` does not export `WebGLRenderer` ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). The installed package exports both paths.
- **Readiness:** Utsubo quotes the official manual as still calling `WebGLRenderer` "the recommended choice for pure WebGL 2 applications" and `WebGPURenderer` experimental (second-hand; I could not fetch the manual page). It also reports scenes where `WebGPURenderer` is slower and a forum thread of about 2x CPU cost on many-mesh scenes (r183). The WebGL 2 fallback is a separate code path from `WebGLRenderer`, with open bugs: it never deletes GL programs, shaders or VAOs ([issue 34597](https://github.com/mrdoob/three.js/issues/34597)).
- **Bundle:** `three/webgpu` was about 792 KB minified, 220 KB gzipped in an esbuild test on r186; adding `WebGLRenderer` beside it reached 1,155 KB, 307 KB gzipped ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). Another app saw the WebGPU chunk at 619 KB raw, 178 KB gzipped, and warns that `manualChunks` can pull it into the eager chunk ([webgl-diceroller issue 297](https://github.com/ford442/webgl-diceroller/issues/297)). Our current `three` chunk is about 744 KB raw (ADR-0019). So the two are the same order of size; WebGPURenderer is no saving.
- **Gaps that matter:** `ShaderMaterial`, `RawShaderMaterial` and `onBeforeCompile` do not work on either backend and must be written in TSL; `EffectComposer` and pmndrs postprocessing do not work (use `RenderPipeline`, named `PostProcessing` before r183); shadows were reworked in r183 and `PCFSoftShadowMap` is gone in r186 (`PCFShadowMap` is now soft); `WebGLCubeRenderTarget` is replaced by `CubeRenderTarget` ([Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). Options exist for `antialias` (MSAA, 4 samples), `samples` and `logarithmicDepthBuffer`; reversed depth exists in both renderers and takes precedence over logarithmic depth since PR 35276 ([docs](https://threejs.org/docs/pages/WebGPURenderer.html), [PR 35276](https://github.com/mrdoob/three.js/pull/35276)). `VideoTexture` takes an anisotropy parameter and needs `colorSpace = SRGBColorSpace` on WebGPURenderer ([VideoTexture docs](https://threejs.org/docs/pages/VideoTexture.html)). I found nothing on `CanvasTexture` or on anisotropy for the new renderer beyond a 2023 issue asking for `getMaxAnisotropy` ([issue 27274](https://github.com/mrdoob/three.js/issues/27274)); both are unverified here.
- **Mixing with a WebGLRenderer:** no source tests two renderers in one page. Both entry points share one core, so it is possible at about +363 KB minified; I did not verify that a scene can be shared.

### 3. TSL

- `Fn(callback, layout)` (formerly `tslFn`) builds shader functions with a managed scope; node materials take nodes in slots (`colorNode`, `opacityNode`, `positionNode`, and so on); `positionNode` replaces the vertex position in local space, and since r185 `positionLocal` inside it no longer carries skinning, so use `positionGeometry` ([TSL wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language), [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)). TSL compiles to WGSL or to GLSL for the fallback.
- **Compute:** `Fn(...)().compute(count)` run by `renderer.compute(...)`, with `instancedArray` and `storage` buffers. Utsubo says it is emulated on WebGL 2 with transform feedback, the dispatch size must be one number, and workgroup memory, storage textures, indirect dispatch and indirect draws do not work there, so spatial hashing (which needs atomics or workgroup memory) "usually needs the WebGPU backend" ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). A 2026 tutorial site says the opposite, that three.js does not emulate compute and WebGL 2 users get nothing ([threejsroadmap](https://threejsroadmap.com/blog/introduction-to-webgpu-compute-shaders)). I could not settle it from three.js source, so treat compute on the fallback as limited and unproven.

### 4. What "more real" needs

| Need | On WebGLRenderer | On WebGPURenderer | Source |
| --- | --- | --- | --- |
| glTF/GLB, Draco, meshopt, KTX2 | Works | Works; `KTX2Loader.detectSupport(renderer)` after `await renderer.init()` | [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [forum](https://discourse.threejs.org/t/webgpurenderer-compressed-texture-ktx2-basis/69362) |
| HDR environment, PMREM | Works (`RGBELoader` is now `HDRLoader`) | Works; `Environment` with children rendered no reflections on the WebGL 2 fallback in Utsubo's test | [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide), [Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) |
| Soft shadows | PCF, VSM | `PCFShadowMap` is soft since r186; bias needs retuning since r183 | [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) |
| Contact shadow under a card | Blob texture on a plane, or a baked radial gradient; no shadow map needed | Same; no source tests a shadow-map contact shadow | my reading |
| Image and video textures | `CanvasTexture`, `VideoTexture`, `CompressedTexture` | `VideoTexture` documented; `CanvasTexture` unverified | [VideoTexture](https://threejs.org/docs/pages/VideoTexture.html) |
| Text in 3D | troika-three-text works | troika does not work | [issue 26719](https://github.com/mrdoob/three.js/issues/26719), [troika 359](https://github.com/protectwise/troika/issues/359) |
| Picking and hover | `Raycaster`, or grid lookup, or ID buffer | Same on the CPU; ID buffer needs an async readback | [forum](https://discourse.threejs.org/t/best-way-to-do-instanced-mesh-picking-in-2024/59917) |

- **Text:** troika patches shaders with `onBeforeCompile`, which `WebGPURenderer` ignores; a three.js collaborator said a port should use node materials, and an issue asking for a TSL port has been open for over a year ([issue 26719](https://github.com/mrdoob/three.js/issues/26719), [troika 359](https://github.com/protectwise/troika/issues/359)). Utsubo's test: drei's `Text` "crashed the WebGPU render pass and drew nothing on WebGL 2". Working alternatives are MSDF text (`three-msdf-text-utils`, used with `MSDFTextNodeMaterial` in a [Codrops tutorial](https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/)) and [three-text](https://github.com/countertype/three-text), which states WebGPU support. Keeping labels as DOM over the canvas is the other path: `CSS2DRenderer` and `CSS3DRenderer` only read the scene graph and camera and draw no pixels ([CSS2DRenderer docs](https://threejs.org/docs/pages/CSS2DRenderer.html)); a forum answer notes that this means two layers and no depth occlusion between DOM and meshes ([forum](https://discourse.threejs.org/t/occlusion-between-css3d-renderer-and-webgl-renderer/55722)). Apple's spatial design guidance is to keep text flat ([WWDC23](https://developer.apple.com/videos/play/wwdc2023/10072/), already in STU-0003).

### 5. Scale: 1k, 10k and 100k entities

Memory arithmetic is mine: RGBA8 is 4 bytes per pixel; a 4x4-block format with 16-byte blocks (BC7, ASTC 4x4, ETC2 RGBA) is 1 byte per pixel, 4x smaller; 8-byte-block formats are 8x smaller; a full mip chain adds a third to both. KTX2 with Basis stays block-compressed on the GPU, while PNG and JPEG are fully decoded in VRAM ([Khronos](https://www.khronos.org/ktx/), [threejsresources](https://threejsresources.com/guides/textures)).

| Entities | Thumb per entity | RGBA8 in VRAM | KTX2, 1 byte per pixel |
| --- | --- | --- | --- |
| 1,000 | 256 px | 262 MB (349 MB with mips) | 65 MB |
| 10,000 | 256 px | 2.6 GB (3.5 GB with mips) | 655 MB (873 MB) |
| 10,000 | 128 px | 655 MB | 164 MB |
| 100,000 | 64 px | 1.64 GB | 410 MB (546 MB) |
| 100,000 | 32 px | 410 MB | 102 MB |

Even compressed, 100k at 64 px is over 400 MB, so no tier can keep all thumbnails resident; the resident set must follow the camera. A resident set of 3,000 mid thumbs at 128 px (49 MB compressed) plus 30 near images at 1024 px (about 42 MB with mips) is about 100 MB at any N. This is the same lesson as [PixPlot](https://github.com/YaleDHLab/pix-plot), which keeps images in atlases and tells users with more than 100,000 images to shrink the per-image cell size to lower GPU RAM.

| Tier | First bottleneck | What solves it on WebGL 2 | Compute needed? |
| --- | --- | --- | --- |
| Today (100 to a few hundred) | None in the GL layer; cards are DOM | Nothing | No |
| 1k | Draw calls if each card is its own mesh; texture memory (262 MB RGBA); build-time fetch of one `entity.json` each (ADR-0004) | `InstancedMesh` or `BatchedMesh` for card planes, one draw call per LOD tier; `DataArrayTexture` for same-size thumbs; KTX2 | No |
| 10k | Texture memory (2.6 GB RGBA); network (10k files); page weight if entities are props in the HTML | Thumbnail pyramid as KTX2 atlases or array layers, streamed per cell; LOD (colour, small thumb, full image); one compact index for far data; cell-grid culling | No |
| 100k | Index size and publish time; per-frame CPU for matrices and culling; resident-set churn | Same architecture, with per-cell instance buffers, fixed-capacity `count` per LOD, culling by visited cells (tens of cells in view, not 100k instances) | Nice to have, not required |

- **Draw calls:** merge many objects sharing one material into one draw call with `BatchedMesh` (since r156, works on both renderers; per-instance opacity since r183) or `InstancedMesh`; array textures give one draw call across many images but need equal dimensions ([threejsroadmap](https://threejsroadmap.com/blog/draw-calls-the-silent-killer), [Utsubo tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). Array layers are limited: 256 is the WebGL 2 minimum, 2048 is typical (Android 95%, desktop and iOS 100% at least 2048), Firefox reports less on some setups, so read `MAX_ARRAY_TEXTURE_LAYERS` ([web3dsurvey](https://web3dsurvey.com/webgl2/parameters/MAX_ARRAY_TEXTURE_LAYERS)). So atlases (many thumbs per layer) inside array layers.
- **CPU culling:** plain `InstancedMesh` culls as one box; per-instance culling is a JS loop, about 3 ms for 1M by one tutorial, so about 0.3 ms for 100k by linear scaling (not measured) ([mysimulator](https://www.mysimulator.uk/content/tutorials/instancedmesh-guide.html)). `InstancedMesh2` adds a BVH for culling and raycasting, best on mostly static data ([@three.ez/instanced-mesh](https://www.npmjs.com/package/@three.ez/instanced-mesh)). amorf's field is a torus with a known grid, so a cell grid is simpler than a BVH.
- **GPU culling and indirect draw:** `geometry.setIndirect()` with `IndirectStorageBufferAttribute` and compute-written draw arguments is WebGPU-backend only ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)); indirect dispatch landed in PR 31488; Three.js Blocks ships `IndirectBatchedMesh` and `ComputeBatchCulling` (r181) ([Blocks](https://www.threejs-blocks.com/docs/ComputeBatchCulling)); a `GPUDrivenDrawer` with meshlet culling and LOD by screen-space error is proposed in [PR 35191](https://github.com/mrdoob/three.js/pull/35191); I could not tell whether it merged. So compute culling exists today only as an add-on.
- **Picking:** GPU id-buffer picking is the only option when a vertex shader moves instances, but it needs an async readback and finds only the visible instance under the cursor; CPU raycasting over instances loops over all of them, and a BVH on geometry does not help the set ([forum](https://discourse.threejs.org/t/best-way-to-do-instanced-mesh-picking-in-2024/59917)). Cards are planes at known positions on the ground, so the cheap path is: cast the cursor ray, look up the few grid cells it crosses, intersect only their cards.
- **amorf constraint:** entity media is in R2 and fetched per entity; `entities:sync` uploads each file and writes `index.json` ([services-and-data](../../../docs/conventions/services-and-data.md), [entities](../../../docs/conventions/entities.md)); the field receives entities as props from a build-time loader (ADR-0004), which fetches every `entity.json`. That breaks first, around 1k to 10k: thousands of build-time fetches and a page that embeds all entity JSON. Thumbnail variants, KTX2 atlases, per-cell shards and a compact binary index (for example id, x, z, colour at 16 bytes each, 1.6 MB for 100k, my arithmetic) are publish-time outputs of `entities:sync`, not runtime work.

### Not verified

- The manual's own wording on `WebGPURenderer` readiness (only via Utsubo); `CanvasTexture` and anisotropy on the new renderer; shadow-map contact shadows on it; two renderers in one page; whether `fitCamera`'s hand-edited `projectionMatrix.elements[9]` survives the WebGPU coordinate system (it only touches the principal-point row, so I expect it to, but it needs the Node check); whether PR 35191 merged; real byte sizes of ETC1S output for amorf's images; how many DOM cards the CSS field can carry before it slows.

## Deductions

1. **Stay on `WebGLRenderer` for step 2.** The ground works, loads lazily and has a Node check at 0 px ([ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md)); `WebGPURenderer` is still described as experimental, can be slower on many-mesh scenes, and its fallback is its own code path with open leaks (Reading 2, [Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide), [issue 34597](https://github.com/mrdoob/three.js/issues/34597)). Migrating would rewrite `ground.ts`'s `onBeforeCompile` fog fade in TSL and re-test the `CanvasTexture` and anisotropy path for a gain amorf does not need.
2. **Keep text in the DOM.** troika cannot run on `WebGPURenderer` ([issue 26719](https://github.com/mrdoob/three.js/issues/26719)); labels that stay DOM over the canvas work on either renderer, stay crisp and selectable, and match the guidance to keep text flat ([WWDC23](https://developer.apple.com/videos/play/wwdc2023/10072/)).
3. **Write the scene against the portable subset**: stock materials (`MeshBasicMaterial`, `MeshStandardMaterial`), no `ShaderMaterial` beyond the one fog patch, isolated in one function, `InstancedMesh` or `BatchedMesh`, `KTX2Loader`, no `EffectComposer` (Reading 2 gaps). Then moving to `three/webgpu` later is the swap of one renderer factory and one fog node, not a rewrite.
4. **Scale is a data and residency problem.** At 10k, RGBA thumbnails need 2.6 GB and even KTX2 needs 655 MB, so thumbnails must be streamed by cell and chosen by distance; at 100k the index and the publish step are the limit, not draw calls (Reading 5, [Khronos](https://www.khronos.org/ktx/), [PixPlot](https://github.com/YaleDHLab/pix-plot)).
5. **WebGPU compute is a later optimisation of one step.** Cell-grid culling covers 100k on WebGL 2 because only the visited cells are touched; compute culling with indirect draw is WebGPU-only ([Utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)), about 12% of visitors lack WebGPU ([caniuse](https://caniuse.com/webgpu)), so the CPU path has to exist anyway. Compute becomes useful at about 100k only if per-instance state is animated on the GPU, and necessary only past that (judgement).
6. **The pasted claim does not fit amorf.** "WebGL chokes on thousands" is false for instanced planes: `InstancedMesh` and `BatchedMesh` draw tens of thousands in a few calls on WebGL 2 ([threejsroadmap](https://threejsroadmap.com/blog/draw-calls-the-silent-killer)); the limits are texture memory and data, which compute shaders do not remove. "Compute shaders needed" holds at neither today's few hundred nor 10k. "Lit components" is a different layer: amorf is React with no Lit, and web components do not affect how the canvas is drawn.
7. **The publish step carries the scale work.** Thumbnail pyramid, KTX2 atlases, cell shards and a compact index are generated by `entities:sync` and replace the per-entity build-time fetch of ADR-0004 once the field passes about 1k; this needs its own ADR when built (Reading 5, [services-and-data](../../../docs/conventions/services-and-data.md)).

## Recommendation

**Path from the ground spike to step 2 (cards as textured planes).** Stay on `WebGLRenderer`; do not adopt `WebGPURenderer` now.

1. **Rename the seam, not the renderer.** `ground.ts` becomes the scene module with one renderer factory and one place for the fog patch, so deduction 3 holds.
2. **Hybrid cards.** Far and mid cards become instanced planes in the scene (one `InstancedMesh` per LOD tier, thumbnails from a texture atlas); the near and focused card stays DOM, which keeps text, video, links and focus. This keeps deduction 2 and gives real occlusion between distant cards and models (STU-0003 deduction 11). A DOM card is always above the canvas, so a model nearer than a DOM card will draw behind it; accept that for the focused card only, which is nearest by construction, and test it before shipping.
3. **Models** load through `GLTFLoader` with Draco or meshopt and KTX2, lit by an HDR environment and one soft directional light, with a baked blob contact shadow under each card and model.
4. **Text and the CSS-camera match.** `fitCamera` in `ground-math.ts` is pure projection maths, so planes and DOM cards share the verified camera. Card planes use the pinned-card rule (bottom edge at `groundY`, origin at the top-left) so a plane and its DOM twin coincide at the swap. Extend the Node projection check (`check-projection.mjs`, 4000 poses, 0.000 px) to plane corners before any plane is shown; re-run it if a later move to `WebGPURenderer` changes the coordinate system. Labels for plane cards are DOM, positioned through the same projection; hide a label when its card is occluded.
5. **Scale path, in order.** Publish-time: size variants and KTX2 atlases in `entities:sync`; then cell shards and a compact index; supersede ADR-0004 when the build-time fetch of every `entity.json` stops being viable. Runtime: cell-grid culling and picking, resident-set budget about 100 MB, LOD by distance.
6. **Revisit `WebGPURenderer`** when the manual drops "experimental", or when an owner-chosen effect needs TSL or compute. Do it as a separate flagged experiment with `forceWebGL` for testing, and check `renderer.backend.isWebGPUBackend` before any WebGPU-only path.

## Next

- Open the experiment for step 2 (planes plus one embedded model) and an ADR for the renderer path once it has run.
- Measure, not assume: the `three` chunk against a `three/webgpu` chunk in this build; how many DOM cards the field carries before frame time rises; ETC1S size for real entity images.
- Check the manual page for `WebGPURenderer` readiness first-hand.
