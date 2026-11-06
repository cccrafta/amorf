---
title: "DDR-0004: Show each entity as a form with its media projected onto it, faces filled automatically, proportion from the cover"
status: proposed
date: 2026-11-06
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0019, DDR-0002]
evidence: [STU-0006, EXP-0014]
materials: [entity-form, rest-cube, texture-array, entity-media]
spatial-context: the field, each entity seen from the walking camera; later the entity views
updated: 2026-11-06
last_verified: 2026-11-06
---

# DDR-0004: Show each entity as a form with its media projected onto it, faces filled automatically, proportion from the cover

## Context and Problem Statement

Step 2 of [one world, many cameras](../../design/one-world-many-cameras.md) puts entities in the 3D scene. The design page asked what an entity's 3D presence is (open question 1). On 2026-11-06 the owner answered: a **form**, a cube first and a sphere and other forms later, with the entity's media projected onto it. [STU-0006](../../../research/studies/0006-media-projected-on-forms/README.md) found how: every form is a deformed rest cube, and each of its six faces shows one media item from a texture array. That left three design questions, answered by the owner the same day: which media goes on which face, who decides it, and what proportion the form takes.

## Decision Drivers

- One system for every form: what is decided for the cube must still hold for the sphere and later forms.
- Authoring cost: entities are added with the entity-intake routine; a form must appear without extra data.
- The form moves by itself (owner: "the cube will have its own animation"), so no single face is the one the visitor always sees.
- The form reads as made of its media: the owner wants it covered entirely, with no bare faces (2026-11-06, after the first look in EXP-0014).

## Considered Options

- Face order authored per entity in `entity.json`.
- Face order derived from the media, with an authored override added only when needed.
- Face order by architectural convention (elevations on the four sides, plan on top), from media kind.

## Decision Outcome

Chosen option: "Face order derived from the media, with an authored override added only when needed", because the form turns by its own animation, so the order matters little (owner), and derived faces cost no authoring.

Rules:

- **Faces, derived.** The cover goes on the front face. The cover is the entity's existing `thumbnail` (default: the first video, else the first image), so no new field. The other image-bearing media follow in `media[]` order on the next faces in one fixed sequence: right, back, left, top, bottom. A video counts with its poster. Sound, documents and embeds have no picture and are skipped.
- **Counts.** Every face is covered. Fewer pictures than faces repeat in the same order until all six are filled, so one picture covers the whole form. More than six: the first six are on the form, the rest only in the entity views. An entity with no picture at all keeps a plain form.
- **Override later.** An authored face map in `entity.json` is added only when a real entity needs it, and it then wins over the derived order.
- **Proportion from the cover.** The form takes the cover's aspect ratio. It is stored as one per-instance scale of the rest cube, so every form receives it: the cube becomes a box. Whether a sphere and later forms stretch with it, or each form interprets the proportion its own way, is decided when that form lands.
- **Form per entity.** Every entity is a box for now. Sphere and other forms come as further shapes of the same rest cube.

### Consequences

- Good: a form appears for every entity with no new data, and the override keeps a way out.
- Good: the proportion is one number per form, so it carries into future forms without a new system.
- Bad: the form's own animation can hide content; STU-0006 found that motion that turns content away from the visitor costs attention. The animation is designed in its own experiment, and it should settle or face the visitor on approach.
- Bad: non-cover faces of a box do not match the cover's aspect; their media are letterboxed or cropped at publish time per STU-0006.
- Bad: repeating pictures departs from STU-0006 deduction 7 (blank faces stay blank, after the Eameses and Richter); a form with few media shows the same picture several times.
- Neutral: the architectural convention (elevations on sides, plan on top) is not used now; it can return as a derived rule by media kind.

## Structural / material logic

The form is a single body whose surfaces carry the record: its proportion comes from the cover rather than from a chosen shape, its face count limits what it can show, and it is wrapped entirely in its own media, repeated when there are fewer pictures than faces, so the form is never a bare box with a picture attached. The unfolded box is the flat entity board (STU-0006 deduction 5), so the form and the board are one structure seen folded and unfolded. The form's own animation is the one part not derived from structure; it is accepted because it lets every face be seen without the visitor walking round, and it is tested before it ships.

## Evidence

- [STU-0006](../../../research/studies/0006-media-projected-on-forms/README.md): technique (rest cube, texture array) and precedents (cube net, legibility, blank faces).
- Owner answers, 2026-11-06, recorded on [the design page](../../design/one-world-many-cameras.md).

## More Information

- Renderer rules: [ADR-0019](../adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md).
- Revised 2026-11-06 while proposed: the counts rule first left surplus faces blank; the owner chose full cover after seeing EXP-0014.
- Reopens if the form's animation is dropped (then the front face carries more weight and the order matters again), or when the sphere arrives (proportion rule for non-box forms).
