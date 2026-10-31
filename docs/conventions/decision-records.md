---
title: Decision records
updated: 2026-10-31
last_verified: 2026-10-31
---

# Decision records

The project keeps its reasoning in records, in MADR 4 format ([ADR-0009](../decisions/adr/0009-decision-records-madr.md)). The index and the add-one steps are in [../decisions/README.md](../decisions/README.md).

## Which record

| You are deciding | Write | Folder |
| --- | --- | --- |
| A technology, tool, hosting, data flow, build or repository structure | ADR | `docs/decisions/adr/` |
| A form, layout, interaction, visual rule, or choice of material or spatial logic | DDR | `docs/decisions/ddr/` |
| A question you cannot yet answer, or a choice you want evidence for | Experiment | `research/experiments/` |

A DDR cites the experiments that back it in `evidence`, and its "Structural / material logic" section says how the decision follows from structure and material. If a decision is mixed, such as a technology chosen for a design reason, write the DDR and link an ADR if the technology part needs its own record.

Write a record when the choice is hard to reverse, has real alternatives, or someone would later ask "why this way". A convention page states how; the record states why and what else was considered. Do not duplicate rules in the record: link to the convention page that holds them.

## Lifecycle

`proposed` then `accepted` or `rejected`. An accepted record may later become `deprecated` (no longer applies, nothing replaces it) or `superseded` (a newer record replaces it).

**Never edit an accepted record's decision.** The only edits allowed are typo fixes, link repairs, and the `status`, `superseded-by` and `last_verified` fields. A change of mind is a new record.

## Superseding

1. Write the new record. Set `supersedes: <old id>` in its frontmatter and say in its Context why the old one no longer holds.
2. In the old record, set `status: superseded` and `superseded-by: <new id>`. Do not touch its text.
3. Update both rows in the index.

Links run both ways, so someone reading the old record finds the new one.

## Numbering and files

ADRs and DDRs have separate counters, each starting at 0001 (0000 is the template). The next number is the highest in that folder plus one; numbers are never reused, even for rejected records. File names are `NNNN-kebab-title.md`; the title in the frontmatter reads `ADR-NNNN: ...` or `DDR-NNNN: ...`. Experiments use their own folder numbers (`EXP-NNNN`).

Every record has frontmatter `title`, `status`, `date` (the date of the decision), `deciders`, `supersedes`, `superseded-by`, `related`, and `updated` and `last_verified` as for any docs page. DDRs add `evidence`, `materials` and `spatial-context`.
