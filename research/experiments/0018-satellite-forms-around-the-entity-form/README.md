---
id: EXP-0018
title: Satellite forms: an entity's pictures after its cover orbit its form as small cubes
status: running
date: 2026-11-06
question: Can an entity's remaining pictures be shown as small satellite forms orbiting its thumbnail form, in the same single draw, so that the field shows how much each entity holds without opening it?
hypothesis: Satellites are more instances of the same rest-cube mesh, one per picture after the cover (up to nine), placed by the entity id as seed and moved by an orbit computed in the vertex shader from per-instance data and one clock uniform. The cluster reads as "a lot in here" when an entity has many pictures and as "little" when it has few, with no overlaps and no extra draw call. It is wrong if the clusters hide or confuse neighbouring forms, if picking a form becomes ambiguous, or if the satellites are too small to read as pictures at field distance.
method: In the forms lab (/lab/forms) the "satellites" toggle and three sliders (sat radius, sat size, sat speed) tune the cluster by eye. Compare entities with many and few pictures; watch the draws count in the status line; click a satellite and a form.
materials: [entity-form, rest-cube, texture-array, entity-media]
tools: [next-prototype, three-js, tsl]
outcome:
decisions: [DDR-0005, DDR-0004, ADR-0019]
tags: [entity-form, satellites, orbit, webgpu, tsl, composition]
parts: [entity, field]
media: []
publish: false
case_study: null
updated: 2026-11-06
last_verified: 2026-11-06
---

# EXP-0018: Satellite forms: an entity's pictures after its cover orbit its form as small cubes

Tests the proposal in [DDR-0005](../../../docs/decisions/ddr/0005-entity-as-thumbnail-form-with-satellite-forms.md) (option B; more than six faces, option C, is not tested here). Follows [EXP-0017](../0017-entity-view-board-explode-in-the-lab/README.md). Item 2 and 3 of "Form complexity" in [one world, many cameras](../../../docs/design/one-world-many-cameras.md).

## Hypothesis

1. **No new system.** A satellite is an instance of the form mesh with a flag, its parent's x and z, a size and six orbit numbers. Draws stay the same.
2. **Count is data.** One satellite per picture after the cover, `board[1..9]`. An entity with one picture has none.
3. **Placement is seeded, not free.** The entity id seeds every number (hash in `satellites.ts`), so a cluster is the same on each load.
4. **Natural, not mechanical.** Sizes are wide (half-extent 0.06 to 0.26, many small and few large). Each shell is a Kepler ellipse with the form at its focus (eccentricity 0.04 to 0.12), so a satellite runs fast near the form and slow far from it; inner shells turn faster (period grows as a^1.5); the orbit plane precesses slowly; each satellite turns steadily at its own slow rate. Bob and sway use the form's seed, so the cluster floats as one body.
5. **No overlaps by construction.** Up to five satellites per shell, spaced evenly in mean anomaly. Shells take disjoint distance bands from the form, each as wide as its biggest satellite plus a gap, so satellites of different shells never touch.
6. **Cubes become pictures, in motion.** (Owner, 2026-11-06.) When an entity opens as a board, nothing stops at the click. The thumbnail and each satellite fly from their live motion straight to their board place, in a wave from the hero outward, on a curved path (out along the orbit, in to the board from in front), leaning into the travel, on a front-loaded ease-in-out that never passes its place (owner: an overshooting spring read as a small correction into and out of place; a critically damped step read as a hesitation when played back on closing). The flattening happens in between: tumble, turn and shape calm over the first part of the flight, the cube is pressed flat, and at that moment its card takes over as exactly its flat face, then grows to its place and opens from the face's square to the whole picture. Pictures with no satellite (past nine) grow from the form's place. The board comes to the view: it is set up facing the camera square on (its turn and tip), in front of it, and the camera does not move; panning and zoom work from the click, so the opening is not a locked sequence. Closing runs it back, faster: each card shrinks to its cube on the way, and the cube lands back in its live motion. A card whose picture has not arrived shows the face's picture, so no card flies empty. The orbit, float and flight maths are shared (`orbit.ts`, `float.ts`, `flight.ts`).
7. **The thumbnail form shows one medium.** The cover covers all six faces (owner, 2026-11-06); every other picture is a satellite. Each satellite shows its picture on all six faces (layers are shared by url).

## Method

Code, in `apps/web/components/forms-lab/`: `satellites.ts` (seeded placement), `form.ts` (orbit in `positionNode`; per-instance data stride 20 to 32, still one interleaved buffer), `layers.ts` (`satLayers`), `scene.ts` (clock, cluster picking), `FormsLab.tsx` (toggle and sliders), `config.ts` (all tuned numbers, `MAX_SAT` included), `orbit.ts` (orbit maths shared with the board), `texture-store.ts`.

By eye, on both backends:

1. Satellites orbit their form; entities with more pictures have bigger clusters.
2. The status line shows the same draws count with satellites on and off.
3. Click a form: the satellites shrink away with the other forms, the view opens as before. Esc: they return.
4. Click a satellite (when no form is under the pointer): its entity opens.
5. Sliders: radius, size and speed change the cluster live.

## Observations

**2026-11-06, built** (branch `exp/0006-spaces`). Type-check and lint pass. Not yet seen on screen.

From the code, before the by-eye check:

1. **Satellites take the main form's shader.** Shape morph, float tumble and outline apply to them too; a satellite is a small cube that becomes a sphere with the slider. Quarter-turn cadence and near-camera facing do not: a satellite spins steadily.
2. **Orbit and float add.** The orbit centres on the form's centre, which bobs and sways with the form; the satellite's own tumble (pitch, roll, yaw) uses its own phase.
3. **Picking has two stages.** Main forms are tested first by bounding sphere; the cluster's sphere (outermost orbit) only when none is hit. There is no per-satellite picking.
4. **Cost.** Up to nine extra instances per entity (the same 24³ cube mesh each), and up to nine more picture layers per entity, shared where the picture is already on a face.

**2026-11-06, seen by owner**, after five rounds on the board flight (hypothesis 6). Rejected on the way: an overshooting spring into and out of place ("a micro adjustment transition… it seems pretty weird"), a camera that travels to a set pose ("restrictive, because it's like a locked sequence"), and a critically damped step (not natural). Accepted: the live flight, flattening in between, the board set up facing the camera, and the front-loaded ease. The owner's words:

> It is getting there, getting better, it's good, will be better, but for now good. The floating form and its satellites really show a different cosmology of what would else be just a collection of images and pictures and media. It is interesting, and its movement makes it alive and unique. It is a new way to approach articles and pieces of knowledge.

Not reported yet: the draws count, cluster crowding between neighbours (prediction 2), satellite size at field distance (prediction 1), the sphere morph on satellites (prediction 4), and the WebGL 2 backend.

## Outcome

Partial, 2026-11-06. Status stays running: the cluster's legibility and crowding are not checked, and the choreography is still being tuned.

Result so far:

1. **The cluster changes what an entity is.** Seen in motion, a form with its satellites reads as one system, a cosmology, not as a set of pictures (owner). The hypothesis asked whether the cluster reads as "a lot in here"; it reads as more than that: as how the pictures belong together. Expanded in [STU-0007](../../studies/0007-entity-as-a-cosmology/README.md).
2. **Motion makes it alive and unique.** Each entity's seeded orbit and float make it move unlike any other (owner). Kept as a requirement, not a flourish.
3. **Only continuous motion keeps it alive.** Every rejected version had a correction or a stop (an overshoot settling, a camera on a fixed route, a hesitation on the way back); every accepted change removed one. Hypothesis 6, as now written, is confirmed by eye as "good, will be better".
4. **Opening is a change of reading.** The same bodies fly to the board and back, so the board reads as the cluster laid flat, not as a new page.

Predictions still to test, not results:

1. At field distance the small satellites (0.12 to 0.2 wide) will be a pixel block; the cluster reads as specks around one or two bodies, and the count carries the message.
2. Wider sizes widen the bands: an entity with nine extra pictures reaches about 4.3 from its form, close to the lab's spacing of 4.5, so neighbours' clusters will meet. Fewer pictures stay well inside. If it reads as crowded, cap the shells at one or enlarge the field's spacing.
3. With the cover alone on the form, the pictures that used to sit on faces 2 to 6 are now satellites, so the form reads as one image and the cluster as the rest.
4. The sphere morph makes satellites round; whether that helps or confuses is by eye.

Handoff, from the code:

1. **Choreography.** In `config.ts`, the explosion runs with p from the start. The hero leaves at `LEAD` (0.03), the satellites after it across `BOARD_WAVE` (0.25); each flies for `FLIGHT` (0.72, about 1 s). Over its first `FLAT` (0.35, about half the path; the ease is smoothstep of 1 - (1 - t)^`EASE_SKEW` 1.6, after Material 3's standard curve) the cube calms, and over the last `PRESS` (0.15) of that it is pressed flat; from `FLAT` its card shows and the cube is hidden. `VIEW_SECONDS` 1.35 (Material 3 extra-long range for the flights); closing is `CLOSE_SPEED` 1.3 times faster.
2. **One flight, two meshes.** `flight.ts` builds the path, ease and lean once; the cube (`form.ts`) and the card (`board-mesh.ts`) both call it with the same live start, so they agree at the handoff. A form or satellite stores its departure and landing (`board.ts` `departure`, `landing`, set in `scene.ts`) in spare slots (E.z, E.w, G.w), so the form mesh stays at 16 vertex attributes. A flying satellite settles to the nearest quarter of the board's yaw, picked from its turn when the flight began (`turnAt`), so the pick never flips mid-flight.
3. **Camera.** A board is set up in the camera's frame at the click (`flight.u` yaw, pitch, origin): square to the view, its hero centred at the hero's framing distance, so the camera stays put and board traversal starts at once, in the board's frame. A cube calms into the board's tip as it flattens, so it leaves upright. The net stays at its form, turned to the camera, and the camera travels in on a critically damped spring (`CAMERA_FREQ` 7), which also brings it back from a panned board on closing.
4. **Texture bank.** The board's texture array holds one entity's pictures at a time (at most `MAX_BOARD` 64), filled on hover and on open, with drawn pictures cached by url (`BOARD_CACHE` 48). This replaces the global budget, under which an entity past it opened as the net.
5. **Face fallback.** Until a card's picture is in the bank it samples the form or satellite face's layer, mapped through the same crop, so the swap never shows an empty card.
6. **Net view.** Opened as the cube net, the satellites recede with the other forms; the net turns to the camera's direction.

## Next

- Owner runs the rest of the list (draws, crowding, field distance, WebGL 2) and reports; tune radius, size and speed defaults.
- Per-satellite picking and click-to-open at that medium on the board. Satellites flying to their board place is done (hypothesis 6).
- Order satellites by the entity's media order instead of by hash (STU-0007 deduction 6); a follow-up experiment, not this one.
- Keep tuning the choreography by eye in both directions: `LEAD`, `FLAT`, `PRESS`, `BOARD_WAVE`, `EASE_SKEW`, `LIFT_OUT`, `LAND_DEPTH`, `BANK` and `CAMERA_FREQ` in `config.ts`.
- Kind-based shape (video, drawing) and more than six faces (DDR-0005 option C) are not tried.
