---
id: STU-0005
title: Tesseract by Bahae Ben as a reference for one world seen through several cameras
date: 2026-11-06
status: done
parts: [field, journey]
question: How does tesseract.postminimal.agency build one real-time world whose camera and input change per view, and what of it should amorf take for one world, many cameras?
sources:
  - "Bahae Ben, Tesseract (2026), https://tesseract.postminimal.agency/ (production bundle read as text, and the site watched running in Chrome, 2026-11-06)"
  - "Bahae Ben, Tesseract case study, https://www.bahaeben.com/work/tesseract"
  - "three.js forum showcase, Tesseract: an interactive audiovisual piece (2026-10-04), https://discourse.threejs.org/t/tesseract-an-interactive-audiovisual-piece/94996"
  - "Awwwards, Tesseract, Nominee 2026-10-28, https://www.awwwards.com/sites/tesseract"
  - "Post Minimal, https://postminimal.agency/"
deductions:
  - "WebGPU-first with an automatic WebGL 2 fallback ships today on three r186: one WebGPURenderer, await init() once, read the backend once, a quality tier per backend and a URL flag that forces the fallback."
  - "Keep three in a lazy chunk; tesseract ships three/webgpu in a 1 MB eager entry chunk, which amorf's field cannot afford before first paint."
  - "Labels stay DOM, placed by projecting 3D points through the scene camera; MSDF text is only needed where text must be occluded by or lie in the world."
  - "A second view is a second camera with its own spring state, blended in over a fixed morph, then swung to a readable pose unless the visitor has already taken control."
  - "The journey view needs only a fixed-size local sample buffer drawn as a 3D path with a replay playhead; where it is stored is a separate privacy decision."
  - "Camera motion uses critically damped springs solved exactly per frame with a clamped time step; direct manipulation follows the hand without easing, then coasts."
  - "Accessibility baseline: every gesture has a key, reduced motion is respected, sound is never required, and quality drops by device pixel ratio when frames run slow."
  - "Tesseract is one object with no content, no plan view and no scale problem; it informs renderer setup, camera choreography and the journey view, not the plan view, entity views or scale."
  - "A change of view is narrated and carries its own interface: overlays swap with the camera, a caption says what the view is, the way back is named with its key."
  - "The journey view starts edge-on and turns to show its shape; the camera move is the explanation."
  - "Memory of the visitor shapes the next visit (greeting, skipped hints, echoes), which belongs in the step 5 privacy decision."
raises: []
tags: [webgpu, three-js, camera, navigation, journey, precedent]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# STU-0005: Tesseract by Bahae Ben as a reference for one world seen through several cameras

## Question

The owner named [tesseract.postminimal.agency](https://tesseract.postminimal.agency/) as the reference for [one world, many cameras](../../../docs/design/one-world-many-cameras.md): one real-time 3D world, a camera, and interaction that changes with the view. This study asks how it is built and what amorf should take from it for the [field](../../theory/ontology/field.md) (first-person walk) and the [journey](../../theory/ontology/journey.md) (the walked route seen from outside). It is step 0 of that page and feeds [ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md).

## Sources

- **Read:** the production bundle (`index.html`, the entry chunk `index.js`, `index.css` and the lazy `Inspector` chunk), downloaded on 2026-11-06 and read as text, never run. The files are not kept in the repository. Names below are minified, so they are quoted only where they are string literals or numbers.
- **Read:** the author's case study, the three.js forum post, the Awwwards page and the Post Minimal page (frontmatter).
- **Watched:** the running site in Chrome on macOS (1728 x 963, pixel ratio 2, WebGPU), 2026-11-06, by an agent driving the browser at the owner's request. Holds were sent as Space key events; taps, drags, wheel, `T` and `Esc` were real input. Not seen: sound, touch, reduced motion, the WebGL 2 fallback and the lower quality tiers.

## Notes

### What it is (case study, Awwwards)

A self-initiated piece by Bahae Ben, a product designer in Montreal working as Post Minimal, shown on the three.js forum on 2026-10-04 and an Awwwards nominee on 2026-10-28. Awwwards lists WebGL, Three.js and TypeScript; the author says three.js WebGPU with TSL, and the bundle agrees with the author (below). No source code is public.

The case study's question is what makes an interaction feel immersive on a 2D screen; the answer it builds is that a fourth dimension "can't be shown, only felt through interaction". Five phases: **threshold** (press and hold; a line becomes a square, a cube, a tesseract), **bloom** (the tesseract is pressed onto a 4D sphere), **world** (drag turns it, scroll moves forward, tap rings a bell, hold slows time), **outside time** (`T` shows the whole visit as one shape, with a replay playhead) and **return** (earlier signals still arrive; learned hints are skipped).

Design rules the author states: the gesture is the tutorial (press-and-hold replaces a start button and unlocks audio); hints are keyed to actions, not a clock; "all movements are rotations", the universe turns toward you like a globe under your feet; every gesture has a key, reduced motion is respected and sound is never required.

### Renderer (bundle)

- A plain Vite single-page build with vanilla DOM classes; no React, Vue or Svelte. One `<canvas class="experience">` with DOM overlays.
- three.js r186 (`window.__THREE__` is `186`), the `three/webgpu` build. Construction: a `WebGPURenderer` with `antialias: false`, `forceWebGL` from the URL, `powerPreference: "high-performance"`, then `await renderer.init()`, then the backend is read once as `renderer.backend.isWebGPUBackend ? "webgpu" : "webgl"`. The adapter is requested with `featureLevel: "compatibility"`.
- Fallback message from three: "WebGPURenderer: WebGPU is not available, running under WebGL2 backend." If both fail, the page shows "Your browser couldn't start WebGPU or WebGL 2."
- URL flags: `?webgl` forces the fallback, `?debug` shows a backend and quality badge and lazy-loads three's Inspector, `?quality=high|medium|low`.
- Quality tiers by particle count and pixel ratio: high 131,072 particles at DPR 2, medium at DPR 1.75, low at DPR 1.5. **The WebGL 2 backend always gets low.** The DPR cap drops by 0.25 after 90 slow frames.
- The world is one particle system simulated by a TSL compute pass every frame, with storage buffers for position, colour, offset and velocity, drawn as instanced sprites. No meshes, no `ShaderMaterial`, no `gl_FragColor`, no loaded models or textures.
- Post-processing through TSL `RenderPipeline`: a radial gradient as `scene.backgroundNode`, then trail feedback, bloom, chromatic aberration, vignette and grain. Scene lighting is off. The case study adds depth of field.
- Text is DOM (Geist and Geist Mono). Markers and labels are DOM elements positioned by projecting 3D points; there is no troika and no MSDF text.
- Size: the entry chunk is 1,021,082 bytes raw, of which about 880 KB is three; **three is eager**, not split. Only the Inspector (172,756 bytes) is lazy.

### Views and camera (bundle, case study)

- **World view.** The camera orbits slowly on its own (azimuth `0.62 + t * 0.021`, elevation `0.3 + sin(t * 0.07) * 0.06`, field of view 38°) and keeps the object framed by computing the distance from the field of view and aspect. The pointer nudges azimuth and elevation by at most 0.09 and 0.06 rad. Drag does not move the camera: it rotates the world in 4D. Scroll and `W`/`S` travel along the fourth axis.
- **Intro choreography.** A timeline in seconds: inflate 2.2 to 4, fibrate 4.4 to 8.6, camera move 3 to 9.6, title at 9.4. Releasing the hold during the threshold rewinds at 3.2x.
- **Worldline view ("outside time").** `T` (or a button on touch) opens it, `Esc` closes it. It uses **a second camera** with its own spring-damped yaw, pitch and distance (start yaw π/2, pitch 0.12, distance 8.6). The switch is a 2.6 s morph with smoothstep. At 2.9 s the camera swings out to a readable pose (yaw 0.42, pitch 0.22, distance 7.2; a farther pose on portrait screens) **unless the visitor has already orbited**. At 5.4 s a playhead starts an 8 s replay sweep. The visitor then orbits by drag.
- **What it draws.** The visitor's pointer positions are logged into a fixed 4096-sample `Float32Array`, uploaded as a data texture and drawn as one 3D path, with a knot per signal and up to 12 DOM labels. Visits and echoes are kept in `localStorage`; there is no account and no server.
- **Motion.** Critically damped springs, solved exactly per frame so motion does not depend on frame rate; the frame step is clamped to 1/30 s. Wobbly springs step at a fixed 1/240 s. Direct manipulation follows the hand with no easing and coasts on release (case study).
- **Picking.** A tap is mapped back onto the 4D sphere by inverting the projection; the CPU maths mirrors the GPU's so the hit matches the pixels (case study).
- **Input map.** Press, hold, tap, drag and scroll; keys for each (arrows, `Shift`+arrows, `W`/`S`, `Space`, `Enter`, `L`, `M`, `T`, `I`, `Esc`, `Tab`); device tilt as an option on phones. No pointer lock and no WASD fly camera. `prefers-reduced-motion` is honoured.

### Live observation (2026-11-06)

- **Backend.** `window.__THREE__` is `186`, `navigator.gpu` exists, and the `?debug` badge reads "webgpu · high · 131,072 particles", with three's Inspector listing Compute, RenderPipeline, Scene, AfterImage and Bloom passes. About 105 to 120 frames per second on a high-end Mac.
- **First paint.** No loader: a bright point on black in a radial vignette, a returning-visitor line ("Welcome back. It has been 13 minutes."), and the hints "Press and hold" / "or hold the space bar" / "sound on · headphones help". "skip intro" and "sound" sit top right; "skip intro" hides while holding. A tap shows a ring labelled "hold".
- **Threshold.** Narration appears line by line with each stage: "A point, moved, draws a line." through "A cube, moved in a direction you cannot point to," and "A tesseract." From the line stage, the cube came at about 1.2 s and the tesseract at about 3.3 s. Releasing early drops back to the last completed stage, not to the start.
- **Bloom.** Captions at about 5.6 s ("Pressed onto the surface of a four-dimensional sphere,"), 7.8 s and 9.5 s; the cube folds into curved cells, then bursts into linked rings that fill the screen while the camera pulls in and turns. The title appears large, then settles into the header as "tesseract · by postminimal". At about 12.8 s: "The universe is open. Drag or use the arrow keys to turn it through the fourth dimension." The worldline and about buttons, the HUD and the clock arrive at about 16 s.
- **World.** Drag rotates the structure through the fourth dimension and the HUD's w-tilt readout changes; the wheel also changes w-tilt, it does not zoom. A click sends a signal with captions as it travels ("Signal sent.", "It reached the far side of the universe.", "Signal returned.", "On a sphere, everything you send comes back."). Hints arrive as captions keyed to these events, not as fixed labels. The camera keeps its slow orbit between actions.
- **Into the worldline (`T`).** About 2.5 s. The particle web dissolves to black and the HUD leaves; a thin bright ribbon appears, the visit drawn as a path through time, with lens-shaped knots where signals were sent and beads moving along it as the replay playhead. Labels "arrived 10:39" and "now" are DOM, projected from 3D. The camera starts nearly side-on, so the path reads flat, then swings to a higher oblique angle. Captions narrate the change of view: "Seen from now, your visit is a scribble." then "Seen from outside time, it is a shape." A 1 px frame appears around the viewport.
- **Inside the worldline.** A "Your visit" card states duration and signals ("1 min 16 s · 1 signal · 0 came home") with "play again", "back to the universe [t]" and "replay the unfolding". Drag orbits freely in yaw and pitch and the path stays readable at every angle; the wheel did nothing visible.
- **Out (`Esc`).** The reverse morph sweeps the camera back through the ribbon, which fades into the particle web; the world returns after about 2.5 to 3 s with "Back in the universe."
- **DOM over canvas.** One full-viewport canvas plus a 112 px canvas for the axis gizmo; everything else is DOM: the badge, narration, header, visit card, HUD, clock, about panel, a screen-reader live region that carries every caption, and the cursor ring. Memory is one `localStorage` key, `tesseract/v1`, holding first and last visit, visit count, learned hints and echoes.

### My reading

Tesseract has two views, not many: the world and the worldline. It has one object, no content items, no plan or top view and no data to scale. Its value for amorf is narrower than "the whole epic": it shows a shipping WebGPU-first setup on current three, a clean way to switch to a second camera, and a journey-like view of the visitor's own path. It says nothing about the plan view, the entity views, the 3D thumbnail or scale; those stay with [STU-0004](../0004-renderer-path-for-3d-field/README.md) and later experiments.

## Deductions

1. **WebGPU-first with an automatic WebGL 2 fallback ships today.** One `WebGPURenderer`, `await init()` once, read the backend once, a quality tier per backend (the fallback gets the lower one) and a URL flag that forces the fallback for testing (Renderer notes). This backs the owner's choice in [ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md).
2. **Keep three lazy.** Tesseract can ship 1 MB eagerly because nothing appears before the canvas. amorf's field paints DOM first, so `three/webgpu` stays behind a dynamic import (Renderer notes; ADR-0019 drivers).
3. **Labels stay DOM, placed by projection.** Tesseract has no 3D text at all. Labels positioned by projecting world points through the scene camera are enough for names and markers; MSDF text is only needed where text must be hidden behind or lie in the world, such as text on an entity's 3D form (Renderer notes).
4. **A second view is a second camera.** The worldline camera has its own spring state and is blended in over a fixed morph, then swung to a readable pose unless the visitor has already taken control. For amorf: field, plan and journey each own a camera rig; a transition blends between rigs rather than animating one camera through waypoints (Views notes).
5. **The journey view needs only a local sample buffer.** A fixed-size buffer of positions, drawn as one path with a replay playhead, is the whole view. Where the samples are stored (only on the device, or tied to an account as the owner wants) is a separate decision for the privacy ADR in step 5 of [one world, many cameras](../../../docs/design/one-world-many-cameras.md) (Views notes).
6. **Springs, not tweens, for the camera.** Critically damped springs solved exactly per frame, a clamped time step, no easing under the hand and coasting on release (Views notes).
7. **Accessibility and quality baseline.** Every gesture has a key, reduced motion is respected, sound is never required, and the device pixel ratio drops when frames run slow. This answers part of open question 5 on the design page (Views and Renderer notes).
8. **Scope of the reference.** Tesseract informs renderer setup, camera choreography and the journey view; it does not inform the plan view, the entity views, the 3D thumbnail or scale (My reading).
9. **A change of view is narrated and carries its own interface.** Entering the worldline, the HUD leaves, a caption says what the visitor now sees, a card summarises the visit, and the way back is named with its key. For amorf: each camera (field, plan, journey) owns its overlay set, swapped during the transition, and the first entry into a view says in one line what the view is (Live observation).
10. **The journey view starts edge-on and turns to show its shape.** Seen from the walker's height the path is a scribble; the swing to an oblique view is what makes it a shape. The camera move is the explanation, not decoration (Live observation).
11. **Memory of the visitor shapes the next visit.** A returning visitor is greeted with the time since the last visit, learned hints are skipped, and earlier signals are still arriving, all from one local key. This belongs in step 5's privacy decision alongside the account-linked log (Live observation).

## Next

- Owner decides which deductions to hold; held ones are copied, dated, into the Position sections of the field and journey hubs.
- Step 1 of the design page (scene core) applies deductions 1, 2 and 6.
