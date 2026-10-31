---
title: "ADR-0009: Record decisions with MADR, separate ADR and DDR counters, and never edit accepted records"
status: accepted
date: 2026-10-31
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0008]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0009: Record decisions with MADR, separate ADR and DDR counters, and never edit accepted records

## Context and Problem Statement

The project's value is partly its reasoning: why a structure, material or technology was chosen, and what was tried first. Reasoning kept in chat or in commit messages is lost. Technology decisions and design decisions also have different evidence and readers.

## Decision Drivers

- Reasoning must survive the people and sessions that produced it.
- Design decisions must connect to the research that backs them.
- Records should be cheap to write, so they actually get written.

## Considered Options

- Free-form notes in the docs vault.
- One record type and one counter for everything.
- MADR 4 records, with ADRs for technology and DDRs for design, each with its own counter.

## Decision Outcome

Chosen option: "MADR 4, ADR and DDR with separate counters". A DDR adds `evidence`, `materials` and `spatial-context` fields and a "Structural / material logic" section, so each design decision states how it follows from structure and material. Accepted records are never edited; a change of mind is a new record that supersedes the old one, with links both ways.

### Consequences

- Good: a readable history, including decisions that were later reversed.
- Bad: small corrections need a new record or a note in the new one; typo fixes are the only allowed edits.
- Neutral: operational rules live in the convention page, not in this record.

## More Information

[../../conventions/decision-records.md](../../conventions/decision-records.md) and [../README.md](../README.md).
