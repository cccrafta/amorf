---
id: EXP-0003
title: Feedback for a seamless switch between entities
date: 2026-11-01
status: done
question: When moving to a neighbouring entity happens with no transition, what cue tells the reader that the entity has changed without breaking the flow?
hypothesis: A cue in the fixed frame (reference number and title stamp changing, with a short hairline sweep in the direction of the pull) is noticed by most readers and feels faster than a slide; it is wrong if readers miss the switch or prefer the slide.
method: Prototype four cue variants on the same seamless switch and ask five readers after each move whether they changed place and which variant they would keep.
materials: [entity-view-frame, edge-pull]
tools: [next-prototype, think-aloud]
outcome: "Not answered. The in-place switch (map path, then a slide that follows the pull) felt janky: movement inside an entity is restricted, scroll inertia makes the switch fire unevenly or skip several entities, and the move is not yet intuitive. Another transitional feature is needed, not yet known."
decisions: []
tags: [entity-view, navigation, transition, feedback-cue]
parts: [entity]
media: []
publish: false
case_study: entity-view
---

# EXP-0003: Feedback for a seamless switch between entities

## Hypothesis

Feedback (2026-10-31): the animation between entities is not good; ideally the reader is suddenly already in the new entity, but they must still know the entity switched. The current round trip (collapse to the card, camera flight across the field, dive) is slow and leaves the reader nowhere to look. A switch with no transition plus one clear cue should feel immediate and still be legible. It is wrong if readers do not notice the switch, or if they prefer motion.

## Method

The board is replaced in place at the moment of release; the camera moves to the neighbour behind the interior so exiting still lands correctly. Variants of the cue:

1. **Frame only.** Reference number ticks (`007 / 025` to `008 / 025`) and the title stamp prints in, nothing else moves.
2. **Hairline sweep.** A 1 px line crosses the frame in the pull direction (about 300 ms), carrying on the edge line the pull already draws.
3. **Cut with flash.** One frame of the field background between boards, plus a soft click from the spatial audio.
4. **Slide (baseline).** Outgoing board leaves in the pull direction, incoming enters from the opposite edge, about 450 ms.

Five readers, ten moves each, variants in rotating order. After each move: "did you change place?" At the end: which variant to keep.

## Observations

2026-11-01: before any reader session, feedback replaced the four cues. First a map transition (path drawn from this entity to the next, then switch in place): built and rejected the same day as not snappy and not intuitive, since the path direction did not follow the pull. Then a slide that follows the pull: the neighbour's preview peeks in with the drag and finishes on release ([entity-view.md, B. Shipped](../../../docs/design/entity-view.md#b-shipped-slide)). Outcome to be written once readers have tried it.

Not started.

2026-11-01, tried by the author on a trackpad after each iteration (map transition; slide with an opaque preview; slide with a transparent preview locked to the board edge; neighbour media preloaded; trackpad momentum read as release; inertia reduced and made tunable):

- **Movement is restricted.** Inside an entity you cannot move freely: every edge is also a door to the next entity, so panning near an edge risks leaving. It is uncomfortable.
- **Inertia breaks continuity.** Trackpad momentum makes the switch fire at the wrong moment; tuning it down to fix that makes the pan feel cut off, and a quick swipe can move through several entities.
- **Not intuitive yet.** The slide was the best of the variants, but it still does not explain itself. Something else is needed between entities, not yet known.

## Outcome

Hypothesis not confirmed. Switching in place from an edge pull is janky: it restricts movement inside an entity, depends on scroll inertia in a way that cannot be tuned to feel right (too much skips entities, too little cuts the pan off), and is not yet intuitive. The slide that follows the pull is kept in the code as the best variant so far, not as the answer.

## Next

- Separate panning from leaving: an edge should not be a door by default (for example, leaving only by an explicit control, a deliberate hold, or the neighbour labels).
- Look for another transitional feature between entities; what it is is open (see [entity-view.md](../../../docs/design/entity-view.md), Still open).


The kept variant goes into the DDR for the round-2 entity view.
