---
title: Research log (experiments)
updated: 2026-10-31
last_verified: 2026-10-31
---

# Research log

Experiments live in `research/experiments/`, one folder each, named `NNNN-kebab-title/` with a `README.md` inside. Start from `research/experiments/0000-template/`. The id is `EXP-NNNN`, numbered by folder. How research relates to theory and decisions: [../../research/README.md](../../research/README.md).

## Rules

- **One question per experiment.** If you find a second, open a second experiment.
- **Record failure.** A failed or abandoned experiment keeps its folder, with the outcome saying why it stopped. Do not delete or rewrite an experiment to look better afterwards; add to the Observations or open a follow-up.
- **Done means the outcome is filled in.** `status` moves `planned`, `running`, then `done` or `abandoned`.
- **Link both ways.** An experiment that backs a decision lists it in `decisions`, and that record lists the experiment in `evidence` (DDRs) or `related` (ADRs).

## Frontmatter

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
| `media` | R2 keys for the experiment's media (below). |
| `publish` | `true` when it may appear in the portfolio. |
| `case_study` | Slug of the case study that uses it, or `null`. |

The body has five sections in this order: Hypothesis, Method, Observations, Outcome, Next.

## Media

Experiment media (photographs, film, drawings, screenshots, models) is stored in R2, like entity media, under `experiments/EXP-NNNN/` in the `amorf-media` bucket. The frontmatter `media` lists the keys. Never put media files in git: the repository is public ([ADR-0002](../decisions/adr/0002-large-media-in-r2.md)). Files are immutable once published, so replace by adding a new name.

## Tags

Tags are annotations for the portfolio: they say which case studies an experiment can feed. Lowercase kebab-case, reused rather than invented where an existing tag fits (`entity-view`, `navigation`, `layout`). A case study selects experiments by tag and adds the decision records they back; see [../../research/portfolio/README.md](../../research/portfolio/README.md).
