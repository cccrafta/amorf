---
id: EXP-0011
title: A plan drawn by walking against a list of steps
date: 2026-11-05
status: running
question: Does a small live plan of the walk, with unvisited entities faint, orient the visitor better than a list of step titles, without pulling the eye off the field?
hypothesis: A wordless plan in the corner that follows the visitor, draws the walked route as one line, marks visited entities solid and leaves unvisited ones as faint ticks, lets the visitor say where they are and where they have been more readily than the list of step titles does, and the eye stays on the field. It is wrong if the visitor watches the corner instead of the field, or still cannot say where they are.
method: Replace the walk's step list with the minimap (on by default, ?map=0 brings back the list) and alternate sessions with and without it, the designer as sole pilot, keeping first-person notes in Observations.
materials: [field-plan, walk-route]
tools: [next-prototype, first-person-notes]
outcome:
decisions: []
tags: [wayfinding, promenade-architecturale]
parts: [journey, field]
media: []
publish: false
case_study: null
updated: 2026-11-05
last_verified: 2026-11-05
---

# EXP-0011: A plan drawn by walking against a list of steps

Follows [STU-0001](../../studies/0001-promenade-architecturale/README.md) and [STU-0003](../../studies/0003-place-not-void/README.md). Sits beside [EXP-0006](../0006-thresholds-between-spaces/README.md), which asks how a visitor knows they have arrived somewhere; this one asks how they know where they are along a walk.

## Hypothesis

Today a walk is shown as a left column of step titles, marks and years. It says what was visited, in order, and nothing about where. The plan view (`/plan`) already draws the walk and the visitor on the field from above, but it is a full-screen overlay that takes the visitor out of the field.

Choisy keyed each perspective to a plan so the eye could move between the two ([STU-0001](../../studies/0001-promenade-architecturale/README.md)). A small plan that stays in view while the visitor walks is the same pairing, live. Two deductions of [STU-0003](../../studies/0003-place-not-void/README.md) shape what it shows:

- Deduction 4, conceal then reveal: unvisited entities are only faint ticks, never names or pictures, so the map does not give away what is ahead.
- Deduction 9, the journey drawn as a trace: the route walked so far is one continuous line, and the visitor is a point with the direction they face.

The known risk comes from games: players watch the minimap and stop looking at the world. The map is therefore small, flat, wordless and without a frame.

It is wrong if the visitor watches the corner instead of the field, or still cannot say where they are after reading it.

## Method

1. On by default since 2026-11-05 (first behind `?map=1`); `?map=0` brings back the step list for the comparison sessions.
2. The minimap replaces the left step list while a walk exists. It is a small live copy of the plan's drawing, bottom-left, with the visitor at the centre and a window of the wrapping field around them.
3. Clicking it opens the plan view, the full-size version of the same drawing, where titles live.
4. Alternate sessions with the map and with `?map=0`, on the same field. After each session write first-person notes in Observations: where the eye went, whether the visitor could say where they were and where they had been, whether the corner pulled attention.

Visitor: the designer alone, as a pilot. The visitor knows the design, so this tests orientation and eye behaviour, not whether the map is understood unprompted. If it holds, outside visitors are a follow-up.

## Observations

**2026-11-05, prototype built** (branch `exp/0006-spaces`, `apps/web/components/field/map.ts` and `ui/map.tsx`). Starting values, to be tuned in the pilot:

- Size: 180 px square on wide screens, clamped from 120 px (14 vw). No box, no frame, no text.
- Window: the visitor is at the centre and the map shows 2700 world units each way (the field's draw distance), 5400 across, about 87% of the 6200-unit tile.
- Route: the walk colour (`--field-walk`) at 0.9 opacity, 1.2 px, one line; where the field wraps the line is cut at the map edge and continues from the opposite one, never drawn across the map.
- Entities: visited ones are solid squares of 4.4 units (`--field-accent`, 0.85 opacity); unvisited ones are 3.8 unit ticks (`--field-ink-warm`, 0.28 opacity).
- Visitor: a 2.6 unit point in the walk colour with a cone of 50 degrees full angle, 62 units long, fill 0.16 opacity, outline 0.8.
- Limits: hidden inside a space (`?spaces=`), where the plan is the table rather than the field. Hidden while an entity, the plan, the catalogue, the table or a note is open. Entities with no position in the window are not shown. The cone shows direction, not the real field of view. On a narrow screen the map shares the bottom edge with the focus bar and has not been adjusted for it.

**2026-11-05, first look, made the default.** The designer liked it on first sight and made it the default, so the step list now needs `?map=0`. A visited entity now shows its own thumbnail on the map (15 by 10 units, cropped to fill) instead of a square, so the walk reads as what was seen; a visited entity with no thumbnail keeps the square. Unvisited entities stay faint ticks.

Session notes go below, one dated entry per session.

## Outcome

## Next

- Run the alternating sessions and fill Outcome.
- If it holds, decide what a space shows (the table plan with the visitor in it) and whether the map offers a way back to a step.
