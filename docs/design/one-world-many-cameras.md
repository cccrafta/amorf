---
title: One world, many cameras (spatial engine epic), scope and intent
status: planned
updated: 2026-11-06
last_verified: 2026-11-06
---

# One world, many cameras: scope and intent

**Planned.** Most of this page is not built. It records what the owner wants the site to become, in the owner's terms, so the epic can be split into studies, experiments and decision records and done carefully. The code is the source of truth for what exists. The rules stay in their own pages ([entity-view.md](entity-view.md), [backend.md](backend.md), the ADRs). Where this page disagrees with them, they win.

Stated by the owner on 2026-11-05 and 2026-11-06. It is a large research and experiment effort: every step below gets a study or an experiment, and every technology or design choice gets an ADR or a DDR.

## Intent

The site should be "very advanced". The owner's reference is [tesseract.postminimal.agency](https://tesseract.postminimal.agency/), not yet studied: one 3D world with a camera position, where the interaction changes depending on the view.

- **One world.** Ground, entities, routes and spaces are objects in one real-time 3D scene. The current DOM and CSS-3D field and the 2D plan (`ui/plan.tsx`) are to be replaced by it. The DOM keeps only overlays (forms, menus, the entity's text where needed).
- **Many cameras.** Each ontology view is a camera on that one world, with an animated camera move between views and input that changes per view:
  - **Field:** first person, walking (today's view).
  - **Plan:** the top view of the same world. It replaces today's plan view.
  - **Journey:** another perspective on the visitor's own journey: the walked route seen from outside (oblique or orbiting), in 3D.
- **Renderer.** WebGPU first: three.js `three/webgpu` with TSL node materials, falling back to WebGL2 automatically. No `ShaderMaterial` and no `onBeforeCompile`. The owner chose this over the cautious path in [STU-0004](../../research/studies/0004-renderer-path-for-3d-field/README.md) (stay on WebGLRenderer, keep cards DOM). STU-0004's facts still apply: troika text does not run on WebGPU (use MSDF text), the WebGL2 fallback is a separate path, and the scale limits are texture memory and data, not compute.

## Entity in 3D

- **A 3D thumbnail.** Each entity has a 3D presence in the field, not only a flat picture. *Owner, 2026-11-06: a **form** (a cube first, a sphere later) with the entity's media projected onto it, as one system for every form. Researched in [STU-0006](../../research/studies/0006-media-projected-on-forms/README.md): every form is a deformed rest cube, media sit in one texture array with six face-to-layer numbers per form, and the cube's net is the flat board.*
- **Entering an entity, the camera pans to it.** No cut to a separate page. The camera moves to the entity, and the entity gets its own view.
- **Two entity views:**
  1. **Exploded:** the entity's media laid out in 3D as an exploded object, with different media on different sides. The visitor scrolls or turns the entity around to see them.
  2. **Flat:** the media laid flat to read, as today's entity board does ([entity-view.md](entity-view.md)).
- 3D media (glTF models) can be embedded and shown in both the field and the entity view.

### Form complexity (owner, 2026-11-06)

After [EXP-0014](../../research/experiments/0014-forms-with-media-faces/README.md) the owner asked for all four kinds of complexity: a richer outline, composition from several pieces, real voids, and forms derived from the entity's data. Each is its own experiment, in this order, since each builds on the one before:

1. **Outline.** More shapes from the same rest cube, set per form and still one draw: rounded box (superellipsoid), taper, twist, bend, surface relief, cut-outs through a face.
2. **Composition.** An entity made of several rest-cube pieces (stacked, offset, cantilevered, pulled apart), each piece carrying media. This is the start of the exploded entity view.
3. **Data.** Shape and composition derived from the entity (piece count from media count, height from area, and so on), so the form is structure and not decoration. Needs 1 and 2.
4. **Voids.** Real holes and carving, which a deformed cube cannot make. A study first, to choose between a different base mesh, CSG, and signed-distance raymarching in TSL, and how media map onto the result.

Limits to test in every step: media read only on faces turned toward the visitor at less than about 60 degrees ([STU-0006](../../research/studies/0006-media-projected-on-forms/README.md)), and complexity added for looks goes against the thesis.

## Recording visits

Recorded per visitor: position in the world over time, time spent on each entity, and more to be defined.

- **Tied to an account** (owner, 2026-11-06), so it uses the auth in [backend.md](backend.md) and ADR-0015 (Better Auth on D1).
- **For the visitor and for us** (owner, 2026-11-06). The visitor sees their own history, for example as their journey in the journey view. The project uses it for research.
- This is personal data on a public site in the EU. It needs explicit consent, a stated purpose, retention and deletion rules, export for the visitor, and a privacy ADR before any code. Review is never skipped on this part.

## Proposed order

Each step is its own session. Each step names the record it produces.

0. **Study the reference and decide the renderer.** Analyse tesseract: camera choreography, interaction per view, transitions, how it is built. Rewrite ADR-0019 (proposed) to WebGPU-first with TSL. *Done 2026-11-06 from the bundle and the author's case study: [STU-0005](../../research/studies/0005-tesseract-reference/README.md) (bundle, case study and a live viewing) and [ADR-0019](../decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md) rewritten, still proposed. Tesseract has two views, not many, so it informs the renderer, camera transitions and the journey view, not the plan or entity views.*
1. **Scene core.** WebGPURenderer with WebGL2 fallback, and the ground ported to TSL (it used `onBeforeCompile`). Keep the CSS-matched camera check (`components/field/ground-math.ts`) passing while the DOM field still exists. *Built 2026-11-06, awaiting the owner's look on both backends: [EXP-0013](../../research/experiments/0013-scene-core-on-webgpu/README.md). The world (renderer, scene, camera) is `components/field/world.ts`; the ground is its first object; `?gl=webgl2` forces the fallback.*
2. **Entities in the scene.** Instanced planes with thumbnails, a 3D thumbnail form, MSDF text, picking. *Spike built 2026-11-06, awaiting the owner's look on both backends: [EXP-0014](../../research/experiments/0014-forms-with-media-faces/README.md), a lab page at `/lab/forms` (forms with media faces, cube-to-sphere morph, a first turn animation) outside the field.*
3. **View system.** Field, plan and journey cameras, animated transitions, per-view input. Plan replaces `ui/plan.tsx`.
4. **Entity views.** Camera pans to the entity, then the exploded view and the flat view. glTF media. *First try in the lab only: click a form, the camera travels in and the form unfolds into its cube net, [EXP-0016](../../research/experiments/0016-entity-view-unfold-in-the-lab/README.md). The DOM entity view stays until it is judged.*
5. **Recording visits.** Consent, a privacy ADR, account-linked events through `apps/api` into D1, shown back in the journey view.
6. **Scale.** Thumbnail pyramid and KTX2 atlases made at publish time (`entities:sync`), loading per area of the field, GPU culling. The tiers are in STU-0004.

## Backend needs (running list)

What each step asks of `apps/api`, D1, R2 and the publish step. Kept here while the epic runs so the backend work ([backend.md](backend.md), [backend-decisions.md](backend-decisions.md)) can pick items up; an item moves into those pages, or into an ADR, when it is decided there. Add to this list in the same session as the step that finds the need.

| Step | Need | Where it lands | State |
| --- | --- | --- | --- |
| 1 | None; the scene core is client only. | | |
| 2 | The entity's form and its faces: derived from `thumbnail` and `media[]`, no new field; an authored face map only when an entity needs it ([DDR-0004](../decisions/ddr/0004-entity-form-with-media-faces-derived.md)). | Entity schema, `packages/core` (override only) | Decided in DDR-0004 (proposed) |
| 2 | One square layer per media item at two sizes (64² and 128², KTX2), cropped or letterboxed per item at publish time, for the forms' texture array. Crop and focal point are per-item data. | Publish step (`entities:sync`), media processor in [backend.md](backend.md) "Media storage" | Needed |
| 2 | Stable world positions for entities, set by the owner. | Pins per space ([DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md)) | Decided in DDR-0003 |
| 3 | The journey view reads a journey (space, entity ids in order, times) and, for the drawn route, position samples over time. | Journey record ([backend.md](backend.md) §5), visit events (step 5) | Shape partly decided (DDR-0003); samples open |
| 3 | The plan view reads placements per space. | Placements ([DDR-0003](../decisions/ddr/0003-placements-in-plan-units-per-space.md)) | Decided in DDR-0003 |
| 4 | Where the exploded view's arrangement comes from: authored per entity or a rule per type. If authored, the studio board editor must place media on sides of a 3D form. | Entity display config ([backend.md](backend.md) "Presentation as data"), studio (ADR-0016) | Open question 2 |
| 4 | glTF/GLB as a media kind: upload limits, processing (Draco or meshopt, KTX2 textures), poster image. | Media kind registry ([backend.md](backend.md) "Presentation as data", "Media storage") | Needed |
| 5 | Visit events tied to an account: position samples and time per entity, a consent record, retention, deletion and export endpoints. | D1 tables behind `apps/api`, auth (ADR-0015), a privacy ADR | Needed; privacy ADR first |
| 5 | Sampling rate and event volume against D1 limits on the Free plan. | [backend-decisions.md](backend-decisions.md) | Open question 3 |
| 5 | Whether a local buffer may record before sign-in or consent and upload afterwards ([STU-0005](../../research/studies/0005-tesseract-reference/README.md) deduction 11). | Privacy ADR | Open |
| 5 | Whether others' walks are shown, anonymised. | Privacy ADR, journey read API | Open question 4 |
| 6 | Publish-time outputs: thumbnail pyramid, KTX2 atlases, cell shards, a compact binary index; replaces the build-time fetch of every `entity.json` (ADR-0004). | Publish step, R2, a new ADR superseding ADR-0004 | Needed past about 1k entities |
| 6 | Where the publish step runs (owner machine, CI or a Worker) once it does image work. | [backend-decisions.md](backend-decisions.md) | Open |

## Open questions

1. ~~What exactly is the 3D thumbnail?~~ A form with the media projected on it (owner, 2026-11-06; [STU-0006](../../research/studies/0006-media-projected-on-forms/README.md)). Faces derived from the media, cover in front, proportion from the cover: [DDR-0004](../decisions/ddr/0004-entity-form-with-media-faces-derived.md) (proposed).
2. Does the exploded view's arrangement come from the entity's authored layout (`entity.json` `layout`) or from a rule per entity type?
3. What else is recorded besides position and time per entity, and at what sampling rate?
4. Does the journey view show only the visitor's own walk, or also others' walks (anonymised)?
5. What do visitors without WebGPU or with reduced motion get?
