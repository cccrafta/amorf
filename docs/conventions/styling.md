---
title: Styling (color and type tokens)
updated: 2026-11-18
last_verified: 2026-11-18
---

# Styling

The rules live in `apps/web/app/tokens.css` and `apps/web/app/globals.css`; this page summarises them and loses any disagreement with those files. Why the look is what it is: [DDR-0001](../decisions/ddr/0001-raw-print-look-and-visual-tokens.md). Paths below are inside `apps/web/`.

## Tokens

- `app/tokens.css` is the only file that holds raw color values and font stacks. Everything else uses `var(--…)`.
- Translucent variants are `color-mix(in srgb, var(--token) N%, transparent)`, never a raw `rgba()`.
- Exceptions that must stay literal, each with a comment pointing back to the token: `TRACK_HUES` in `components/field/tracks.ts` (SVG stroke attributes), and the ink hex in `components/field/notes.ts` (canvas `strokeStyle`).
- `--field-mute-rgb` is an `r, g, b` triplet of `--field-mist` for older inline `rgba(var(--field-mute-rgb), a)` styles. Keep the two in step.

## Look

Raw print look: black void, flat grey panels, plain Times, no webfonts.

| Role | Token |
| --- | --- |
| Void behind the field | `--field-bg-dark` (stage lifts to `--field-bg-mid` at the vanishing point for depth) |
| Full-screen panels | `--field-bg` |
| Thumbnail mat | `--field-frame`, via the `.field-frame` class or an 8 px border |
| Titles | `--field-title` (blue) via `.field-title` |
| Labels | `--field-label` (blue) via `.field-label`: uppercase, near-zero tracking |
| Running text | `--field-body` (red) via `.field-body`: upright, not italic |
| Hairlines | `--field-line` |
| On/off controls | `.field-check` square; `data-on="1"` draws the red cross |

There is no highlight color: `--field-accent` equals `--field-ink`. No glows, outlines on thumbnails, blur or rounded corners.

## Studio

`apps/studio` keeps its own `src/tokens.css`, the only file in the studio with raw colours and font stacks ([DDR-0006](../decisions/ddr/0006-studio-type-director-and-letter-gothic.md)).

- Colours repeat the field palette values (`--studio-bg`, `--studio-ink`, `--studio-blue`, `--studio-red`, `--studio-line`). Change both files together until a shared tokens package exists.
- `--font-display` is Director, bundled as woff2 in `src/fonts/director/` with its OFL licence. Use it for titles only.
- `--font-body` is Letter Gothic Std through `local()` only, falling back to Courier New, then `monospace`. Letter Gothic is a commercial Adobe font: never commit its files or serve it as a webfont.
