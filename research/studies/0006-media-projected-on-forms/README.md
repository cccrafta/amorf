---
id: STU-0006
title: An entity's media projected onto a form (cube first, sphere later)
date: 2026-11-06
status: done
parts: [entity, field]
question: How should an entity's media be projected onto a 3D form in the field, so that one system serves a cube now, a sphere later and other forms after, reads well, and scales to thousands of entities on WebGPURenderer with its WebGL 2 fallback?
sources:
  - "Multiview orthographic projection (glass box, developed elevation), Wikipedia"
  - "Drawing Matter: John Hejduk's axonometric degree zero; Wall House 1 drawing parallels"
  - "CCA: Hejduk, plans become elevations and sections"
  - "Sol LeWitt, Incomplete Open Cubes (1974)"
  - "Charles and Ray Eames, Glimpses of the USA (1959), seven screens"
  - "Gerhard Richter, Atlas"
  - "Tony Oursler, projected sculptures"
  - "Urbanscreen, 555 KUBIK (2009)"
  - "Büttner et al. 2020, text rotation and legibility in VR"
  - "W3C WebGPU spec, limits; web3dsurvey.com limit distributions"
  - "three.js r187 source: TextureNode, Instance, WebGPUBackend, WGSL and GLSL node builders"
  - "three.js issues 31221, 31814, 30484, 32852; PR 35082"
  - "Google S2 geometry, cube-sphere area ratios"
deductions:
  - "Projecting media onto a form is a cube map: a projector at the form's centre with one 90-degree frustum per face. One rule therefore serves a cube, a sphere and any form that can be reached by deforming a cube."
  - "Build every form from one subdivided rest cube; the form is only a vertex deformation of it, and the media lookup reads the rest cube's face and uv, so the same texel stays on the same surface point through any shape and any morph."
  - "Media live in one texture array, one square layer per media item; each form instance carries six face-to-layer numbers. One InstancedMesh draws thousands of forms in a few draws on both backends."
  - "Crop or letterbox is decided at publish time and baked into the square layer, never in the shader."
  - "The unfolded cube is the flat entity board: the cube form, the exploded view and the flat view are one object folded, exploded and unfolded."
  - "The front face carries the cover; it is the only face legible from afar and one of at most two legible at once."
  - "Faces without media stay blank material; media are not repeated to fill faces."
  - "The sphere suits continuous media (panoramas, 360 photographs); drawings and text stay off it."
  - "One form family for now, varied by content and proportion, not a form per entity type."
raises: [DDR-0004]
tags: [entity-form, projection, webgpu, tsl, cube-map]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# STU-0006: An entity's media projected onto a form (cube first, sphere later)

Step 2 of [one world, many cameras](../../../docs/design/one-world-many-cameras.md) puts entities in the scene. On 2026-11-06 the owner answered that page's open question 1 (what is the 3D thumbnail): each entity gets a **form**, a cube first and a sphere later, and the entity's media are **projected onto the form**. A system, not one solution per shape. This study asks how to do that well. Renderer rules: [ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md) (`WebGPURenderer`, TSL only, WebGL 2 fallback). Scale tiers: [STU-0004](../0004-renderer-path-for-3d-field/README.md).

## Question

How should an entity's media be projected onto a 3D form so that one system serves a cube, a sphere and later forms, reads well in the field, and scales to thousands of entities on both backends?

## Sources

Gathered on 2026-11-06 by two desk searches; the full reports, with every URL, are in [notes/technical.md](notes/technical.md) and [notes/precedents.md](notes/precedents.md). This README summarises them and wins any disagreement.

- **Technique.** The installed three 0.187 source (read, with file and line references in the notes), the W3C WebGPU limits, web3dsurvey.com limit distributions, three.js issues and pull requests, Google's S2 cube-sphere figures, WebGPU video-texture guides. Nothing was run on a GPU.
- **Precedents.** Multiview orthographic projection and the developed elevation; John Hejduk (Wall House 1, the 90-degree axonometric); Sol LeWitt's *Incomplete Open Cubes*; the Eameses' *Glimpses of the USA*; Richter's *Atlas*; Tony Oursler's projected spheres; Urbanscreen's *555 KUBIK*; dome-content guidance; VR legibility research; Bertin and Mackinlay on visual variables; Codrops demos of 2025 and 2026. Read at search-summary level, not in full: marked where a claim rests on that alone.

## Notes

### Technique (notes/technical.md)

- **Options compared.** Per-face materials (six draws per form); a texture atlas with per-instance rectangles (mip bleed between tiles, size caps); a texture array indexed per face; a per-fragment direction lookup with cube-map semantics; equirectangular, triplanar and decal projection. Equirectangular and triplanar do not fit: each face needs its own image.
- **Recommended.** One `InstancedMesh` of one subdivided `BoxGeometry(2, 2, 2, N, N, N)`, whose positions `c` in [-1, 1]³ are the rest cube. The form is a `positionNode` that maps `c` to a shape: the cube is `c`, the sphere `normalize(tan(c · π/4))`, blended by a per-instance shape value. The colour reads the rest cube's face and uv, never the deformed position, so cube to sphere keeps each texel on the same point. Media sit in one `DataArrayTexture` or `CompressedArrayTexture` (KTX2), one square layer per item; six per-instance numbers say which layer each face shows. A projector at the centre with a 90-degree frustum per face is exactly this cube map, so it is the projection the owner described.
- **TSL.** `texture(array, uv()).depth(layer)` exists in r187 (`TextureNode.js:973`) and both the WGSL and GLSL builders emit layer-aware sample, grad, level and bias calls. The face's layer travels as a flat varying. The sketch in the notes is not yet run.
- **Sphere distortion.** The `tan` warp, applied to positions, brings the cube-sphere's area ratio from 5.2 (plain `normalize`) to about 1.41 (S2 figures, read from a secondary table).
- **Fallback lookup.** For meshes without face and uv (a glTF form later), a per-fragment major-axis lookup with an analytic gradient passed to `.grad()`; implicit derivatives jump at face edges and draw a wrong-mip line.
- **Seams** are not a problem: each face holds a different image, so the face edge is already a content edge.
- **Video** cannot be an array layer. The layer holds the poster frame; the focused form swaps one face to a single `VideoTexture`, uploaded every frame by `copyExternalImageToTexture` on the WebGPU backend (cost not measured).
- **Limits.** WebGPU's default `maxTextureArrayLayers` is 256; 98% of adapters report 2048, but three requests no limits by default, so the renderer must ask for `min(2048, adapter)` itself. WebGL 2's floor is 256, with 99% of devices at 1024 or more. `maxTextureDimension2D` defaults to 8192. `BatchedMesh` saves no draws on the WebGPU backend (it loops `drawIndexed`); `InstancedMesh` does. Per layer, RGBA8 or block-compressed with mips: 128² is 64 KB or 22 KB, 256² is 256 KB or 87 KB.
- **Budget.** Building on STU-0004, which counted one image per entity: a form shows up to six. 3000 forms with about three distinct media each are 9000 layers, 49 MB at 64² compressed, 196 MB at 128²; so 128² only for the nearest hundred, paged into layer pages with an LRU map.
- **Known gaps.** On the WebGL backend, `instancedArray.element(i)` ignores its index (issue 31221, open), so per-instance data uses `instancedBufferAttribute`; instanced `updateRanges` are ignored (31814); uncompressed payloads in compressed array textures crash (PR 35082). A one-layer array is not treated as an array (`Texture.js:370`).

### Precedents (notes/precedents.md)

- **The cube net is the exploded view.** The orthographic "glass box" projects an object onto six faces and unfolds them into a cross; the developed elevation shows adjacent sides unfolded. Hejduk reads his 90-degree axonometric as folding and hinging, where plans become elevations.
- **Architectural media fit the faces by convention.** Elevations on four sides (Hejduk's Wall House 1 as an elevation series), the plan on top. A section does not fit a face; it is an inside or a cut (reasoned, not sourced).
- **Legibility.** Reading holds to about 60 degrees off the face normal (Büttner 2020, via secondary citations). At a three-quarter view a side face is near 55 degrees. At most one or two faces read at once, so the front face carries the cover.
- **Do not fill faces for their own sake.** The Eameses used seven screens so viewers would not be sure how many they had seen: an impression, not reading. Richter's *Atlas* keeps mixed media legible with a uniform cell. An empty face is honest material.
- **Content answers the form.** *555 KUBIK* drew its projection from the building's own cube. Drawings are notation and are contained, not cropped.
- **The sphere is for continuous media.** Dome guidance keeps primary content within about 45 to 60 degrees of the equator and no text at the poles. Oursler's projections work because one image sits on one head-like sphere.
- **Shape as a code.** Shape ranks low among visual variables and only five to seven shapes stay distinguishable (unverified). Hejduk's *Masques* make form-per-role work only as a small authored set; his Texas Houses vary content on one constant form.
- **Rotation hides content.** Carousel data (first slide 40% click-through, last 11%) is an analogy only, but it warns against forms that spin by themselves.
- **Thin evidence.** No exhibited "building as a cube of its drawings" and no web site using media-on-cube as its main navigation were found.

## Deductions

1. **Projection is a cube map.** A projector at the form's centre with one 90-degree frustum per face; one rule serves the cube, the sphere and any form reached by deforming a cube (technical, options).
2. **One rest cube, many forms.** Every form is the same subdivided cube, deformed in the vertex stage; the media lookup reads the rest cube's face and uv. The same texel stays on the same surface point through any form and any morph, so cube to sphere is a blend, not a second system (technical, recommended).
3. **One texture array, six numbers per form.** Each media item is one square layer; each instance names a layer per face. One `InstancedMesh` draws the field in a few draws on both backends. Request `maxTextureArrayLayers` up to 2048 on WebGPU; design for 256 on WebGL 2 (technical, limits).
4. **Crop is authored data, applied at publish time.** Contain (letterbox) for drawings, cover with a focal point for photographs, baked into the layer by `entities:sync`; the shader never crops (technical, aspect; precedents, notation).
5. **The cube net is the flat board.** The form, the exploded view and the flat view of [the design page](../../../docs/design/one-world-many-cameras.md) are one object folded, pulled apart and unfolded; the camera pan into an entity can be that unfolding (precedents, glass box and Hejduk).
6. **Front face = cover.** It is the only face that reads from afar and one of at most two that read at once. Further media go on the sides in order; a building's elevations go on the four sides and its plan on top when the entity has them (precedents, legibility and convention).
7. **Blank faces stay blank.** Fewer media than faces leaves the rest as plain material; media are not repeated. More than six: the first six are on the form, the rest only in the entity views (precedents, Eames and Richter; the thesis on honest material).
8. **The sphere is for continuous media.** Panoramas and 360 photographs; drawings and text stay off it, and primary content stays near the equator (precedents, dome guidance and Oursler).
9. **One form family for now.** Forms vary by content and proportion (a box may follow its cover's aspect); a form per entity type waits until types are stable (precedents, visual variables and Hejduk).
10. **Video plays on one face only.** Every face holds its poster frame; the near, facing form swaps one face to a live video (technical, video).

## Next

- **Spike first** (an experiment): one instanced rest cube with a two-layer array, `.depth()` on a flat varying, the cube-sphere blend, on `?gl=webgl2` and on WebGPU. It proves deductions 2 and 3 before anything is built on them.
- **Owner decisions,** each a DDR: which face is which (front, sides in order or N/E/S/W, top, bottom); whether the cover and the face order are authored in `entity.json` or derived from media kind; whether a box may take its cover's proportion.
- **Publish step:** square layers per media item, crop or letterbox per item, at two sizes (see the Backend needs table of the design page).
- **Later:** the unfolding transition into the flat view (step 4); glTF forms through the per-fragment lookup.
