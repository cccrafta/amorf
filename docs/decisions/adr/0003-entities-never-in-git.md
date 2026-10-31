---
title: "ADR-0003: Keep entities out of git; R2 is the source of truth"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0002, ADR-0004]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0003: Keep entities out of git; R2 is the source of truth

## Context and Problem Statement

An entity is a record (metadata plus media) about a building, drawing, film or other source. The repository is public. Entity content is research material whose rights and editorial state are not ready, or not permitted, to be published as source files.

## Decision Drivers

- Nothing that is entity content may enter a public repository, even by accident.
- One place to edit an entity: its folder.
- The app must still be able to read entities when it builds.

## Considered Options

- Commit `entity.json` files to the repository and only the media to R2.
- Keep entities in a private second repository.
- Keep entities in a gitignored working copy and publish them to R2, which becomes the source of truth.

## Decision Outcome

Chosen option: "gitignored working copy, published to R2 with `entities:sync`", because it is the only option where a mistaken `git add` cannot leak content, and it needs no second repository.

### Consequences

- Good: the public repository holds code, docs and decisions only.
- Bad: no git history for entities, and a lost laptop with an unsynced working copy loses edits. Back up `apps/web/content/` and keep `originals/` safe.
- Neutral: `.gitignore` carries a guard for `apps/web/content/` and must keep it. The `.gitignore` guard is part of the decision, not housekeeping.

## More Information

Folder layout, fields, scripts: [../../conventions/entities.md](../../conventions/entities.md). Commit rules: [../../conventions/git.md](../../conventions/git.md).
