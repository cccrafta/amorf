---
title: "ADR-0002: Keep large media in R2 behind media.amorf.co, never in git"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0001, ADR-0003, ADR-0005]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0002: Keep large media in R2 behind media.amorf.co, never in git

## Context and Problem Statement

The research material includes film, photographs and drawings, some larger than 190 MB. Git handles such files badly, the GitHub repository is public, and Workers static assets cap each file at 25 MiB.

## Decision Drivers

- The repository stays small and clonable.
- Files that may carry third-party rights are not republished through git history.
- Media must be served with long caching and CORS (Web Audio needs it, see ADR-0005).

## Considered Options

- Commit media to git, or use Git LFS.
- Put media in the Worker's static assets.
- Store media in a Cloudflare R2 bucket and serve it from a custom domain.

## Decision Outcome

Chosen option: "R2 bucket `amorf-media` served at `https://media.amorf.co`", because it has no per-file cap that matters, no egress fee, and keeps history clean. The same applies to experiment media (see ADR-0009 and the research log convention).

### Consequences

- Good: git stays small; media can be replaced or removed without rewriting history.
- Bad: a fresh clone has no media locally and must point `NEXT_PUBLIC_MEDIA_BASE` at R2; CORS and edge-cache behaviour become something to maintain.
- Neutral: files are immutable once published, because the CDN caches them for a year.

## More Information

Media URL rules: [../../conventions/services-and-data.md](../../conventions/services-and-data.md). Bucket, CORS and cache pitfalls: [../../deployment.md](../../deployment.md).
