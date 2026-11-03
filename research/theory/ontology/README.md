---
title: Ontology (draft)
status: draft
updated: 2026-11-01
last_verified: 2026-11-01
---

# Ontology (draft)

What amorf is made of: the parts of the site and how they relate. This is a working position, not a specification. Each part is expected to get its own deeper study later (as theory pages or experiments). The source is a recorded conversation: [transcript.md](transcript.md). Where this page and the transcript disagree, the transcript records what was said and this page records what is currently held.

## Aim: a temporal experience of discovery

Working description: *amorf: a digital environment to engender a "temporal experience of discovery", probing architecture, design and the art of craft.*

A temporal experience of discovery treats finding something as a process that unfolds over time, not as an instant retrieval. Duration, rhythm and sequence shape how form and meaning are understood. The ordinary web is transactional: query, result, full view. amorf aims for an encounter that develops as you move.

The architectural reference is the *promenade architecturale*: understanding comes from sequential movement through thresholds, sightlines and transitions. What you discover depends on where you came from and how long you stayed. Pacing is deliberate, as in craft, where joinery, texture and structural logic are only understood by lingering.

## The parts

The parts are the project's fixed vocabulary for filing research. Every study and experiment names the parts it informs in its `parts` frontmatter field (one or more). Each part has a hub page: definition, the deductions currently held, the research filed under it, and open questions.

| Part | What it is | Architectural reading |
| --- | --- | --- |
| [entity](entity.md) | A node of knowledge with its own metadata and media of any type | Artifact |
| [field](field.md) | Depth navigation: scroll moves forward and back, sideways rotates | Landscape, promenade |
| [coordinates](coordinates.md) | Where each entity sits in the field | Placement, proximity |
| [space](space.md) | A field with specific entities at specific coordinates | Territory |
| [journey](journey.md) | The recorded sequence of a visitor's moves between entities; itself a space | Spatial sequence, footprint |
| [archive](archive.md) | Conventional, structured browsing of the same entities | Index, catalogue |

To add a part: copy a hub page, add a row here, and add the slug to the `parts` list in [../../../docs/conventions/research-log.md](../../../docs/conventions/research-log.md). Rename or merge a part only together with every `parts` field that uses it.

## Candidate descriptions

From the conversation; none is adopted yet.

- Tagline: *amorf is a spatial archive for architecture and design, where the act of discovery is mapped as a journey through a navigable, multi-sensory landscape.*
- Statement: *amorf is an experiential archive that challenges the flat topography of the web. It houses architectural, design and craft knowledge not as static pages, but as multi-sensory artifacts situated within a navigable digital field. Moving beyond the traditional grid, the platform invites visitors on a promenade architecturale through depth and space. Artifacts reveal themselves through form, sound and motion as you move through the field. Every sequence of discovery is recorded, turning your trajectory into a spatial footprint that can be saved, shared or revisited. For those who want the index over the landscape, amorf also works as a traditional archive.*

## Open questions

Questions for each part are on its hub page. One question spans the whole ontology:

- If structure is the ornament ([../manifesto.md](../manifesto.md)), is the journey the visible structure of discovery, and the field its joinery?
