# Forms: projecting entity media onto a cube/sphere form (three r187, WebGPURenderer + WebGL 2 fallback)

Date 2026-11-06. Verified = read in /Users/muhamad.ariqyandri/Checkouts/amorf/apps/web/node_modules/three (paths relative to it). "Unverified" = not run / not found in a source.

## 0. Answer in one paragraph

One `InstancedMesh` of ONE subdivided `BoxGeometry(2,2,2,N,N,N)` (the "rest cube"). Its vertex positions are the rest-cube coordinate c in [-1,1]^3. The form (cube, sphere, later others) is only a `positionNode` that maps c to a shape, blended by a per-instance `shape` value (0 = cube, 1 = sphere). The media lookup never uses the deformed position: it uses c (face = BoxGeometry's own per-face uv + face id), so cube -> sphere -> any shape, and the morph between them, keep the same texel on the same surface point. Pixels come from ONE `DataArrayTexture`/`CompressedArrayTexture` (layer = one media image, square, pre-cropped at publish time), indexed by 6 per-instance face->layer numbers. Faces beyond the entity's media count repeat a layer (`media[i % n]`) or point at a blank/colour. Videos never live in the array.

## 1. Options compared

| # | Approach | Draw calls | Works for cube+sphere+morph | Verdict |
|---|---|---|---|---|
| 1 | Multi-material / geometry groups (BoxGeometry has 6 groups) | 6 per form, no instancing (each group = own material = own texture) | yes (uv per face) | OK for a few hero forms only. 3,000 forms = 18,000 draws. |
| 2 | Texture array, layer chosen by per-instance attribute | 1 per array "page" | yes | **Chosen** |
| 3 | Atlas + per-instance UV rects (one 2D texture) | 1 | yes | Mip bleed between tiles (needs gutters + manual LOD clamp); size cap: WebGPU default maxTextureDimension2D 8192, compat 4096; WebGL2 MAX_TEXTURE_SIZE >= 4096 on 100% of platforms but >= 8192 only 6..77% on Android (web3dsurvey). Worse than arrays at equal complexity. Keep as an in-layer optimisation (tiles inside array layers) only if page count hurts. |
| 4 | Direction-based (cube-map semantics) lookup | n/a (a lookup rule) | yes, any star-shaped form | Same rule as chosen, but see 3.3: with our own mesh the face id comes free per vertex; per-fragment major-axis selection is the fallback for imported meshes (GLB models). |
| 5a | Equirect (`equirectUV`, nodes/utils/EquirectUV.js) | 1 | sphere only | Only for a 360 image on a sphere. Pole pinching. One image per form, so not the multi-media case. |
| 5b | Triplanar (`triplanarTexture`, nodes/utils/TriplanarTextures.js) | 1 | yes | Verified it takes `.value` of a plain texture (no layer/depth), 3 samples, blends with abs(normal). Blurs, can't give each face a different image. Right tool for a procedural material, wrong here. |
| 5c | Projective / decal | per decal | yes | A projector at the form's centre with a 90 degree frustum per face IS the cube map; so option 2/4 is the "projection" the owner means. An external single projector (uv = (P*V*worldPos).xy/w) is possible later per media but costs a matrix per media; `DecalGeometry` (examples/jsm) bakes mesh, not instanceable. |

## 2. Texture array facts (r187, verified)

- TSL: `texture(arrayTex, uv).depth(layerNode)`; `TextureNode.depth(depthNode)` at src/nodes/accessors/TextureNode.js:973; built as `depthNode.build(builder,'int')` (line 696). If an array texture has no `.depth()`, layer 0 is used (lines 708-712). `.level()` (858), `.bias()` (886), `.grad(gx,gy)` (929), `.offset()` (989) all take the same `.depth`.
- WGSL: `textureSampleGrad(tex, tex_sampler, uv, depth, gx, gy)` (WGSLNodeBuilder.js:917-925), `textureSampleLevel` with depth (1115-1123), `textureSampleBias` with depth (1165-1173). GLSL fallback: `vec3(uv, depth)` into `texture/textureLod/textureGrad` (GLSLNodeBuilder.js:680-796). So grad/level/bias on arrays exist on both backends.
- Texture classes: `DataArrayTexture` (src/textures/DataArrayTexture.js; `layerUpdates` Set + `addLayerUpdate(i)`, partial upload, default generateMipmaps=false, flipY=false), `CompressedArrayTexture` (src/textures/CompressedArrayTexture.js; same layerUpdates), KTX2Loader returns `CompressedArrayTexture` when `container.layerCount > 1` (examples/jsm/loaders/KTX2Loader.js:463). The class that exists in r187 is `ArrayTexture` aliased by flag `isArrayTexture` (Texture.js:370: set when `image.depth > 1`). Pitfall: a 1-layer array has depth 1 so `isArrayTexture` is false; allocate >= 2 layers.
- WebGPU upload of `DataArrayTexture`: typed-array data only (`_copyBufferToTexture`, WebGPUTextureUtils.js:674-694; layerUpdates honoured). It cannot take an ImageBitmap/canvas per layer; decode to RGBA bytes yourself, or use compressed.
- `CompressedArrayTexture.layerUpdates` uploads from the FULL-array mip buffers at `layerIndex * bytesPerImage` (WebGPUTextureUtils.js:1185-1195): paging a layer in needs a CPU mirror of the whole array. At 2048 layers of 128^2 BC7/ASTC (16 KB + mips = 21.8 KB) that mirror is about 45 MB. Alternative: `renderer.copyTextureToTexture(src, dst, srcRegion(Box3), dstPosition(Vector3 with z = layer), srcLevel, dstLevel)` (Renderer.js:3552; WebGPUBackend.js ~3040-3110 sets origin.z/depthOrArrayLayers, WebGL fallback handles 3D/array dst in WebGLTextureUtils.js:886,938) copies GPU-side. Whether it accepts a compressed 2D source into a compressed array layer on both backends: unverified, test before relying on it.
- Mipmaps: WebGPU backend can auto-generate for arrays when `generateMipmaps` (WebGPUBackend.js:1601, WebGPUTexturePassUtils.js has a `texture_2d_array` pass) but that regenerates the whole chain per upload; prefer pre-baked mips in KTX2 from the publish step.
- Colour: set `colorSpace = SRGBColorSpace` on the array.
- KTX2 caveat: PR #35082 (Oct 2026, open at time of search): KTX2Loader fallback transcodes (RGBA32 inside a `CompressedTexture`) crash `_copyCompressedBufferToTexture` on WebGPU and hit an INVALID_ENUM / format check on the WebGL backend for array textures. Only bites devices with no BC/ETC2/ASTC at all; use `detectSupport` and treat uncompressed fallback as unsupported.

## 3. The lookup

### 3.1 Rest cube + shape in the vertex stage

`BoxGeometry(2,2,2,N,N,N)`: positions are c in [-1,1]^3 on the cube surface, normals are the face normal (exactly +-1 on one axis), `uv` per face (0..1), face order +X,-X,+Y,-Y,+Z,-Z (standard BoxGeometry, unverified in this tree but unchanged for years).

Shape: `p = mix(c, normalize(tan(c * PI/4)), aShape) * aSize`.
- `tan(c*pi/4)` leaves the major axis at +-1 (tan(pi/4)=1) so it needs no face selection. This is the S2 "tangent" area correction: area ratio largest/smallest cell 1.41 vs 5.20 for the plain `normalize(c)` cube-sphere and 2.08 for the quadratic variant (Google S2 slides via Scribd; the table row/column matching is my reading of a flattened table). It is applied to the POSITION, not to the uv, so the texture stays linear on the cube and near-uniform on the sphere.
- Other shapes later = other functions of c (cylinder: normalise only (c.x,c.z); superellipsoid: c / pow(sum |c|^n, 1/n) with per-instance n, n -> inf is the cube, 2 is the sphere). A cuboid whose proportions follow the media aspect is just `aSize` anisotropic. Lookup is unchanged for all of them because it reads c / uv, never `p`.
- Normals when lit: `normalize(mix(faceNormal, normalize(p), aShape))` (approximation, unverified visually). Unlit `MeshBasicNodeMaterial` needs none.

### 3.2 TSL sketch (names verified to exist in r187 src/nodes; composition is not run)

```js
import { Fn, mix, normalize, tan, select, float, vec4, positionGeometry, normalGeometry,
         uv, instancedBufferAttribute, texture } from 'three/tsl';
import { MeshBasicNodeMaterial, InstancedBufferAttribute } from 'three/webgpu';

// per instance, ONE interleaved buffer (WebGPU default maxVertexBuffers = 8, see Instance.js:23):
// A: vec4 layers for +X,-X,+Y,-Y   B: vec4 = layers +Z,-Z, shape, size
const A = instancedBufferAttribute(attrA, 'vec4');
const B = instancedBufferAttribute(attrB, 'vec4');

const n = normalGeometry;
const face = select(n.x.greaterThan(0.5), 0, select(n.x.lessThan(-0.5), 1,
             select(n.y.greaterThan(0.5), 2, select(n.y.lessThan(-0.5), 3,
             select(n.z.greaterThan(0.5), 4, 5)))));                  // BoxGeometry order
const layerOf = [A.x, A.y, A.z, A.w, B.x, B.y]
  .reduce((acc, l, i) => select(face.equal(i), l, acc), A.x);        // i32 select chain

// flat varying: constant per face, no interpolation error, derivatives stay per-triangle
const vLayer = layerOf.toVarying('vLayer');
vLayer.setInterpolation('flat');            // VaryingNode.setInterpolation(type, sampling) verified line 44

const c = positionGeometry;
const shaped = mix(c, normalize(tan(c.mul(Math.PI / 4))), B.z).mul(B.w);

const mat = new MeshBasicNodeMaterial();
mat.positionNode = shaped;
const layerI = vLayer.add(0.5).floor().toInt();                       // guard float rounding
mat.colorNode = texture(facesArray, uv()).depth(layerI);              // sRGB array, mips baked
// blank/undefined media: layer < 0 -> select(layerI.lessThan(0), uColor, sample)
```

Notes: `vec4` per-instance attributes keep the layers as floats (exact to 2^24 layers). Do NOT use `instancedArray(...).element(instanceIndex)` here: three issue #31221 (open, no milestone) says `.element(index)` ignores the index on the WebGL backend. `instancedBufferAttribute` (BufferAttributeNode.js:448) is fine on both.

### 3.3 Per-fragment direction lookup (fallback for arbitrary/imported meshes)

Use when there is no face id/uv (a GLB model as a form, later). OpenGL cube table (sc, tc, ma): +X (-z,-y,x); -X (z,-y,-x); +Y (x,z,y); -Y (x,-z,-y); +Z (x,-y,z); -Z (-x,-y,-z); u = 0.5*(sc/|ma|+1), v = 0.5*(tc/|ma|+1). All six are LINEAR in d, so the same swizzle applied to `dFdx(d)` gives (dsc, dtc, dm) and the exact uv gradient is `g = 0.5*(ds.xy*m - s.xy*dm)/(m*m)`; feed it to `texture(...).depth(layer).grad(gx, gy)`. Rules:
- Select the face branch-free (`select`), compute `dFdx/dFdy` at top level: WGSL needs `dpdx` in uniform control flow, and `textureSample` too (divergent branches around the sample fail). `textureSampleGrad` has no such rule.
- Why: implicit uv derivatives jump where the face (layer) changes inside a 2x2 quad, giving a one-pixel-wide wrong-mip line. Derivatives of the continuous direction avoid that. The typeshade lowering of cube arrays to 2D arrays uses ddx.xy/ma and documents it as approximate; the quotient-rule term above is the exact one (my derivation, unverified on GPU). Khronos forum 111283 is the same problem reported unresolved.
- No cross-face bilinear filtering (an array layer clamps at its own edge). Here that is harmless: each face carries a different image, so the face edge is already a content edge.
- On a cube-sphere mesh built from BoxGeometry the faces are mesh edges, the flat per-vertex face id of 3.2 needs none of this, and derivatives are per-triangle correct. That is why 3.2 is the primary path.

## 4. Aspect, media count, video

- Aspect: bake at publish time into square layers: cover with a focal point (default) or contain with a letterbox colour (mean/edge colour). Zero shader cost and the near/hero view can load the original into its own material at true aspect. Runtime alternative: a per-layer `DataTexture` (aspect, focal x/y, bg colour) indexed by layer, shader does `uv' = (uv-0.5)*fit + focal`; costs one extra fetch per pixel. A cuboid form whose face proportions equal the media aspect avoids any crop; same lookup.
- Media count n vs 6 faces: `layer[face] = media[face % n]` repeats (costs no extra layers: they share the same layer index), so layers per entity = min(n, 6). n = 0: layer -1 -> flat colour. Face order: media[0] on +Z (front), then +X, -X, +Y, -Y, -Z (design choice, not research).
- Video: `VideoTexture` is a standalone `Texture`, cannot be an array layer. In the WebGPU backend I found no VideoTexture-specific branch (grep for `isVideoTexture` in src/renderers/webgpu: none) so it goes through the generic image path `device.queue.copyExternalImageToTexture` per update (WebGPUTextureUtils.js:1024, errors swallowed by a try/catch for bad frames). `requestVideoFrameCallback` drives `needsUpdate` (VideoTexture.js:74-80), `generateMipmaps=false`, minFilter Linear. Practical design: array holds a poster frame; the focused form swaps that face to a sentinel layer (e.g. -2) and samples one uniform `VideoTexture`. At most a handful of playing videos. Per-video decode/copy cost: not measured. WebGPU `importExternalTexture` (zero-copy, bindgroup rebuilt per frame, `texture_external`) is the efficient native path but three's TextureNode is not wired to it for VideoTexture (unverified; WebGPUBackend.js:318 sets `externalTexture` only for XR).

## 5. Morph cube -> sphere

Because the lookup reads c (rest cube) and `aShape` only changes `p`, the texel->surface-point assignment is invariant under the morph, exactly (not approximately). It survives anisotropic scale and any other radial/SDF shape. Needs N >= 8 per face for a round silhouette at t = 1; at t = 0 the extra triangles are wasted, so use geometry LOD tiers (far N=1..2, near N=16). Triangle counts: 6*N*N*2 = 768 at N=8, 3072 at N=16.

## 6. Scale

- Draw calls: `InstancedMesh` = true instancing. `BatchedMesh` in WebGPUBackend loops `drawIndexed` per merged range (WebGPUBackend.js:2147-2170), so there it is NOT one draw for many different geometries; no gain for forms. One InstancedMesh per (array page, geometry LOD).
- Instance data: matrices go to a UBO only if `count*64 B <= builder.getUniformBufferLimit()` else to vertex attributes (nodes/accessors/Instance.js:49-71). Spec default maxUniformBufferBindingSize 65536 would be 1024 matrices (spec number from memory, unverified). Per-instance extras: 8 floats = 32 B; matrix 64 B; 100k instances = 9.6 MB; cell-shard it, full re-upload on change (issue #31814, closed r181: update ranges ignored for instanced attributes, so partial updates fall back to full).
- Limits with numbers:
  - WebGPU maxTextureArrayLayers default 256; adapters report up to 2048 (98% of reports >= 2048 per web3dsurvey WebGPU data; Chrome 126 allows requesting up to 2048); the device only gets the default unless `requiredLimits` asks. three passes `parameters.requiredLimits` to `requestDevice` (WebGPUBackend.js:71,97,247; default `{}`), so read `adapter.limits.maxTextureArrayLayers` yourself and pass `requiredLimits: { maxTextureArrayLayers: min(2048, adapterValue) }` (or pass your own `device`). Browsers may round limits down to tiers (MDN).
  - WebGL 2 MAX_ARRAY_TEXTURE_LAYERS minimum 256; web3dsurvey: >= 512 on ~100% (Android 95%), >= 1024 on 99%, desktop/iOS 100% >= 2048, Linux 99% >= 1024, Android >= 2048 uncertain (42%..95%). Design for 256 as the floor, use up to 1024.
  - maxTextureDimension2D: WebGPU default 8192 (compat 4096); WebGL2 >= 4096 everywhere. Faces are 64..1024 px so irrelevant.
  - maxSampledTexturesPerShaderStage 16, maxSamplersPerShaderStage 16 (spec default): one array per draw is fine.
  - maxVertexBuffers: three itself assumes 8 (Instance.js:23). Geometry (position, normal, uv) + matrix (shared interleaved buffer) + our per-instance buffer fits; pack per-instance data into one interleaved buffer. Whether the 4 matrix-column attributes count as 1 or 4 vertex buffers on WebGPU: unverified.
- Memory per layer (RGBA8 / 1-byte-per-pixel block format, with ~+33% mips): 64^2: 16 KB / 5.5 KB; 128^2: 64 KB / 21.8 KB; 256^2: 256 KB / 87 KB; 512^2: 1 MB / 349 KB; 1024^2: 4 MB / 1.4 MB.
- Resident set that builds on STU-0004 (it counted one image per entity; here each form needs min(n,6) layers): 3,000 mid forms x avg 3 distinct media = 9,000 layers. At 64^2 compressed = 49 MB; at 128^2 = 196 MB (too much, so 128 only for the ~100 nearest). Pages: 9,000 / 2048 = 5 draws at 2048 layers, 36 at the 256 floor. Total hero tier: 30 forms x 6 x 512^2 compressed = 63 MB.
- Paging for 100k: fixed-size pages of K layers (K = min(2048, limit)), `Map<mediaId, layer>`, free-list, LRU by last frame visible; eviction only rewrites the slot (per-layer upload). Slot allocation is CPU-side; the shader only ever sees a layer number, so evicting a layer needs the form to fall back to the blank colour (or a coarser tier) until the upload lands. LOD tiers: colour-only (1 vertex colour, no texture) -> 64 px array -> 128/256 array -> 1024 hero. Cell sharding and culling per STU-0004.
- Resolution tiers can be separate array textures (all layers in one array must be the same size).

## 7. WebGL 2 backend gaps (checked via issues, r187)

- #31221 (OPEN): `instancedArray.element(i)` ignores index on the WebGL backend. Avoid storage-style per-instance data; use `instancedBufferAttribute`.
- #31814 (closed, r181): instanced attribute `updateRanges` ignored; full upload.
- #30484: `DataArrayTexture` + `.depth()` looked backend-dependent but was user code sampling on texel edges (needs +0.5 texel); not a three bug. Indices read as integers should use `texture.load`-style or add half-texel; the layer index itself via `.depth(int)` is not affected.
- PR #35082 (open when searched): compressed-array texture with uncompressed payload breaks both backends (see 2).
- #32852 (closed r183): WebGPU KTX2 example crashed on unsupported format; same theme: gate on `detectSupport`.
- Compute on the fallback is limited (STU-0004); this design uses no compute.
- Not found: any issue about `.grad()` on array textures with the GLSL backend. The GLSL generator emits `textureGrad(sampler2DArray, vec3(uv,depth), gx, gy)` (verified in source); unrun on a real WebGL2 device. Test with `?gl=webgl2`.

## 8. Risks / unverified

1. Composition of `texture().depth().grad()` (3.3) and flat-varying plus `.toVarying().setInterpolation('flat')` in a node material with instancing is read from source only; nothing was executed. Do a 20-line spike on both backends first.
2. GPU-side copy of a compressed 2D source into a compressed array layer (`copyTextureToTexture`) unverified; fallback is the CPU mirror.
3. Face orientation/flip of BoxGeometry uv vs your sRGB/Y convention (`flipY` false for arrays) needs a visual check.
4. Instance culling: draw `count` only visible; cube->sphere N geometry LOD switch by distance means 2+ InstancedMeshes per page.
5. Anisotropic filtering on array textures: untested; three's WebGPU capability `getMaxAnisotropy` exists (WebGPUCapabilities.js:29).
6. Video cost and autoplay policy not measured.
7. Real KTX2 sizes for amorf images not measured (STU-0004 also).
8. Seam between faces on the sphere is a content edge by design; if the owner later wants one image wrapped across faces (panorama), use equirect for that entity.

## 9. Sources

- https://www.w3.org/TR/webgpu/#limits  WebGPU spec: default limits (maxTextureDimension2D 8192, compat 4096, maxTextureArrayLayers 256, sampled textures 16, samplers 16).
- https://developer.chrome.com/blog/new-in-webgpu-126  Chrome 126: request up to 2048 array layers via requiredLimits.
- https://web3dsurvey.com/webgpu/limits/maxTextureArrayLayers  WebGPU adapter values (98% >= 2048).
- https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits  Defaults and limit tiering/rounding.
- https://web3dsurvey.com/webgl2/parameters/MAX_ARRAY_TEXTURE_LAYERS  WebGL2 array layer distribution.
- https://web3dsurvey.com/webgl2/parameters/MAX_TEXTURE_SIZE  WebGL2 max texture size distribution.
- https://github.com/mrdoob/three.js/issues/31221  instancedArray.element ignores index on WebGL backend (open).
- https://github.com/mrdoob/three.js/issues/31814  Instanced updateRanges ignored (closed r181).
- https://github.com/mrdoob/three.js/issues/30484  DataArrayTexture .depth() differences = user texel-centre bug.
- https://github.com/mrdoob/three.js/pull/35082  Uncompressed data inside CompressedTexture breaks array textures on both backends.
- https://github.com/mrdoob/three.js/issues/32852  KTX2 unsupported-format crash on WebGPU (closed r183).
- https://discourse.threejs.org/t/webgpu-and-compressedarraytexture/78668  Layer is chosen with `.depth()`, not a vec3 uv.
- https://github.com/typeshade/typeshade/issues/135  Cube array as 2D array: face rule, approximate gradient, seam limits.
- https://community.khronos.org/t/implementing-texturegrad-for-a-cubemap-on-top-of-texturegrad-for-a-2d-array/111283  textureGrad for cubemap on 2D array: mip mismatch problem.
- https://arugl.medium.com/cubemap-glsl-shader-debug-functions-3f4c659e7833  Direction -> face index + uv helper, mip error warning.
- https://www.scribd.com/document/260134648/Geometry-on-the-Sphere-Google-s-S2-Library  S2 linear/tangent/quadratic area ratios 5.20/1.41/2.08.
- https://www.redblobgames.com/x/1938-square-tiling-of-sphere/  Cube-sphere centre vs edge area distortion.
- https://toji.dev/webgpu-best-practices/img-textures  copyExternalImageToTexture vs importExternalTexture trade-offs.
- https://webgpufundamentals.org/webgpu/lessons/webgpu-textures-external-video.html  External video textures: expire per frame, new bindgroup each time.
- /Users/muhamad.ariqyandri/Checkouts/amorf/research/studies/0004-renderer-path-for-3d-field/README.md  STU-0004 scale tiers, texture memory table (built on, not repeated).
- three source (installed 0.187): src/nodes/accessors/TextureNode.js, src/nodes/accessors/Instance.js, src/nodes/accessors/BufferAttributeNode.js, src/nodes/core/VaryingNode.js, src/nodes/utils/EquirectUV.js, src/nodes/utils/TriplanarTextures.js, src/renderers/webgpu/nodes/WGSLNodeBuilder.js, src/renderers/webgl-fallback/nodes/GLSLNodeBuilder.js, src/renderers/webgpu/utils/WebGPUTextureUtils.js, src/renderers/webgpu/WebGPUBackend.js, src/textures/DataArrayTexture.js, src/textures/CompressedArrayTexture.js, src/textures/VideoTexture.js, examples/jsm/loaders/KTX2Loader.js.
