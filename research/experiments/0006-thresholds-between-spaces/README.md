---
id: EXP-0006
title: Crossing a threshold from the field into a space you curated
date: 2026-11-03
status: running
question: When the entities a visitor has set aside on the table become a place entered through a threshold, with their own atmosphere and at the coordinates the visitor arranged, does entering it feel like arriving in a space rather than opening a panel?
hypothesis: Walking from the field through a threshold into one's own curation, laid out in depth from the table arrangement and wrapped in its own fog, reads as arriving somewhere one made, and leaving reads as returning to the field. It is wrong if it feels like the same overlay with a camera move added, or if the threshold reads as a loading transition.
method: Behind a ?spaces=1 flag, turn the table into a walkable space (table positions become floor coordinates, own fog colour and density) entered from the field through a threshold, then walk in and out of it over several sessions and keep first-person notes, one threshold variant per round.
materials: [table, field-spaces, threshold]
tools: [next-prototype, first-person-notes]
outcome:
decisions: []
tags: [promenade-architecturale, threshold, wayfinding]
parts: [space, field]
media: []
publish: false
case_study: null
updated: 2026-11-04
last_verified: 2026-11-04
---

# EXP-0006: Thresholds that make a space felt in the field

Follows [STU-0001](../../studies/0001-promenade-architecturale/README.md). First of five experiments drawn from it; the others (EXP-0007 to EXP-0010) assume a visitor can tell one space from another, which this one tests.

## Hypothesis

The ontology defines a space as a field with a specific set of entities at specific coordinates, read architecturally as territory ([space](../../theory/ontology/space.md)). Today the field is one continuous environment, so a space exists only as data. The field hub asks how a visitor knows where they are in "the void" ([field](../../theory/ontology/field.md)).

The promenade gives the answer architects use: a route is a sequence of distinct places joined by thresholds, and what you feel at the threshold is the change (STU-0001, notes on the houses and on Choisy).

A space here is made by the visitor, not the site. The table already lets a visitor set entities aside and arrange them; that set, arranged, matches the ontology's definition of a space. The field stays one space of its own. Today the table opens as a flat overlay on top of the field: a mode, not a place. If the promenade carries over, giving the curation depth, its own atmosphere and a threshold between it and the field should turn it into territory.

The table also stays as the plan: arranged flat, walked in perspective, the same pairing as Choisy's perspectives keyed to plans.

It is wrong if entering feels like the overlay with a camera move, or if the threshold reads as loading.

## Method

1. Behind `?spaces=1`, so the live field is unchanged.
2. Map each set-aside entity's table position (`tablePos` x, y) to floor coordinates (x, z) in the space.
3. Give the space one atmosphere that differs from the field on a single axis: fog colour and density. Add ground, light or sound only in later rounds.
4. Threshold, one variant per round so a result traces to one cause:
   - Round 1: atmosphere blend only, a short crossing where the fog changes colour.
   - Round 2: a gate, a frame the camera passes through.
5. Leaving returns the camera to where it stood in the field.
6. Keep the table across reloads for the prototype, so a space lasts long enough to return to.
7. Walk in and out over several sessions with different curations. After each session write first-person notes in Observations: did it feel like arriving, where was the edge, what did the threshold feel like, any motion discomfort.

Visitor: the designer alone, as a pilot. The visitor knows the design, so this tests whether the crossing reads as arrival, not whether it is noticed unprompted. If it holds, outside visitors are a follow-up.

## Observations

**2026-11-04, prototype built** (branch `exp/0006-spaces`, `apps/web/components/field/spaces.ts`). Starting values, to be tuned in the pilot:

- Fog: the field goes from `#000000` (dark) and `#111111` (mid) to `--space-room-fog: #11151c` and `--space-room-fog-mid: #1f2631`, both in `apps/web/app/tokens.css`. Cards in the space fade toward the fog with distance (density 1/2200).
- Threshold: 1400 ms, eased. The camera travels 900 units through it. In `gate` mode the frame stands 520 units in and is still visible behind you from the entrance.
- Floor: the table maps to 2400 by 1500 units, starting 450 ahead of the entrance. The table's bottom edge is nearest the visitor. The camera is held within the floor plus a 450 margin.
- Limits: an entity cannot be opened from inside the space. Walking in with Alt+W from the field (without the table open) uses a default table size, so the layout lands slightly differently than with the overlay's button.

Session notes go below, one dated entry per session.

**2026-11-04, session 1 (designer).** Verdict: "not that great, it is ugly". The space did not read as a place worth arriving in. Diagnosis: it was the same void with fewer cards, flat cards facing the viewer, a faint fog tint, and a fade that read as loading; nothing in it was structure. Round 2 waits on [STU-0003](../../studies/0003-place-not-void/README.md), opened to find out what makes a digital environment a place.

## Outcome

## Next

- Read Totten on thresholds and arrivals, and Lynch (*The Image of the City*, 1960) on districts and edges, before round 2.
- EXP-0007 and EXP-0009 were drafted for a field split into bands. With spaces now curated on the table, both need their questions revisited before they start.
