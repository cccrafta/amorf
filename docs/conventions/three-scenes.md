---
title: Three.js scene code (WebGPU and TSL)
updated: 2026-11-06
last_verified: 2026-11-06
status: applied in apps/web/components/forms-lab/; the field's scene (components/field/world.ts) follows when it takes the forms
---

# Three.js scene code

How scene code is organised, so a look is changed in one place and a GPU fact is written down once. The renderer rules (WebGPU first, TSL only, no `ShaderMaterial` or `onBeforeCompile`, WebGL 2 fallback) are in [ADR-0019](../decisions/adr/0019-webgpu-first-with-tsl.md); this page is about structure. The code is the source of truth and wins any disagreement. Paths are inside `apps/web/`.

The model is `components/forms-lab/`. It is a feature folder under [folder-structure.md](folder-structure.md): one folder, one file per concern.

## One file per concern

| File | Owns |
| --- | --- |
| `config.ts` | Every tuned number (sizes, speeds, timings, limits), grouped under comment headers by what it shapes. No logic. |
| `scene.ts` | The renderer, camera, input, the entity-view timeline and the frame loop. The only file that touches the DOM canvas and `requestAnimationFrame`. |
| `form.ts`, `board-mesh.ts` | One `InstancedMesh` each: its geometry, its per-instance data layout and its TSL material. |
| `orbit.ts`, `float.ts`, `flight.ts` | TSL node builders used by two meshes (the orbit, the cluster float, the board flight). Shared shader maths lives in its own file, never copied between meshes. |
| `satellites.ts`, `board.ts` | Placement and layout on the CPU: pure functions from data to numbers, no three.js. |
| `texture-store.ts`, `layers.ts` | The image fetch and the texture array (a service the meshes call), then the layers built on it. |
| `faces.ts` | Derivation from the entity's media to what is drawn. No rendering. |

## Rules

1. **Tuned numbers go in `config.ts`.** A constant that is a look or a limit (a duration, a radius range, a layer count) is exported from there with a one-line comment saying what it shapes. A constant that is a fact of the maths (`PI`, a golden angle) stays beside the code. A file does not declare its own tuning constants.
2. **Shared shader maths gets its own file.** If two materials need the same position, build it once as a function that returns TSL nodes and takes its uniforms from a factory (`makeOrbit(TSL)`); `scene.ts` creates it once and passes it to both. Two copies drift.
3. **Per-instance data layout is written once, at the top of its mesh file**, as a comment that names every vec4 and its fields. A new field takes a spare slot before it takes a new attribute: WebGPU allows 16 vertex attributes and 8 vertex buffers, and the form mesh is close to both. All per-instance values share one `InstancedInterleavedBuffer` (a bare array steps per vertex on WebGPU).
4. **CPU placement is pure and seeded.** Anything placed "randomly" is seeded by the entity id so it is the same on every load, and returns plain numbers (`satellites.ts`). The shader only animates.
5. **One draw per mesh, however many instances.** A new kind of thing is more instances or one more mesh, not a second material per entity. The lab's status line shows the draw count; check it stays flat.
6. **Services are called, not copied.** Fetching media goes through `loadImage` and the texture array through `makeStore` (`texture-store.ts`), which already handle the CORS and cache fact in [deployment.md](../deployment.md). Media URLs come from `@/lib/media/url`, as everywhere else ([services-and-data.md](services-and-data.md)).
7. **A transition is one progress, staged in `config.ts`.** `scene.ts` advances one linear value; the stages (their shares and order) are named constants with the choreography written once above them; each mesh eases its own part from that value (a spring, a curve), so a timing change is one number. When one thing becomes another, the new thing starts as an exact match of the old (place, size, crop, shade) and the old is hidden only behind it, so there is never a cross-fade or a pop.
8. **Types cross files with `import type`.** A mesh file imports the `Three` and `Tsl` types from `scene.ts`; three itself is loaded by dynamic import in `scene.ts` only.

## Checking a change

`pnpm exec tsc --noEmit -p .` and `pnpm exec eslint components/forms-lab` from `apps/web/`, then the by-eye list of the experiment on both backends (`/lab/forms`, and `?gl=webgl2`). A shader error shows only at run time, in the browser console.
