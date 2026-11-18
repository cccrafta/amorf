---
title: "DDR-0006: Set the studio in Director for titles and Letter Gothic for working text, on the field's palette"
status: proposed
date: 2026-11-18
deciders: [owner]
supersedes:
superseded-by:
related: [DDR-0001, ADR-0021]
evidence: []
materials: [Director (Degheest collection, SIL OFL 1.1), Letter Gothic Std (Adobe, commercial)]
spatial-context: the studio app (apps/studio), seen only by the three authors
updated: 2026-11-18
last_verified: 2026-11-18
---

# DDR-0006: Set the studio in Director for titles and Letter Gothic for working text, on the field's palette

## Context and Problem Statement

The studio is the authors' workbench, not the visitor's field. The site uses plain Times on a raw print palette ([DDR-0001](0001-raw-print-look-and-visual-tokens.md)). The owner asked for two faces in the studio: Director, a revival from the Degheest collection, and Letter Gothic Std, a typewriter monospace. Which face does which job, and how is each one served from a public repository?

## Decision Drivers

- The workbench reads as a tool: fixed-width working text lines up ids, keys and JSON.
- Licences: the repository is public, so only freely licensed font files can be committed.
- Same palette as the field, so authors judge colour against what visitors see.

## Considered Options

- Times everywhere, as on the site.
- Director for titles, Letter Gothic for all working text, both bundled.
- Director for titles (bundled), Letter Gothic for working text (only where installed), monospace fallback.

## Decision Outcome

Chosen option: "Director bundled, Letter Gothic only where installed", because Director is under the SIL Open Font License 1.1 and may be redistributed with its licence, while Letter Gothic Std is a commercial Adobe font whose files may not be published in a public repository or served as a webfont without a web licence.

- `--font-display`: Director (Light, Regular, Bold woff2 in `apps/studio/src/fonts/director/`, with `OFL.txt` and `COPYRIGHT.md`).
- `--font-body`: Letter Gothic Std through `local()` only, then `"Courier New"`, then `monospace`.
- Colours: the field palette values from `apps/web/app/tokens.css`, repeated in `apps/studio/src/tokens.css` until a shared tokens package exists.

### Consequences

- Good: no licence risk in git or on the Worker; titles look the same on every machine.
- Bad: working text differs per machine: authors without Letter Gothic installed see Courier New.
- Neutral: if a web licence for Letter Gothic is bought (or Adobe Fonts is used), only `tokens.css` changes.

## Structural / material logic

The working text is monospace because the material the authors handle is structured data: ids, R2 keys, coordinates and JSON, which align in columns only in a fixed-width face. Director is reserved for the few titles, so the workbench's structure (what is a heading, what is data) is carried by the faces themselves, not by added decoration.

## Evidence

None yet; the owner's request on 2026-11-18. Licence of Director checked in its `License SIL OFL.txt` and `COPYRIGHT.md`. Letter Gothic Std came as bare `.otf` files with no licence.

## More Information

Rules: [styling.md](../../conventions/styling.md) (section "Studio"). Reopen if the Letter Gothic licence changes or if the studio and site start sharing tokens.
