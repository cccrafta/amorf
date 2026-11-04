---
id: STU-0002
title: Entrance and exit of an entity, from the field and between entities
date: 2026-11-01
status: running
parts: [entity, field]
question: How should an entity be loaded, entered, left and swapped so that every path (from the field, between entities, back to the field) goes through one lifecycle instead of per-path patches?
sources:
  - "amorf code, apps/web/components/field (read 2026-11-01): navigation.ts, interior/{lifecycle,physics,layout,paint,view,state}.ts, media.ts, lib/media/*"
  - "React Transition Group, Transition states: https://reactcommunity.org/react-transition-group/transition/"
  - "Motion, AnimatePresence and its modes: https://motion.dev/docs/react-animate-presence"
  - "Jetpack Compose EnterExitState: https://developer.android.com/reference/kotlin/androidx/compose/animation/EnterExitState"
  - "XState discussion on modelling animation as child states: https://github.com/statelyai/xstate/discussions/3168"
  - "View Transitions, Baseline status: https://web-platform-dx.github.io/web-features-explorer/features/view-transitions"
  - "React ViewTransition reference: https://react.dev/reference/react/ViewTransition"
  - "MDN, HTMLImageElement.decode(): https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode"
  - "Unity, AsyncOperation.allowSceneActivation: https://docs.unity3d.com/ScriptReference/AsyncOperation-allowSceneActivation.html"
  - "tldraw camera and slideshow: https://tldraw.dev/sdk-features/camera, https://tldraw.dev/examples/slideshow"
  - "Material 3, container transform: https://m3.material.io/styles/motion/transitions"
deductions:
  - Entering from the field, swapping to a neighbour and leaving are one lifecycle (prepare, enter, active, exit, unload) with different motions, not three code paths.
  - The next entity must be committed to the DOM, laid out and have its visible pictures decoded before its entrance starts (ready before reveal).
  - The incoming board is the real board in a second slot, not a preview, so there is nothing to cross-fade between.
  - One transition record is the only notion of "busy"; input, Esc and new moves read it.
  - View Transitions do not fit the hand-rolled rAF camera; keep them out of the core.
raises: [EXP-0005]
tags: [entity-view, navigation, transition, lifecycle]
media: []
publish: false
case_study: entity-view
updated: 2026-11-01
last_verified: 2026-11-01
---

# STU-0002: Entrance and exit of an entity, from the field and between entities

## Question

An entity has an entrance and an exit. It is entered from the field (a dive from its card) or from another entity (neighbour, related, elsewhere, a trace), and left back to the field or to another entity. Each of these is a separate code path today, and transition glitches (the slide flicker, EXP-0003) have been fixed with one flag per symptom. The question: what single lifecycle should every path go through?

## Sources

Read: the current code (mapped 2026-11-01, see Notes), and the web sources in the frontmatter. Pad++ / semantic zooming: not read, from general knowledge only.

## Notes

### The code as it is (2026-11-01)

- **Data.** Entity list and data are fetched from R2 at build time and baked into the page (`lib/data/entities.ts`). Media is fetched at runtime from R2. There is no URL routing: nothing is deep-linkable and back/forward do nothing.
- **Entry from the field.** `navigation.open` or `flyTo(andOpen)` (60 ms timer) to `enter`: `begin()` resets `ix`, `setState({ open })`, the camera flies (`approach`). Phase `approach` keeps depth at 0 for up to 1.5 s, then `inside` eases depth to 1 and `paint` grows the board from the card's rect.
- **Between entities.** `slideTo`: phase `slide`, a preview (`cover`) slides in; after `SLIDE_MS` the physics step calls `switchTo` from inside the rAF frame, which calls `enter` again (full reset, `setState`, a nested `tick`). The cover then waits for the new board (`comp.id`, `panKey`, pictures) and fades.
- **Exit.** `collapse`: phase `leaving`, depth eases to 0, then in one frame `stowMedia`, `setState({ open: null })`, and optionally `flyTo(leaveTo)`. `dismiss` is a second, immediate exit with fewer resets.
- **Where "open" lives.** In three places that disagree for one React commit on every transition: React `state.open` (async), `ix.phase/slide/comp` (sync), and the camera targets. The flags `slid`, `slide.switched`, `slide.out`, `panKey`, `floatFor`, `layoutKey`, `compKey` and `wheelMute*` exist to cover that gap.

Problems found, by likely visible impact:

1. The four hidden neighbour previews are full boards with real `<img>`, so neighbour pictures load at entry in parallel with the current entity's (undoing `preloadLater`), and four boards rebuild on every Field render.
2. The live video leaves the board when a slide starts (`syncMedia` only counts phase `inside` as open), so the outgoing board slides away with an empty frame.
3. `switchTo` runs inside the rAF frame before React commits; for a few frames media and paint run against the old DOM (the old video is moved back into a slot that is about to unmount).
4. From the field, the radial unfold plays while the board is still invisible (it starts at mount, during `approach`), so it is usually missed; from a neighbour it is skipped on purpose. The two entrances differ.
5. After the switch, phase is `inside` while the cover still fades: pans, Esc and another move are accepted mid-transition. "Busy" means two different things (`phase === "slide"` and `ix.slide`).
6. Reset asymmetry: `begin`, `switchTo`, `dismiss` and `collapse` each reset a different subset of state (`floatOpen`, `menu`, `scrollPanel`, `depth`, `layout`).
7. Re-entrancy: `enter` ticks a nested frame inside `step`; render (`buildInterior`) mutates `ix` and fires preloads.
8. Overlapping exits: a pending `leaveTo` cannot be cancelled; `flyTo`'s 60 ms timer is never cancelled, so two `open` calls can fire.

### Outside patterns

- **Presence state machines.** React Transition Group (`entering / entered / exiting / exited`), Motion `AnimatePresence` (a removed child stays mounted until it reports done; `mode` chooses whether exit and entry overlap) and Compose `EnterExitState` all model one view's presence as phases, with the overlap of A leaving and B entering expressed as two records advanced by one clock. XState needs parallel or child states for overlap; a reducer with a phase enum is enough.
- **Ready before reveal.** Unity loads a scene to 90 % and holds it (`allowSceneActivation = false`) until activation, and unloads the old scene only after the new one is active. On the web: `img.decode()` resolves when a picture is safe to show (`decoding="async"` does not guarantee that); gate on it with a time cap.
- **Keeping the next scene alive.** Double buffering: two scene slots (current, incoming) that swap roles. React 19.2 `<Activity mode="hidden">` keeps a subtree's state but uses `display: none`, so it does not lay out or decode; warm with `visibility: hidden` instead.
- **View Transitions.** Same-document `startViewTransition` is Baseline since 2025-10 (Firefox 144: callback only). React's `<ViewTransition>` was still canary in the sources found. It snapshots the old state, pauses rAF during the update and freezes looping JS animation, so it conflicts with the rAF camera; usable at most for a discrete cross-fade while the camera is still.
- **Spatial precedent.** tldraw: one camera with `zoomToBounds`, and a slideshow is the same camera moving between frames. Material container transform and FLIP: one container persists and interpolates from the card's rect to the viewport. amorf's dive already does this; a neighbour swap can be the same kind of camera move.

## Deductions

1. **One lifecycle, three motions.** Every entity goes through `prepare → enter → active → exit → unload`. The paths differ only in the motion of `enter` and `exit`: *dive* (from the field card), *swap* (from or to a neighbour) and *surface* (back to the field).
2. **One transition record.** `{ kind: dive | swap | surface, from, to, stage, start }` is the only "busy". Input, Esc, edge labels and new moves read it. A move asked for during a transition is queued (last wins) and runs when the current one ends, never overwrites it.
3. **Ready before reveal.** `prepare` commits the target's real board to the DOM (one React commit, in an event or effect, never from inside the rAF frame), lays it out, and waits for its visible pictures' `decode()` with a cap (about 400 ms). Only then does the clock of `enter` start. React `state.open` is set in `prepare`, so React, `ix` and the camera agree before anything moves.
4. **Two board slots, no preview.** The board is keyed by slot (A, B), not by entity. A swap mounts B with the real next board while A is still showing, moves both on one clock, then unloads A. The cover, the four peek previews and `slid`, `switched`, `out`, `panKey`, `floatFor` disappear; neighbours only preload pictures at idle (the media-loading principle).
5. **Media follows the stage.** The live video belongs to the board in `active` or `exit`; it leaves A only when A unloads and joins B when B becomes active. `stowMedia` runs in `unload` only.
6. **One reset.** Per-entity UI state (pan, zoom, float open, menu, drawer, scroll panel) lives on the board slot and is created fresh in `prepare`; nothing is reset by hand in several places.
7. **The radial unfold belongs to `enter`, not to mount.** It plays when the reveal starts, for the dive; whether a swap plays it too is a design choice, not a side effect.
8. **Not View Transitions.** Keep the core in the existing rAF loop; a View Transition could be added later only for a still-camera cross-fade.

## Next

- Agree the model (deductions 1 to 8) and the open choices below, then write the target design (a section in [entity-view.md](../../../docs/design/entity-view.md) or its own page) and a DDR for the lifecycle.
- Open choices: the swap motion (keep the slide, or a camera move between boards as one table); whether a swap replays the unfold; whether URL routing (deep link, back and forward) is in scope, since it would be one more way to enter and leave; build in one step or stage it (lifecycle and slots first, motions after).
