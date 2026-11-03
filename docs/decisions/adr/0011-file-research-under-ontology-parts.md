---
title: "ADR-0011: File research under ontology parts, with studies and a generated index"
status: accepted
date: 2026-11-01
deciders: [cccrafta]
supersedes:
superseded-by:
related: [ADR-0009, ADR-0010]
updated: 2026-11-01
last_verified: 2026-11-01
---

# ADR-0011: File research under ontology parts, with studies and a generated index

## Context and Problem Statement

Research runs in parallel on different parts of the site: one session studies the *promenade architecturale*, another experiments on the entity view. Experiments had only free `tags`, and there was no place for desk research that tests nothing. How should research be filed so that, over time, it builds into an organised dataset and a compilation of deductions for each part of the site?

## Decision Drivers

- Each line of research should land in a predictable place, whichever session does it.
- Deductions should collect per part, dated, without rewriting history (process over final artifact).
- Desk research (sources, precedents) is different from an experiment (hypothesis, test).
- The portfolio should be able to tell one part at a time.
- Indexes kept by hand go out of date.

## Considered Options

- Tags only, with conventions on which tags to use.
- Folders per part (`research/field/...`), items moved between them.
- A fixed `parts` field on every item, one hub page per part, and a generated index.

## Decision Outcome

Chosen option: "a fixed `parts` field, hub pages, and a generated index", because one item can serve several parts without being copied or moved, and the index cannot drift.

- **Ontology parts** (`entity`, `field`, `coordinates`, `space`, `journey`, `archive`) are the fixed vocabulary, defined in [../../../research/theory/ontology/README.md](../../../research/theory/ontology/README.md). Each part has a hub page with its definition, a dated Position (deductions held), its research, and open questions.
- **Studies** (`research/studies/`, `STU-NNNN`) hold desk research beside **experiments** (`EXP-NNNN`). Both carry `parts`.
- **`pnpm research:index`** ([../../../scripts/research-index.mjs](../../../scripts/research-index.mjs), placed by [ADR-0010](0010-scripts-live-with-what-they-operate-on.md)) generates `research/INDEX.md`, `research/index.json` and each hub's research table. `pnpm research:check` fails on stale output, unknown parts or mismatched ids.
- **The portfolio** opens with part 0 (the ontology); later parts follow one ontology part each.

The rules are in [../../conventions/research-log.md](../../conventions/research-log.md); the layout is in [../../../research/README.md](../../../research/README.md).

### Consequences

- Good: research from any session is found under its part; `index.json` is the dataset.
- Good: deductions accumulate per part with dates and citations.
- Bad: Position entries on hubs are still written by hand.
- Bad: adding, renaming or merging a part means editing every item that uses it; the check catches what is missed.
