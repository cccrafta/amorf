---
title: Entity view redesign (fixed frame, authored placement, neighbour navigation)
updated: 2026-10-31
last_verified: 2026-10-31
status: built
---

# Entity view redesign

Built 2026-10-29; see **Deviations** at the end for where the code differs from this page. The code (`apps/web/components/field/interior/`) is the source of truth. Paths in this page are inside `apps/web/` unless they start with `docs/`. The decision is recorded in [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md). Rules stay in [entities.md](../conventions/entities.md) and [folder-structure.md](../conventions/folder-structure.md); this page loses any disagreement with them.

## Problem

1. `layout.ts` `compose()` places pieces by seeded best-of-N sampling. Nothing is authored: the same entity looks different per viewport, a CMS user cannot say where a piece goes, and `at: [x, y]` is honoured only as a fraction of a surface whose size is derived from the viewport.
2. Tools are pieces on that surface (`traces`, `actions`, `passing`, `assoc`, `elsewhere`, `note`, `place` facts). They land wherever the sampler puts them, so "leave a trace" is somewhere different for every entity.
3. The entry view is whatever the sampler centres: title and primary piece are placed near the middle, but metadata (`year`, `place`) are separate pieces that may be off screen.
4. Pulling past any edge, or pinching, calls `collapse()` and leaves to the field. A reader who pulls past an edge expects "more", not "out".

## Research findings

The pattern research (authorable layouts, annotation and connection interfaces, collection and edge navigation) and what it meant for this design is recorded in [EXP-0001](../../research/experiments/0001-entity-view-navigation/README.md). The decision it backs is [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md).

## Design summary

- Two layers. The **board** (authored, pans) holds content: title, metadata strip, description paragraphs, media. The **frame** (fixed, never pans) holds everything else.
- Board is placed on a 12-column grid with square modules. Each piece has `col`, `row`, `w`. Unset: a deterministic auto-layout, no randomness.
- Frame: top header (ref, close), edge labels naming the four neighbours, bottom bar (facts, traces, related, leave a trace, set aside, elsewhere). Traces and related open in one **drawer** from the right.
- Pulling past an edge goes to that edge's neighbour. Esc or the close control exits.

## Wireframe

Wide (>= 760 px). `|` is the fixed frame; content is panned underneath.

```
+--------------------------------------------------------------------------------+
| [a}morf . 007 / 025                                          close . esc  [x]  |
|                              ^ Cyber Kowloon                                   |
|                                                                                |
|  KOWLOON WALLED CITY . building                      +---------------+         |
|  Kowloon Walled City                                 |               |  < the  |
|  (serif, 56px)                                       |   hero image  |  next   |
|                                                      |               |  edge   |
|  DATE   PLACE    CREATOR   KIND                      +---------------+         |
|  ----   -----    -------   ----                      1975 . photograph         |
|                                                                                |
|< Rotterdam                                                       Yakhchal >    |
|                              v Souto de Moura                                  |
|--------------------------------------------------------------------------------|
| facts   traces 3   related 4              [ + leave a trace ]  set aside  ~> ? |
+--------------------------------------------------------------------------------+
   drawer (when open), right, between header and bar, 380 px:
                                          +----------------------------+
                                          | TRACES LEFT HERE        x  |
                                          | [overlay thumb]            |
                                          | note . note . note         |
                                          +----------------------------+
```

Narrow (< 760 px). Board is one screen wide (4 columns) and scrolls vertically; left and right are pulls only.

```
+----------------------------+
| [a}morf . 007/025   [x]    |
|        ^ Cyber Kowloon     |
|                            |
| KOWLOON WALLED CITY        |
| building                   |
| Kowloon Walled City        |
| DATE  PLACE  CREATOR       |
| +------------------------+ |
| |       hero image       | |
| +------------------------+ |
|< Rotterdam   Yakhchal >    |
|        v Souto de Moura    |
|----------------------------|
| facts  traces 3  related 4 |
| [ + leave a trace ]        |
+----------------------------+
   drawer = sheet rising from the bar, 70% height; "set aside" and "elsewhere"
   live at the foot of the drawer, not in the bar.
```

## The fixed frame: what lives where, always

Nothing in this table is an item in `layout`. None of it moves with content, entity kind or media count.

| Zone | Content | Behaviour |
| --- | --- | --- |
| Top left | `[a}morf . 007 / 025` (existing `it.ref`) | text only |
| Top right | `close . esc [x]` | button; calls `collapse()` (to the field) |
| Top, left, right, bottom edge midpoints | neighbour label: arrow, neighbour title (serif), `kind . year` (mono) | see navigation spec |
| Bottom bar, left | `facts`, `traces N`, `related N` | each opens the drawer on that tab; active tab has an accent underline |
| Bottom bar, right | `+ leave a trace`, `set it aside` / `set aside`, `~> somewhere unrelated` | existing handlers `v.onCompose`, `v.onAside`, `v.onElsewhere` |
| Drawer | tab body | opens from the right; Esc closes it first |

Bar and header use the existing hairline `field-line` borders, mono uppercase labels, no radius, no shadow, no icons beyond the `x` and arrows already in the vocabulary. `leave a trace` keeps its accent hairline box; it is the only boxed control.

Safe insets for the board: top 56, bottom 44, left and right 48 (wide); the grid is laid out inside them, so frame chrome never covers a grid cell at rest.

## Tools widget: drawer, opened from a fixed bar

Chosen: **right drawer opened from the bottom bar**. Not an overlay on content, not an always-open rail.

- Tabs and contents:
  - `facts`: the full table (medium, creator and role, client, collaborators, program, movement, materials, area, source, tags, links). Today only 3 facts show; the rest of `entity.json` is stored but unseen.
  - `traces`: the existing layered overlay thumbnail, `v.noteTally`, then the notes list (what `n*` pieces are today). Hover or focus on a note keeps the existing `enter`/`leave` highlight on the overlay.
  - `related`: the `passing` row if a walk passes through (`someone came through here`), then `assoc` rows (reason, title, `↓`), then `elsewhere`.
- Why a drawer: the bar is a constant 40 px so the board keeps its full area at rest (a persistent rail would eat 300 px that the composition needs); the list sizes are unbounded (traces, associations), which does not suit a popover; Hypothesis and Are.na both put this material in an edge-attached column, not over the content. An overlay on the board would fight pan gestures.
- Drawer is inert to board panning: pointer events on it do not start a pan. The board stays where it was and is dimmed to 0.55 so the reader keeps their place.
- While the drawer is open, edge pulls rubber-band but do not commit, and neighbour labels are hidden. (A drawer over the right label would otherwise make "pull right" ambiguous.)
- `leave a trace` is not a drawer tab: it runs the existing compose flow and stays one click from anywhere.

## Placement model

### Grid

- 12 columns per screen on wide, 4 on narrow. A **module** is square: `unit = (W - left - right inset) / 12` (wide) or `/ 4` (narrow); gutter is `unit * 0.14`, applied inside the module. Rows are the same size as columns, so a piece's pixel height depends only on its width and its own content, never on viewport height.
- The board is `board.cols` wide (default 24 = two screens of 12) and `board.rows` tall (default: as many as the last piece needs, plus 1). On narrow it is 4 wide and grows downward.
- Entry frame: the viewport rectangle shown on entry, top-left at cell `entry` (default `col 1, row 1`). Safe area for what must be visible on entry: columns 1-12, rows 1-6 (about 600 px at 1280 x 720).

### Pieces and refs

| `ref` | What | Default `w` (cols) |
| --- | --- | --- |
| `title` | stamp line + title | 6 |
| `meta` | strip: date, place, creator, kind (replaces the `year` and `place` pieces; facts table moves to the drawer) | 5 |
| `p:<n>` | description paragraph `n` (0-based) | 4 |
| `media:<file>` | a `media[]` item, addressed by file name (or embed url) so reordering `media[]` never breaks a placement | landscape 5, portrait 4, video 7 |

Height is never authored except to crop: `h` (rows) is optional; unset it is derived (media: `w * aspect` plus caption, text: measured). `h` on media crops with `focal`.

### Schema addition (`docs/templates/entity.schema.json`)

```json
"layout": {
  "type": "object",
  "properties": {
    "version": { "const": 1 },
    "board": { "type": "object", "properties": {
      "cols": { "type": "integer", "minimum": 12, "maximum": 48, "default": 24 },
      "rows": { "type": "integer", "minimum": 6 }
    } },
    "entry": { "type": "object", "properties": {
      "col": { "type": "integer", "minimum": 1 }, "row": { "type": "integer", "minimum": 1 }
    } },
    "items": { "type": "array", "items": {
      "type": "object",
      "required": ["ref"],
      "properties": {
        "ref":  { "type": "string", "pattern": "^(title|meta|p:\\d+|media:.+)$" },
        "col":  { "type": "integer", "minimum": 1 },
        "row":  { "type": "integer", "minimum": 1 },
        "w":    { "type": "integer", "minimum": 1, "maximum": 12 },
        "h":    { "type": "integer", "minimum": 1 },
        "z":    { "type": "integer" },
        "narrow": { "type": "object", "properties": {
          "col": { "type": "integer", "minimum": 1, "maximum": 4 },
          "row": { "type": "integer", "minimum": 1 },
          "w":   { "type": "integer", "minimum": 1, "maximum": 4 }
        } }
      }
    } }
  }
}
```

Rules `entities:check` enforces: every `ref` resolves (`media:<file>` exists in `media[]`, `p:n` is within `description`); no two items overlap on the board; `col + w - 1 <= board.cols`; `title` and `meta` both present or defaulted, and inside the entry frame (warning, not error). Array order is reading order: it is the narrow stack order and the Tab order.

`media[].at` stays in the schema, marked deprecated. `layout.items` wins over `at`.

### Example: `apps/web/content/entities/kowloon-walled-city/entity.json`

The entity has no year, place or description yet, so the strip and paragraphs are empty (not invented). Aspect ratios come from the probed `width`/`height`.

```json
"layout": {
  "version": 1,
  "board": { "cols": 24, "rows": 14 },
  "entry": { "col": 1, "row": 1 },
  "items": [
    { "ref": "title",                                  "col": 2,  "row": 2,  "w": 6 },
    { "ref": "meta",                                   "col": 2,  "row": 4,  "w": 5 },
    { "ref": "media:kwc-1975.jpg",                     "col": 8,  "row": 2,  "w": 5 },
    { "ref": "media:kowloon-walled-city-1989-aerial.jpg", "col": 14, "row": 2,  "w": 6 },
    { "ref": "media:kwc-alley.jpg",                    "col": 21, "row": 2,  "w": 3 },
    { "ref": "media:kwc-playground.jpg",               "col": 2,  "row": 8,  "w": 4 },
    { "ref": "media:kowloon-walled-city-1991.jpg",     "col": 7,  "row": 8,  "w": 4 },
    { "ref": "media:streets-in-kowloon-walled-city.jpg", "col": 13, "row": 8,  "w": 6 },
    { "ref": "media:cyber-kowloon-walled-city-01-2nd-floor-warehouse-kawasaki-20.jpg", "col": 20, "row": 8, "w": 4 }
  ]
}
```

Entry frame (cols 1-12, rows 1-6) shows title, meta and the 1975 photograph; the aerial starts at column 14, so something reaches past the frame without being cut by it. Row 7 is left empty as a band between the two rows of the board.

### Default when `layout` is unset

Deterministic; same output for the same entity and viewport class. No `rand`.

1. Entry frame: `title` at (col 2, row 2, w 6); `meta` directly under it; hero at (col 8, row 2): the `thumbnail` media, else the first image, else the first video, w 5 (video 7). With no media at all, the generated `plate` takes the hero slot, as now.
2. Remaining pieces in reading order: paragraphs and media interleaved (`p0, media[1], p1, media[2], ...`, remaining media after the last paragraph).
3. First-fit packing: for each piece, scan rows top to bottom, columns left to right, on even columns first, for the first rectangle that fits without touching an occupied cell (a one-cell margin around each piece). The entry frame region is pre-occupied. Row 7 is skipped so the entry frame is followed by a band.
4. The board grows downward in rows when nothing fits; width stays `board.cols`.
5. Narrow (4 columns): array order stacked top to bottom; `w` = 4 if the wide `w >= 6`, else 3, 3-wide pieces alternating left and right edge. Title, meta, hero come first.

An authored `layout` may list only some pieces: listed ones are fixed, the rest are packed around them by the rule above.

### Mapping from `at: [x, y]`

Old meaning: centre of the piece as a fraction of the surface (`2.2W x 1.8H` wide). Resolver: `w` = default for the ref; `col = clamp(round(x * board.cols - w / 2) + 1, 1, board.cols - w + 1)`, `row = clamp(round(y * boardRows - h / 2) + 1, 1, boardRows - h + 1)`, where `boardRows` is the default board height. Used only for media with `at` and no `layout.items` entry. A one-off `entities:migrate-at` writes explicit `layout.items` from `at` and removes `at`, so nothing depends on the approximation after migration.

### Responsive

Same data, two grids: 12 columns at >= 760 px (the existing `narrow` threshold), 4 below. Resolver picks `item.narrow` if present, else the default stack. Only `col`, `row`, `w` are overridable; no per-breakpoint content. Re-resolved on resize; pan position is kept as a fraction of travel, as `glide()` already does.

## Neighbour navigation

### Which entity

- Neighbours come from the field grid: `Field.tsx` `componentDidMount` already assigns each entity a slot `(gx, gz)` on a `ceil(sqrt(N))`-wide grid. Persist `gx, gz` on the node.
- `neighbour(id, dir)`: step one slot in `dir` (left = gx-1, right = gx+1, up = gz-1, down = gz+1; up is north in the HUD's `E/N` readout); the field tiles (camera position is taken modulo `TILE`), so wrap; skip empty trailing slots by stepping again, at most `cols` times. Pure function in `interior/neighbours.ts`.
- Walk override: when `f.passingTrace()` is set and the current entity is step `i`, the right neighbour is step `i + 1` (`steps[i + 1]`), labelled `walk . <name>`. Other three edges stay spatial.
- Going to a neighbour reuses `leaveToward(id, mark, false)` with mark `← ↑ → ↓`: the camera flies one cell and dives. A direct slide between entity views (no field in between) is a later option, not part of this change.

### Visuals

- Rest: all four labels shown at opacity 0.45 at the edge midpoints, inside the safe inset: top and bottom horizontal, left and right set vertically (`writing-mode: vertical-rl`, left rotated 180 degrees) so they do not take width. Content `arrow title` in serif 15 px, `kind . year` in mono 9 px under it; truncated at 24 characters.
- Narrow: left and right labels appear only while a pull toward them is under way (width is scarce); top and bottom stay.
- Pull (`p` = 0..1, see below): a 1 px accent line grows from the edge midpoint along that edge to `p` of its length (the existing `liftbar` mechanism, one per edge); the label translates 24 px toward the centre and goes to opacity 1; at `p >= COMMIT` the mono line changes to `release to go`.
- Release below COMMIT: spring back (existing rubber-band); label returns to rest.
- The board no longer loosens depth on pull (`DEPTH_DROP` is not applied to edge pulls); it stretches (existing `axis()`), and the neighbour label is the feedback.
- Reduced motion: no translate, label brightness and the edge line only.

### Thresholds and gesture

- Reuse `limits()` and `L = min(0.3 * min(W, H), 220)`. Per edge: `pull = over / L` where `over` is how far the pan is past that edge (`panX > 0` left, `panX < loX` right, `panY > 0` top, `panY < loY` bottom).
- Dominant edge only: the largest `pull` wins; a corner pull goes to one neighbour.
- Commit: on release (`wasHolding && !holding`) with `pull >= COMMIT` (0.55, `interior/state.ts`). Same rule as today, but the action is `goNeighbour(dir)` instead of `collapse()`.
- On narrow the board has no horizontal travel (`loX = 0`), so any horizontal drag is a left or right pull: a swipe, as in Stories.
- Pinch (ctrl-wheel, Safari gesture, two pointers) no longer leaves. It is swallowed (`preventDefault` stays so the browser does not zoom) and `pinchPull`, `pinchD0` are removed. **Confirm with user.**
- Wheel and trackpad: unchanged pan; a wheel pull past the edge accumulates through `axis()` like a drag, but commit happens only on a gesture end, so momentum scrolling alone never changes entity (only drag and wheel idle for 140 ms count, existing `holding` logic).

### Keyboard

| Key | Action |
| --- | --- |
| Arrows | pan 260 px (existing) |
| Shift + arrows | pan 680 px (existing) |
| Alt + arrow | jump straight to that neighbour. **Confirm key**: Alt + Left/Right is "back" in some browsers; `keyPan` currently ignores Alt, so this is new. |
| Tab | board items, then the four neighbour labels (they are buttons), then bar, then drawer; Enter on a label goes to that neighbour |
| Esc | closes the drawer if open; otherwise exits to the field |
| `close . esc [x]` | exits to the field |

## What changes in which file

| File | Change |
| --- | --- |
| `components/field/interior/layout.ts` | `compose()` removed. `interiorVals` builds items only for board content (`title`, `meta`, `p:n`, `media:file`), each with `ref`, content-derived size, and its `layout.items` entry; tool pieces (`traces`, `actions`, `passing`, `assoc`, `elsewhere`, `note`) are built as frame view-model (`out.frame`), not items. |
| `components/field/interior/placement.ts` (new) | `resolve(entityLayout, items, viewport) -> Layout`: grid maths, authored items, `at` mapping, default packing, narrow rule. Pure, no `Field` import. Replaces `placed` memo and `ix.placed.pos`. |
| `components/field/interior/state.ts` | `Item` gains `ref, col, row, cols`; `Interior` loses `pinchPull`, `pinchD0`, gains `edge: { dir, pull } \| null`, `drawer: "facts" \| "traces" \| "related" \| null`; `Layout.pos` stays pixel centres. |
| `components/field/interior/neighbours.ts` (new) | `neighbour(f, id, dir)`, walk override. |
| `components/field/interior/frame.tsx` (new) | `renderFrame(v)`: header, four edge labels, bar, drawer. `view.tsx` calls it and keeps `renderPiece` for board content only. |
| `components/field/interior/view.tsx` | Drop the tool cases from `renderPiece`; the old bottom `liftbar` strip becomes the bar. Add `meta` case (strip). |
| `components/field/interior/physics.ts` | `glide()`: compute `ix.edge` from pan overshoot; at commit call `goNeighbour` instead of `collapse`; `step()`: `depthWant` no longer reads `pullWant`. |
| `components/field/interior/input.ts` | Remove pinch to exit; add Alt + arrow; drawer-aware Esc. |
| `components/field/interior/paint.ts` | Drive per-edge label transform, opacity and line from `ix.edge` (via `data-role="edge-<dir>"`), as it does `liftbar` now. |
| `components/field/interior/lifecycle.ts` | `goNeighbour(f, dir)` = `leaveToward(neighbour id, mark, false)`. |
| `components/field/Field.tsx` | Keep `gx, gz` on nodes; Esc handler checks `ix.drawer` first. |
| `components/field/types.ts`, `lib/data/entities.ts` | Carry `layout` through from `entity.json`. |
| `docs/templates/entity.schema.json`, `docs/templates/entity.json`, `scripts/entities.mjs` (in `apps/web`), `docs/conventions/entities.md` | `layout` schema, check rules, new `layout` row, `media[].at` marked deprecated. |

## Open questions for the user

1. Pinch no longer leaves the entity view. Confirm, or keep pinch as a second exit?
2. Jump key: Alt + arrow conflicts with browser back on some platforms. Alternatives: `[` and `]` for previous and next, `g` then arrow. Which?
3. On a walk, should left be the previous step (symmetry) or stay spatial?
4. Meta strip: show `undated` and `unplaced` for unknown fields (current behaviour) or omit unknown fields? Archive taste suggests omit; entities.md currently says defaults are shown.
5. Neighbour via the 3D field means a short camera flight between entities. Acceptable for v1, or must it be a direct slide?
6. Is the field's up direction (north, `-z`) the right meaning of "up" when the reader entered facing some other way?
7. Drawer on first entry: closed always, or open on `traces` when the entity has traces?
8. Should the CMS be allowed to place `title` outside the entry frame (warning only, as proposed), or blocked?

## Acceptance criteria

1. Entering any entity shows title and the meta strip without panning, on 1280 x 720, 1440 x 900 and 390 x 844.
2. `leave a trace`, `set it aside`, `traces`, `related`, `facts` and `elsewhere` are at the same screen position for every entity regardless of content, and do not move when panning.
3. No tool appears as a piece on the board; `traces`, `actions`, `passing`, `assoc`, `elsewhere`, `note` kinds are gone from `renderPiece`.
4. With `layout.items` set, each listed piece renders at its `col`/`row`/`w` on the 12-column grid, identically after reload and resize (pan fraction kept).
5. With `layout` unset the board is identical on every load (no `rand` in `placement.ts`), and the entry frame holds title, meta and a hero.
6. An entity whose only placement data is `media[].at` renders with those pieces near their old relative position (within 1 column and 1 row of the formula above).
7. At < 760 px the same entity renders on a 4-column stack in array order, and `item.narrow` overrides apply.
8. `entities:check` fails on an unresolved `ref`, an overlap, or a piece beyond `board.cols`, and warns when `title` is outside the entry frame.
9. Dragging past an edge by >= `COMMIT * L` and releasing opens that edge's neighbour; releasing earlier springs back and stays.
10. Each of the four edges shows its neighbour's title at rest; the label for the edge being pulled brightens and shows `release to go` at COMMIT.
11. On a walk, pulling right goes to the next step; the right label shows `walk . <name>`.
12. Neighbours are the same entities the field shows adjacent to the card, with wrap-around, and no neighbour is the entity itself (when N > 1).
13. Pinch, ctrl-wheel pinch and Safari gestures do not leave the entity view (pending question 1).
14. Esc closes the open drawer; Esc with no drawer exits to the field; the `close . esc` control exits.
15. Alt + arrow (or the confirmed key) goes to the neighbour; all four labels are reachable by Tab and Enter works.
16. With the drawer open, edge pulls do not commit.
17. `prefers-reduced-motion` removes label translate and momentum but keeps the edge line.
18. `pnpm --filter @amorf/web exec tsc --noEmit`, `pnpm build` and `pnpm entities:check` pass.

## Open questions: defaults built

1. Pinch does not leave; it is swallowed (two pointers end the drag, ctrl-wheel and Safari gestures are ignored).
2. Alt + arrow jumps to that neighbour (its `preventDefault` keeps Alt + Left from going back).
3. On a walk only right is the next step; left, up and down stay spatial.
4. Unknown fields are omitted from the meta strip and the facts drawer (no `undated` / `unplaced`).
5. Neighbour travel is the camera flight through the field (`leaveToward`), no direct slide.
6. Up is north (`gz - 1`), whatever way the reader was facing.
7. The drawer is always closed on entry.
8. `title` or `meta` outside the entry frame is a warning in `entities:check`, not an error.

## Deviations

- `Layout.pos` holds each piece's top-left box (`x, y, w, h`, plus `col, row, cols, rows`), not its centre: pieces grow downward from their cell, so an underestimated text height never pushes a piece up into its neighbour.
- A video hero takes w 5 at (col 8, row 2) like an image, not w 7: w 7 from col 8 would run past column 12 and be cut by the entry frame.
- Narrow stack: `title`, `meta` and the hero are always 4 wide (the rule's "w >= 6 → 4, else 3" would make the meta strip 3 wide).
- An unauthored board is only as wide as its pieces need (at least 12 columns, at most 24 plus a margin column), so an entity with just title, meta and hero has no empty screen to pan to and a horizontal drag is at once a pull. With `layout.board.cols` set, the width is exactly that.
- Packing keeps column 1 and row 1 as the board's margin and lets a piece reach the last column; the board then adds one empty column on the right.
- The `at` mapping reads `y` against a fixed 14-row board (the example board) rather than the packed board height, which depends on the pieces being placed.
- `entities:check` checks overlaps with each item's authored `h`, or one row when `h` is unset, since heights are measured at runtime.
- The title piece's stamp line shows the first three tags (else the kind) instead of `kind · year`, which the meta strip now carries.
- The generated plate lost its "lay tracing paper" link: leaving a trace lives only in the bar.
- The drawer state lives on `ix.drawer` and opens with `setDrawer()` (in `lifecycle.ts`), which re-renders by hand; the Esc handler is in `components/field/input.ts`, not `Field.tsx`.
- `gx, gz` are stored on each node in `Field.tsx`; the neighbour lookup recomputes the column count from `OBJECTS.length`.
- Facts drawer rows come from `lib/data/entities.ts` (`facts`, `links` on `FieldObject`); `source` is the creator under its `creatorRole` label.
