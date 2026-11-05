---
title: "ADR-0019: Use three.js for the field's ground, on by default with ?gl=0 as the opt-out"
status: proposed
date: 2026-11-05
deciders: [cccrafta]
supersedes:
superseded-by:
related: [EXP-0012, ADR-0006, ADR-0007]
updated: 2026-11-05
last_verified: 2026-11-05
---

# ADR-0019: Use three.js for the field's ground, on by default with ?gl=0 as the opt-out

## Context and Problem Statement

The field is CSS 3D: cards in perspective on a gradient. CSS 3D has no ground, no depth buffer, no shadows or haze, so the field reads as cards floating in a void ([STU-0003](../../../research/studies/0003-place-not-void/README.md), deductions 1, 2 and 12). A textured ground that recedes to a horizon needs a renderer that can draw one with mipmaps, anisotropic filtering and fog. Which one, and how is it introduced without risking the working field? It began as a spike behind `?gl=1`; on 2026-11-05 the owner liked it and made it the default, so `?gl=0` is now the opt-out that leaves the CSS-only field untouched.

## Decision Drivers

- The field's loop is an imperative `requestAnimationFrame` function in a class component (`Field.frame()`); whatever draws the ground must be driven from it, not from a second loop or a React tree.
- The eager bundle must not grow, and a visitor with `?gl=0` must not download three: the ground is an experiment ([EXP-0012](../../../research/experiments/0012-webgl-ground-against-css-void/README.md)) that is still being judged.
- Static export, client only ([next-16-static-export](../../conventions/next-16-static-export.md)); no Next-specific loader or plugin ([ADR-0006](0006-turbopack-no-custom-webpack.md)).
- Step 2 (cards as textured planes with real occlusion) should be reachable from the same renderer without a rewrite.

## Considered Options

- Stay CSS-only (faked ground: a CSS gradient or a transformed repeating background).
- Raw WebGL.
- three.js, driven from `frame()` and loaded by dynamic `import("three")`.
- react-three-fiber.

## Decision Outcome

Chosen option: "three.js, driven from `frame()`, dynamically imported, on by default with `?gl=0` as the opt-out", because it is the only option that gives a mipmapped, anisotropic, fogged ground now and a scene graph for step 2, while keeping the imperative loop in charge and three out of the eager bundle.

### Consequences

- Good: the ground follows the CSS camera by construction (same fov, eye and yaw), cards and overlays stay DOM and unchanged, and with `?gl=0` nothing changes.
- Good: the same renderer can later hold cards as planes, contact shadows and occlusion (deduction 11) without a second engine.
- Bad: bundle cost. three is about 744 KB raw in its own lazy chunk (measured in the 2026-11-05 static export, before compression), fetched after first paint by the dynamic import, now on every first load unless `?gl=0`; the eager Field chunk gains only the call site. It still needs a budget, a smaller import surface or a lazy start, and the status stays proposed until the owner has judged it. A visitor without WebGL falls back to the CSS-only field for the session.
- Bad: two projections must stay in step by hand (CSS `perspective: P` with its origin at 46% height, and the three.js camera); a change to either breaks the alignment without a type error. The camera maths lives in `ground-math.ts`, free of the DOM, so a Node script can compare it with the CSS chain (2026-11-05: 0 px error on 4000 random poses at two viewport sizes).
- Bad: with the ground on, cards drop their vertical scatter and turn about their own centre, so the field looks different from the CSS-only one, by design.
- Neutral: adds `three` and `@types/three` to `apps/web`. If the ground is dropped, remove `ground.ts`, `ground-math.ts`, its call sites in `Field.tsx`, `ui/stage.tsx` and `route.ts`, and both dependencies.

### Confirmation

`pnpm build` must succeed (static export), and the eager chunks listed as scripts in `out/index.html` must not contain three's internals; the check on 2026-11-05 found the renderer only in a separate lazy chunk.

## Pros and Cons of the Options

### Stay CSS-only

- Good: no dependency, no bundle cost.
- Bad: no texture filtering toward the horizon, no fog on a surface, no path to occlusion. A flat repeating background cannot be made into a ruler that gets finer with distance.

### Raw WebGL

- Good: smallest possible code, no dependency.
- Bad: mipmaps, anisotropy, fog, colour management and context handling are written by hand, and step 2 would add a scene graph and picking by hand too.

### react-three-fiber

- Good: declarative scene.
- Bad: it runs its own render loop and React reconciler, which fights the imperative `frame()` loop that already owns the camera and the card styles. Rejected.

## More Information

- Operational notes: the "Ground (2026-11-05, experiment)" section of [the entity view design page](../../design/entity-view.md).
- Evidence: [EXP-0012](../../../research/experiments/0012-webgl-ground-against-css-void/README.md), [STU-0003](../../../research/studies/0003-place-not-void/README.md).
