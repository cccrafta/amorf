---
id: EXP-0012
title: A WebGL ground against the CSS-only void
date: 2026-11-05
status: running
question: Does a WebGL ground with a texture gradient, fog and a horizon make the field read as a place where the CSS-only field reads as a void?
hypothesis: A textured ground that recedes to a horizon at one eye height, fading into the background by fog, gives the cards something to stand on and a scale to be measured against, so the visitor can say how far a card is and which way they face, and the field stops reading as cards floating in nothing. It is wrong if the ground reads as decoration, if the cards still float because they do not touch it, or if the DOM and the ground drift apart enough to be noticed.
method: Alternate sessions with the ground (the default) and without it (?gl=0) on the same field, the designer as sole pilot, keeping first-person notes in Observations.
materials: [field-ground, texture-gradient]
tools: [next-prototype, three-js, first-person-notes]
outcome:
decisions: []
tags: [ground, horizon, webgl, place-not-void]
parts: [field]
media: []
publish: false
case_study: null
updated: 2026-11-05
last_verified: 2026-11-05
---

# EXP-0012: A WebGL ground against the CSS-only void

Follows [STU-0003](../../studies/0003-place-not-void/README.md), deductions 1 (a place needs a ground), 2 and 12 (every entity touches the ground, the camera stays at one eye height). Decision record: [ADR-0019](../../../docs/decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md).

## Hypothesis

The CSS field has cards in perspective on a flat dark gradient. CSS 3D has no ground, no shadow and no depth buffer, so distance is told only by card size and blur. Gibson's ground theory says distance and size are read from a textured surface that recedes to a horizon; Data Mountain's authors named the lack of such cues "desert fog". This experiment adds only the ground and tests whether that alone changes how the field reads. Cards, overlays, plan and minimap stay DOM and unchanged, so any difference comes from the ground.

It is wrong if the ground reads as decoration, if the cards still float because nothing links them to it (they do not yet cast contact shadows or stand on it), or if the ground and the cards drift apart enough to be noticed.

## Method

1. The ground is on by default since 2026-11-05 (first behind `?gl=1`); `?gl=0` leaves the CSS-only field untouched and three.js is not loaded.
2. A canvas behind the cards draws one plane in three.js, with a camera that reproduces the CSS projection and follows `f.cam`. Cards stay DOM.
3. Alternate sessions with the ground and with `?gl=0`, on the same field. After each, write first-person notes in Observations: can I say how far a card is, does the horizon tell me where I look, do the cards stand on it or float, do I notice the ground at all.

Visitor: the designer alone, as a pilot. The designer knows the design, so this tests the ground's effect on the designer's own reading, not whether a first-time visitor perceives a place.

## Observations

**2026-11-05, prototype built** (branch `exp/0006-spaces`, `apps/web/components/field/ground.ts`). Starting values, to be tuned in the pilot:

- Texture period: 310 world units (tile 6200 / 20), so the pattern closes on itself after one wrap and the texture offset follows the eye modulo the period; the mesh never moves. One 1024 px canvas texture per period: 10 divisions (a fine line every 31 units, a stronger one every 155, the strongest on the period edge), a 6% ink tint, and 1500 seeded speckles. Lines in `--field-line`, tint and speckle in `--field-ink`, both read with `getComputedStyle`. Mipmaps on (trilinear) and maximum anisotropy, so the grid thickens to tone toward the horizon instead of shimmering.
- Fog: transparent fade, not a colour mix, because the stage behind is a gradient. Starts 400 units in front of the card frame (depth 1300 from the eye) and is gone at 1.3 times the field's draw distance (depth 4410). Scene fog colour is `--field-bg-mid`, used only as the fog parameter.
- Field of view: vertical fov = 2 atan((H / 2) / P) with P = 900, so 53.1 degrees on a 900 px high window. The principal point is lowered by 0.08 of the height so the horizon sits at the CSS perspective origin, 46% down.
- Eye height: `EYE_HEIGHT` in `ground-math.ts`, 480 world units above the ground plane (raised from 236 on 2026-11-05 after the first look found the floor too close; it is the one number to tune). The plane lies under the eye, which stands at the perspective origin's height, so the horizon stays at 46% of the window. The eye stands 900 units (P) behind the point the camera's x and z name, on the line the yaw turns about.
- Cards (added the same day, see the next entry): each card's bottom edge sits on the ground plane, `groundY(H)` units below the stage centre (`EYE_HEIGHT - 0.04 H`).
- Resolution: device pixel ratio capped at 2; a frame is drawn only when the eye or yaw changed (or the window resized).

Limits, known before the first session:

- Hidden inside a space (`?spaces=`), where the view is the space's own, not `f.cam`.
- The ground fades out as an entity is opened, with the same depth as the cards.
- Cards touch the ground only as flat planes of DOM: no contact shadow, no occlusion by the ground. Those are step 2.
- The cards' blur and fade stay CSS; the ground does not occlude or shadow anything.
- The canvas texture is uploaded unpremultiplied from an 8 bit canvas, so the faintest tint pixels carry some colour noise.

**2026-11-05, first look: made the default, drift fixed by measurement, cards pinned.** The designer liked the ground on first sight and made it the default, so the CSS-only field now needs `?gl=0`. Two faults showed in the first look and were fixed the same day:

- Drift. Walking or turning, a card did not stay over one spot of the grid. Measured with a Node script that runs the exact CSS chain of `frame()` and `ui/stage.tsx` (perspective 900, origin 50% 46%, card `translate3d`, `rotateY`, `translate(-50%, -50%)`) against the three.js camera of `ground-math.ts`, over 4000 random camera positions and yaws at 1440x900 and 390x844. The camera itself was right: with the card's bottom-midpoint projected through both, the error was 0 px once the card turned about its own centre. The fault was the card: its `transform-origin` defaults to the box centre, so `translate(-50%, -50%)` applied first swings the card off its anchor by up to half its width (200 units) and shifts it in depth as it turns. Max error before: 157.7 px at 1440x900 and 70.5 px at 390x844 (centre-point: 152.4 and 55.9). Pinned cards now use `transform-origin: 0 0`; max error after: 0.000 px at both sizes. The texture phase against world positions agrees to 1e-11 units, so the grid is world-fixed. Not checked in a browser against live pixels.
- Floating and sinking. Cards were scattered by up to 260 units either way, so on average they stood 131 units off the plane. With the ground on, the scatter is dropped and each card is placed by its own height: `dy = GROUND_Y - height / 2`, so the bottom edge sits on the plane (mean and max distance 0 in the same script). `groundY(H)` was 200 units below the stage centre at first; it now follows `EYE_HEIGHT` (see the entry of 2026-11-05 on the eye). Card height is read from layout and cached for a second per card.

- Pins and routes. A second look (owner screenshot) showed each card's blue pin line dropping about 450 px to the old floor height, with the walk route running there too, so the pins looked sunk into the grid. With the ground on, `tracks.ts` now puts every foot at the ground plane under the card's anchor, so the pin has no length and is not drawn (the short foot tick stays), and the route segments lie on the plane between the feet. The wear "pull" did move a pinned card off its foot (up to 706 px at 1440x900 in the script), so the pull is one shared formula (`wearPull`) and the foot moves with the card. In the same Node script, a pin foot and a route endpoint project onto the same pixel as the card's bottom-edge midpoint and as the ground point beneath it: 0.000 px at both viewport sizes. `?gl=0` keeps the old floor, the scatter and the centre origin unchanged.

Limit left: a worn card standing closer than its coordinate says now stands on a different spot of the grid while its wear changes, because the pull moves it along the line of sight on purpose.

Session notes go below, one dated entry per session.

- Eye raised, path no longer cut (2026-11-05). `EYE_HEIGHT` 480 (was 236): the grid no longer looms. A card is about 380 tall, so at 900 px high its bottom edge stands `groundY` = 444 units below the stage centre and its centre about 254; at depth 1000 (scale 0.47) the bottom lands near 71% of the window height and the centre near 61%, so cards sit in the middle-lower third and nearer ones drop lower. The horizon is unchanged at the perspective origin. Node check at 1440x900 and 390x844: card bottom-midpoint, card centre, feet and route endpoints against the three.js camera all 0.000 px, texture phase 4e-12 units.
- The cut route. Cause: `tracks.ts` clamped a segment at `lz = -30` (30 units in front of the camera frame's origin, which is 900 units in front of the eye), so a ground line from a card toward the viewer ended where the frame origin crosses the floor, mid-grid, though the floor runs on below it to the screen's bottom edge. Segments were also dropped when both ends were beyond 12000 units or the route's centroid copies (3x3) did not reach, so a segment toward a far card ended short. Fix, with the ground on: `clipNear()` clips each segment in 3D against a plane `NEAR_EYE` (60 units) in front of the eye, then projects, so the line runs off the screen's edge; pieces are rejected only when both ends are past the same screen edge; the distance culls are gone and each piece is faded by band from its own clipped depth (`BAND_OP`, as the fog); routes are unwrapped from their first card by the shortest wrapped step (`unwrapRoute()`, as the minimap) and repeated for every torus copy within `ROUTE_REACH` (9000) of the camera. Node check: 4000 segments per size with one end behind the camera all end beyond the viewport edge, and in-front segments are untouched. Not checked in a browser against live pixels.

## Outcome

## Next

- Run the alternating sessions and fill Outcome.
- Cards stand on the ground and the camera is measured against the CSS projection; next, judge the look: does the grid work as a ruler, and does the horizon tell where I look?
- If it holds, step 2 is cards as textured planes standing on the ground with real occlusion (deduction 11), which is its own experiment.
