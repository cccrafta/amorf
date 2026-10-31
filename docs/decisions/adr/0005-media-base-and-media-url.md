---
title: "ADR-0005: Read NEXT_PUBLIC_MEDIA_BASE literally, build every media URL with mediaUrl(), request cross-origin media in CORS mode"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes: 
superseded-by:
related: [ADR-0002, ADR-0004]
updated: 2026-10-31
last_verified: 2026-10-31
---

# ADR-0005: Read NEXT_PUBLIC_MEDIA_BASE literally, build every media URL with mediaUrl(), request cross-origin media in CORS mode

## Context and Problem Statement

Media is served from a different origin than the site (ADR-0002). Three constraints meet there. Next inlines `NEXT_PUBLIC_*` values only when they are written as a literal `process.env.NAME` access. Data must not hard-code a host. And spatial audio goes through `createMediaElementSource`, which outputs silence for a cross-origin element that was not requested with CORS.

## Decision Drivers

- One switch between local files (development) and R2 (production).
- A media host change touches one place.
- Audio must not fail silently.

## Considered Options

- Hard-code the media host in data and components.
- Read the variable dynamically (`process.env[name]`) in a helper.
- One literal read of `process.env.NEXT_PUBLIC_MEDIA_BASE`, every URL built by `mediaUrl()`, and `crossOrigin = "anonymous"` on media elements whenever the base is set.

## Decision Outcome

Chosen option: the third, because it is the only one that is both inlined by Next and keeps the host out of data. Data stores site-relative paths (`/media/…`, `/entities/<id>/…`).

### Consequences

- Good: changing the host means changing an env file and rebuilding.
- Bad: the value is frozen at build; a build without it points media at the Worker, where the files do not exist.
- Neutral: any new element that feeds Web Audio must keep the CORS pairing; the bucket CORS rule must list every serving origin.

## More Information

Rules and code locations: [../../conventions/services-and-data.md](../../conventions/services-and-data.md). CORS rule and cache pitfall: [../../deployment.md](../../deployment.md).
