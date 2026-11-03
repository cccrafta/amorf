---
id: EXP-0005
title: One lifecycle for entering, swapping and leaving an entity
date: 2026-11-01
status: planned
question: Does routing every entrance and exit of an entity (from the field, between entities, back to the field) through one lifecycle with real boards and a readiness gate remove the flicker and the jumps of EXP-0003?
hypothesis: With one transition record, the next entity's real board mounted and its pictures decoded before it moves, and the live video staying with its board, a switch between entities shows no flicker, no empty frames and no layout jump, and entering from the field shows the radial unfold. It is wrong if any switch still flickers, jumps or shows empty frames on a warm cache, or if the dive feels slower.
method: Rebuild the entity view's enter, swap and leave on the lifecycle from STU-0002 (stage 1, motions unchanged), then move through at least twenty entities by label, Alt+arrow, related and elsewhere, from the field and back, on a trackpad and a mouse, noting every flicker, jump or empty frame.
materials: [entity-view-frame, board-slots]
tools: [next-prototype]
outcome:
decisions: []
tags: [entity-view, navigation, transition, lifecycle]
parts: [entity]
media: []
publish: false
case_study: entity-view
updated: 2026-11-01
last_verified: 2026-11-01
---

# EXP-0005: One lifecycle for entering, swapping and leaving an entity

Follows [EXP-0003](../0003-seamless-entity-switch/README.md) (the switch was janky) and [STU-0002](../../studies/0002-entity-lifecycle/README.md) (why: three code paths, one flag per symptom).

## Hypothesis

Every flicker fixed in EXP-0003 came back in another form because entering from the field, swapping to a neighbour and leaving are separate paths, and "which entity is open" lives in React state, in `ix` and in the camera at once. One lifecycle, with the incoming entity as a real board that is ready before it moves, should remove the class of bug rather than the instance.

## Method

### Choices taken (defaults, change before building)

1. Swap motion: the existing slide in the pull direction, now moving two real boards; moves with no direction (related, elsewhere, trace) cross-fade the two boards.
2. A swap does not replay the radial unfold; the dive from the field does, starting when the board becomes visible.
3. URL routing (deep link, back and forward) is out of scope.
4. Staged: stage 1 is the lifecycle, slots, readiness gate and media; tuning the motions is stage 2.

### Model (stage 1)

- **Transition record**, `ix.move: { kind: "dive" | "swap" | "surface", from, to, dir, stage: "prepare" | "run" | "settle", start } | null`, plus `ix.queued` (last request wins). It is the only "busy": input, Esc, edge labels and new moves read it. `ix.phase` keeps only `idle | inside`.
- **Lifecycle per kind**:
  - *dive* (field to entity): prepare = `setState({ open })` from the event, camera flies, board mounts invisible, waits for camera arrival and pictures; run = depth 0 to 1 and the unfold starts; settle = phase `inside`.
  - *swap* (entity to entity): prepare = `setState({ incoming })` from the event; the incoming board mounts beside the current one at its opening pan, waits for pictures (cap 400 ms); run = both boards move on one clock; settle = arrival bookkeeping (trace, visits, jump, camera snap), pan and zoom taken from the incoming board, `setState({ open: incoming, incoming: null })`, move ends once React has committed.
  - *surface* (entity to field): run = depth 1 to 0; settle = video stowed, `setState({ open: null })`, then the queued move (replaces `leaveTo`).
- **Boards keyed by entity id**, rendered as `[open, incoming]`: when a swap settles the incoming board keeps its key, so nothing remounts. The text overlay moves inside its board; the fixed frame stays outside.
- **No previews.** The cover, the four peek previews, `boardOf` previews and the flags `slid`, `slide.switched`, `slide.out`, `panKey` gating, `floatFor` go. Neighbours only preload pictures at idle.
- **Readiness gate**: all `<img>` in the incoming board `complete` (polled in `step`), capped at 400 ms; `step` never calls `setState` or `enter` from inside the frame.
- **Media**: the live video's slot is looked up inside its own board (`[data-board=id] [data-part=slot]`); it stays in the outgoing board through the swap and is stowed in settle before that board unmounts; frames between settle and commit do not put it back.
- **One reset**: `resetBoard(ix)` (pan, zoom, velocity, drawer, menu, float open, scroll panel, edge) is called by prepare only; `begin`, `dismiss`, `collapse` and `switchTo` stop resetting their own subsets.
- **Unfold**: pieces render with the animation paused; `paint` sets `data-run` on the board when the dive's run starts, which plays it.

### Files (expected)

`interior/state.ts` (move, queued, resetBoard), `interior/lifecycle.ts` (request, queue, the three kinds), `interior/physics.ts` (step drives stages, readiness gate), `interior/paint.ts` (two boards, depth, slide or cross-fade), `interior/layout.ts` and `interior/view.tsx` (board per id, no previews), `navigation.ts` (enter split into prepare and arrive), `media.ts` (slot per board, stage-aware open), `Field.tsx` (`incoming` state), `interior/input.ts` (reads `ix.move`).

### Trial

Twenty or more moves by label, Alt+arrow, related, elsewhere and trace; from the field and back; trackpad and mouse; one entity with a video. Note each flicker, jump, empty frame or stuck state, and the feel of the dive.

## Observations

Not started.

## Outcome

## Next
