---
title: Research
updated: 2026-10-31
last_verified: 2026-10-31
---

# Research

amorf is a design-research project with architects. The research folder holds the thinking behind the app: what the project believes, what it tried, and what it publishes. The app in `apps/web` is one output of this work, not the whole of it.

| Folder | Holds |
| --- | --- |
| [theory/](theory/README.md) | The manifesto and hypotheses: the claims the project makes and the questions they raise. |
| [experiments/](experiments/) | One folder per experiment: a question, a method, observations and an outcome. Template: `experiments/0000-template/`. |
| [portfolio/](portfolio/README.md) | Case studies assembled from experiments and decision records. |

## Flow

1. **Theory raises a question.** A hypothesis in `theory/` is not yet knowledge; it asks to be tested.
2. **An experiment answers it.** An experiment is done when its outcome is filled in. Abandoned is a valid end: record why it stopped, because a failed experiment and its trade-offs are part of the work (process over final artifact).
3. **A decision record commits.** When an outcome changes how the project is built or designed, a [DDR](../docs/decisions/ddr/0000-template.md) (design, spatial, material) or [ADR](../docs/decisions/adr/0000-template.md) (technology) records the decision and cites the experiment as evidence.

Rules for experiments: [../docs/conventions/research-log.md](../docs/conventions/research-log.md). When to write which record: [../docs/conventions/decision-records.md](../docs/conventions/decision-records.md).

## What belongs here and what does not

Experiment media (photographs, film, drawings, models) goes to R2, like entity media, and is listed by key in the experiment's frontmatter. Never put media files in git. Research that concerns one entity belongs to that entity's `entity.json`, not here.
