---
title: Portfolio
updated: 2026-11-01
last_verified: 2026-11-01
---

# Portfolio

The portfolio is the public face of the research. A case study assembles studies and experiments, selected by their `tags` or their ontology `parts`, together with the decision records those experiments back, and tells the work as a sequence: question, attempts, outcome, decision.

Nothing here is the source. The experiment folders and the records stay authoritative; a case study links to them and quotes them. A study or experiment appears in a case study only when its frontmatter has `publish: true` and `case_study` names the study's slug.

The portfolio opens with [part 0](part-0-ontology.md), which names the ontology; later parts follow one ontology part each.

The project skill `.claude/skills/portfolio-compile/` drafts a case study from selected studies and experiments and their records into `research/portfolio/<slug>.md`. Its output is a draft to edit by hand. It keeps the same rule: link to the source, do not copy it. Media is referenced by R2 key URL, never stored here.
