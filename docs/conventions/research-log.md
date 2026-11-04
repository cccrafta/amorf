---
title: Research log (experiments and studies)
updated: 2026-11-01
last_verified: 2026-11-01
---

# Research log

Two kinds of research item, both one folder each, named `NNNN-kebab-title/` with a `README.md` inside, numbered by folder:

- **Experiment** (`research/experiments/`, id `EXP-NNNN`): tests a hypothesis by making or trying something. Template: `research/experiments/0000-template/`.
- **Study** (`research/studies/`, id `STU-NNNN`): desk research into a concept, precedent or body of work (for example the *promenade architecturale*). It has sources and deductions, not a hypothesis. Template: `research/studies/0000-template/`.

Every item is filed under one or more **parts** of the ontology. Rules below apply to both kinds unless they say otherwise. How research relates to theory and decisions: [../../research/README.md](../../research/README.md).

## Rules

- **One question per item.** If you find a second, open a second experiment.
- **Record failure.** A failed or abandoned experiment keeps its folder, with the outcome saying why it stopped. Do not delete or rewrite an experiment to look better afterwards; add to the Observations or open a follow-up.
- **Done means the outcome is filled in.** `status` moves `planned`, `running`, then `done` or `abandoned`.
- **Link both ways.** An experiment that backs a decision lists it in `decisions`, and that record lists the experiment in `evidence` (DDRs) or `related` (ADRs).

## Parts

The `parts` field files an item under the ontology: `entity`, `field`, `coordinates`, `space`, `journey`, `archive`. Use only these slugs; the list and each part's hub page are in [../../research/theory/ontology/README.md](../../research/theory/ontology/README.md). An item takes every part it informs, usually one or two.

After adding an item or changing its frontmatter, run `pnpm research:index`. It regenerates `research/INDEX.md` (all items grouped by part), `research/index.json` (the same as data) and the Research table of each part hub, from the `parts` fields. Never edit those by hand. `pnpm research:check` fails on stale output, an unknown part or an id that does not match its folder. When an item concludes something worth holding, add a dated entry to the Position section of each hub it concerns, citing the item. Never rewrite a Position entry; add one that revises it. The hubs are where deductions are compiled; the items stay the source.

`parts` is the fixed vocabulary for what the research is about. `tags` stay free annotations for the portfolio.

## Frontmatter (experiments)

| Field | Meaning |
| --- | --- |
| `id` | `EXP-NNNN`, equal to the folder number. |
| `title` | Names the question. |
| `date` | Date the experiment started. |
| `status` | `planned`, `running`, `done` or `abandoned`. |
| `question` | The one question it answers. |
| `hypothesis` | What you expect, stated so it can be wrong. |
| `method` | How you find out, in a sentence or two. |
| `materials` | Physical or digital materials involved. |
| `tools` | Software, instruments, techniques. |
| `outcome` | The answer, or why it stopped. Empty until `done` or `abandoned`. |
| `decisions` | Records it backs, such as `[DDR-0002]`. |
| `tags` | Portfolio annotations (below). |
| `parts` | Ontology parts it informs (above). |
| `media` | R2 keys for the experiment's media (below). |
| `publish` | `true` when it may appear in the portfolio. |
| `case_study` | Slug of the case study that uses it, or `null`. |

The body has five sections in this order: Hypothesis, Method, Observations, Outcome, Next.

## Frontmatter (studies)

Shared with experiments: `id` (`STU-NNNN`), `title`, `date`, `status`, `parts`, `question`, `tags`, `media`, `publish`, `case_study`. Specific to studies:

| Field | Meaning |
| --- | --- |
| `sources` | Works read, buildings visited, films watched: enough to find them again. |
| `deductions` | One line each: what the study concludes for amorf. Done means at least one, or a reason it stopped. |
| `raises` | Follow-ups it opened: `EXP-NNNN`, `STU-NNNN`. |

The body has five sections in this order: Question, Sources, Notes, Deductions, Next. Keep what the sources claim (Notes) apart from what you conclude (Deductions).

## Media

Experiment and study media (photographs, film, drawings, screenshots, models) is stored in R2, like entity media, under `experiments/EXP-NNNN/` or `studies/STU-NNNN/` in the `amorf-media` bucket. The frontmatter `media` lists the keys. Never put media files in git: the repository is public ([ADR-0002](../decisions/adr/0002-large-media-in-r2.md)). Files are immutable once published, so replace by adding a new name.

## Tags

Tags are annotations for the portfolio: they say which case studies an experiment can feed. Lowercase kebab-case, reused rather than invented where an existing tag fits (`entity-view`, `navigation`, `layout`). A case study selects experiments by tag and adds the decision records they back; see [../../research/portfolio/README.md](../../research/portfolio/README.md).
