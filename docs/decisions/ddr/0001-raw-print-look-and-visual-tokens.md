---
title: "DDR-0001: Use a raw print look, and keep every colour and font stack in tokens.css"
status: accepted
date: 2026-10-29
deciders: [cccrafta]
supersedes:
superseded-by:
related: [DDR-0002]
evidence: []
materials: [paper-stock, black-void, times-type]
spatial-context: the whole site (field and entity view)
updated: 2026-10-31
last_verified: 2026-10-31
---

# DDR-0001: Use a raw print look, and keep every colour and font stack in tokens.css

## Context and Problem Statement

The site shows research material from architects: plans, photographs, films, fragments. Any styling added on top competes with that material. The project also needs one place where the look is defined, so it can be changed or audited without searching the code.

## Decision Drivers

- The material is the subject; the interface must not decorate it.
- A look that reads as a printed object: flat, plain, legible.
- A single source for colour and type values.

## Considered Options

- A conventional product look: rounded panels, glows, accent colour, webfonts.
- A raw print look: black void, flat grey panels, plain Times, no webfonts, no radius, no glow, no highlight colour.

## Decision Outcome

Chosen option: "raw print look", with `apps/web/app/tokens.css` as the only file holding raw colour values and font stacks. Everything else uses `var(--…)`. There is no highlight colour (`--field-accent` equals `--field-ink`), and no glow, outline on thumbnails, blur or rounded corner.

### Consequences

- Good: the look can be changed in one file; nothing in the interface competes with the entities.
- Bad: a few places must stay literal because the target cannot read CSS variables (SVG stroke attributes, canvas `strokeStyle`); each carries a comment pointing back to the token.
- Neutral: a new colour is a token first, then a use.

## Structural / material logic

The interface is treated as the plain structure around the material: flat panels, hairlines and a single serif are the load-bearing parts, and nothing is added for effect. The look is the print-shop honesty of the thing: what you see is the stock, the ink and the grid.

## Evidence

None recorded.

## More Information

Rules, token roles and the list of literal exceptions: [../../conventions/styling.md](../../conventions/styling.md).
