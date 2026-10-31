---
title: Portfolio
updated: 2026-10-31
last_verified: 2026-10-31
---

# Portfolio

The portfolio is the public face of the research. A case study assembles experiments, selected by their `tags`, together with the decision records those experiments back, and tells the work as a sequence: question, attempts, outcome, decision.

Nothing here is the source. The experiment folders and the records stay authoritative; a case study links to them and quotes them. An experiment appears in a case study only when its frontmatter has `publish: true` and `case_study` names the study's slug.

The project skill `.claude/skills/portfolio-compile/` drafts a case study from tagged experiments and their records into `research/portfolio/<slug>.md`. Its output is a draft to edit by hand. It keeps the same rule: link to the source, do not copy it. Media is referenced by R2 key URL, never stored here.
