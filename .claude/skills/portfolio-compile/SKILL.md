---
name: portfolio-compile
description: Compile a portfolio case-study draft for amorf from tagged experiments in research/experiments/ and the ADRs/DDRs they back, written to research/portfolio/<slug>.md. Use when the user asks to compile, draft, assemble or refresh a case study or portfolio page, or names a case-study slug or a set of tags.
---

# Compile a case study

A case study tells one line of work as a sequence: question, attempts, outcome, decision. It is a draft for a human to edit. The experiment folders and decision records stay the source; the case study links to them and quotes them, and never replaces them. Rules: `research/portfolio/README.md`, `docs/conventions/research-log.md`, `docs/conventions/decision-records.md`. If this skill and those pages disagree, the pages win; fix this skill.

## Inputs

Ask for anything missing, in one question:

- `slug`: kebab-case name of the case study. Output path is `research/portfolio/<slug>.md`.
- `tags`: one or more experiment tags. Match is any-of unless the user says all-of.
- Optional `title` and one-sentence `framing` (what the study argues, tied to the thesis in `research/theory/manifesto.md`).

## Select

1. Read the frontmatter of every `research/experiments/NNNN-*/README.md`, skipping `0000-template`.
2. Candidates: experiments whose `tags` match.
3. **Included**: candidates with `publish: true` AND `case_study: <slug>`. Only these appear in the body.
4. **Held back**: candidates that fail step 3. Do not quote, summarise or link them in the body. List them only in the report to the user, with the reason (`publish: false`, or `case_study` is null or another slug), so the user can decide to flip the flags. Never edit an experiment's frontmatter yourself.
5. `status: abandoned` experiments that are included stay in. Failure is part of the process the project wants shown; tell it as an attempt that stopped and why.
6. Records: for each included experiment, read every id in `decisions`. Also read records whose `evidence` (DDR) or `related` (ADR) lists an included experiment. Records are public by default; include them. Follow `superseded-by` to the current record and mention the chain in one line.

If nothing is included, write no file. Report the held-back list and stop.

## Media

Experiment `media` holds R2 keys (`experiments/EXP-NNNN/...` in bucket `amorf-media`), never files. The repo is public, so:

- Never download, copy or embed media files in the repo. Never add files under `research/portfolio/` other than the `.md`.
- Reference media by key only, with an absolute URL built from the public base `https://media.amorf.co/<key>` (`NEXT_PUBLIC_MEDIA_BASE` in `apps/web/.env.production`; read it there in case it changed).
- Only keys from included experiments. Do not check that the key exists in R2 unless the user asks; mark unverified keys in the report.
- Alt text: write one from the surrounding observation, never from a guess about the image.

## Output

`research/portfolio/<slug>.md`. If the file exists, show what would change and ask before overwriting; hand edits live there.

```markdown
---
title: <title>
slug: <slug>
status: draft
tags: [<tags used>]
experiments: [EXP-NNNN, ...]   # included only, in date order
records: [DDR-NNNN, ADR-NNNN, ...]
compiled: YYYY-MM-DD
updated: YYYY-MM-DD
last_verified: YYYY-MM-DD
---

# <title>

<framing: 2–4 sentences, the question and why it matters for "structure is the ornament".>

## Question
<from the earliest experiment's `question`; link it.>

## Attempts
### EXP-NNNN: <title> (<date>, <status>)
<hypothesis and method in 2–3 sentences; key observations quoted, not paraphrased into new claims.>
![<alt>](https://media.amorf.co/<key>)
[Source](../experiments/NNNN-slug/README.md)

## Outcome
<each `outcome`, in order; what was learnt, including what failed.>

## Decisions
- [DDR-NNNN: <title>](../../docs/decisions/ddr/NNNN-slug.md): <one line: what was decided, quoting its decision sentence.>

## Open
<the experiments' Next sections, merged; unresolved questions stay unresolved.>
```

Writing rules: quote or paraphrase only what the sources say; invent no results, dates, people or materials. Keep the sources' vocabulary ("entity", never "entry"). Relative links must resolve from `research/portfolio/`.

## Finish

Report to the user, briefly: file written (or not), included experiments, records pulled in, held-back experiments with reasons, media keys referenced. Do not commit.
