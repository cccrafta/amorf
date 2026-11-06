---
title: Entity view (board, floating text, zoom, slide; round 2 built)
updated: 2026-11-06
last_verified: 2026-11-06
status: built
---

# Entity view redesign

Built 2026-10-29; see **Deviations** at the end for where the code differs from this page. The code (`apps/web/components/field/interior/`) is the source of truth. Paths in this page are inside `apps/web/` unless they start with `docs/`. The decision is recorded in [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md). Rules stay in [entities.md](../conventions/entities.md) and [folder-structure.md](../conventions/folder-structure.md); this page loses any disagreement with them.

**Round 2 built (2026-11-01):** [Round 2](#round-2) at the end of this page records entry (radial), traversal (slide), zoom, floating text from an entity template and traces (off). Where a section above disagrees with a Shipped section in it, the Shipped section wins; the round-1 frame (header, bottom bar, edge pulls, `title`/`meta`/`p:<n>` board pieces) is gone and has been cut from this page. Round 1 is in git history and [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md).

## Problem

1. `layout.ts` `compose()` places pieces by seeded best-of-N sampling. Nothing is authored: the same entity looks different per viewport, a CMS user cannot say where a piece goes, and `at: [x, y]` is honoured only as a fraction of a surface whose size is derived from the viewport.
2. Tools are pieces on that surface (`traces`, `actions`, `passing`, `assoc`, `elsewhere`, `note`, `place` facts). They land wherever the sampler puts them, so "leave a trace" is somewhere different for every entity.
3. The entry view is whatever the sampler centres: title and primary piece are placed near the middle, but metadata (`year`, `place`) are separate pieces that may be off screen.
4. Pulling past any edge, or pinching, called `collapse()` and left to the field. A reader who pulls past an edge expects "more", not "out".

## Research findings

The pattern research (authorable layouts, annotation and connection interfaces, collection and edge navigation) and what it meant for this design is recorded in [EXP-0001](../../research/experiments/0001-entity-view-navigation/README.md). The decision it backs is [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md).

## Design summary

- Two layers. The **board** (media only: pictures, video; pans and zooms) and the **floating layer** (title, meta and paragraphs from the entity template; fixed bottom-left). Everything else is a `≡` menu and the drawer.
- Board is placed on a grid of square modules (12 columns wide, 4 narrow). Each piece has `col`, `row`, `w`. Unset: a deterministic radial auto-layout around the hero, no randomness.  A piece with `col`+`row` is pinned; the rest pack radially around the pinned ones.
- Edges are walls. Another entity is reached by an edge label, Alt + arrow, related or "somewhere unrelated", all as a slide. Esc or the menu's close leaves to the field.

## The frame and the menu

Nothing but the board pans. Over it sit the text overlay (bottom-left), a `≡` button with the entity ref (top-left), the "set it aside" toggle (top-right; the wide drawer covers it) and, while the drawer is open, the drawer. The button opens a popup menu: drawer tabs (`facts`, `related`; `traces` when `TRACES_ENABLED`), the walk control, "somewhere unrelated", "leave a trace" (when traces are on), "scroll feel" and close. Esc peels one layer at a time: menu, scroll panel, drawer, expanded text, then leaves (`escInterior` in `interior/lifecycle.ts`).

- `facts`: the full table (medium, creator and role, client, collaborators, program, movement, materials, area, source, tags, links).
- `related`: the `passing` row if a walk passes through, then `assoc` rows (reason, title), then the other entities reached from here.
- The drawer opens from the right and is inert to board panning.
- The earlier wireframes (header, four edge labels, bottom bar) are gone; see [D. Shipped](#d-shipped-step-1) for the current frame.


## Placement model

### Grid

- 12 columns per screen on wide, 4 on narrow. A **module** is square: `unit = (W - left - right inset) / 12` (wide) or `/ 4` (narrow); gutter is `unit * 0.14`, applied inside the module. Rows are the same size as columns, so a piece's pixel height depends only on its width and its own content, never on viewport height.
- The board is `board.cols` wide (default 24 = two screens of 12) and `board.rows` tall (default: as many as the last piece needs, plus 1). On narrow it is 4 wide and grows downward.
- Entry frame: the viewport rectangle shown on entry, top-left at cell `entry` (default `col 1, row 1`). Safe area for what must be visible on entry: columns 1-12, rows 1-6 (about 600 px at 1280 x 720).

### Pieces and refs

| `ref` | What | Default `w` (cols) |
| --- | --- | --- |
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
        "ref":  { "type": "string", "pattern": "^media:.+$" },
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

Rules `entities:check` enforces: every `ref` resolves (`media:<file>` exists in `media[]`); no two items overlap on the board; `col + w - 1 <= board.cols`. `title`, `meta` and `p:<n>` refs are ignored with a warning. Array order is reading order: it is the narrow stack order and the Tab order.

`media[].at` stays in the schema, marked deprecated. `layout.items` wins over `at`. The default radial packing (no authored `col`/`row`) ignores `at`; a CMS writes `layout.items` only.

### Example: `apps/web/content/entities/kowloon-walled-city/entity.json`

The entity has no year, place or description yet, so the strip and paragraphs are empty (not invented). Aspect ratios come from the probed `width`/`height`.

```json
"layout": {
  "version": 1,
  "board": { "cols": 24, "rows": 14 },
  "entry": { "col": 1, "row": 1 },
  "items": [
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

Entry frame (cols 1-12, rows 1-6) shows the 1975 photograph; the aerial starts at column 14, so something reaches past the frame without being cut by it. Row 7 is left empty as a band between the two rows of the board.

### Default when `layout` is unset

Deterministic; same output for the same entity and viewport class. No `rand`. The hero (the `thumbnail` media, else the first image, else the first video) is centred and the other board pieces are packed in rings around it ([A. Shipped](#a-shipped-radial-entry)). Text is not placed on the board; the template puts it on the floating layer ([D. Shipped](#d-shipped-step-1)). An authored `layout` may list only some pieces: listed ones are fixed. Narrow (4 columns): float pieces first, then the board pieces stacked in array order, all 4 wide.


### Mapping from `at: [x, y]`

Old meaning: centre of the piece as a fraction of the surface (`2.2W x 1.8H` wide). Resolver: `w` = default for the ref; `col = clamp(round(x * board.cols - w / 2) + 1, 1, board.cols - w + 1)`, `row = clamp(round(y * boardRows - h / 2) + 1, 1, boardRows - h + 1)`, where `boardRows` is the default board height. Used only for media with `at` and no `layout.items` entry. A one-off `entities:migrate-at` writes explicit `layout.items` from `at` and removes `at`, so nothing depends on the approximation after migration.

### Responsive

Same data, two grids: 12 columns at >= 760 px (the existing `narrow` threshold), 4 below. Resolver picks `item.narrow` if present, else the default stack. Only `col`, `row`, `w` are overridable; no per-breakpoint content. Re-resolved on resize; pan position is kept as a fraction of travel, as `glide()` already does.

## Reaching another entity

Neighbours come from the field grid (`gx`, `gz` on each node; one slot in a direction, wrapping, skipping empty slots; `neighbour()` in `interior/neighbours.ts`). The board is a wall at its edges, so a neighbour is reached by its edge label, Alt + arrow (`preventDefault` keeps Alt + Left from going back), the menu's related list or "somewhere unrelated"; every route is a slide ([B. Shipped](#b-shipped-slide)). On a walk the right neighbour is the next step. Keys: arrows pan 260 px, Shift + arrows 680 px, `+` / `-` / `0` zoom. **Armed edge:** pushing the board into a wall (wheel, drag, arrows or a glide, on the dominant axis) arms that side: its label goes `--field-red` at full strength with its edge line drawn, the sub reads `enter to go`, and Enter or Space slides to that neighbour unless a focused control owns the key. Moving off that wall, a zoom or a switch disarms it (`ix.armed`; set in `physics.nudge`, painted in `paint.paintEdges`, keyed in `input.keyPan`).

**Scope.** While a walk is open (`state.filter` with `filterSet`) or the visitor is inside a space (`spaces.inSpace`), an entity leads only to members of that set. `scopeOf()` in `interior/neighbours.ts` returns the set, or null for the whole field. It limits the four edges, the walk's next step, the `related` tab (relations to entities outside are dropped), the "somewhere unrelated" pick, the image preload and the `[a}morf · n / N` counter. Inside a set the slot grid has holes, so an edge picks the nearest member in the half-plane past it, measured on the wrapped field positions (`hx`, `hz`); the space's table arrangement does not decide direction. A set of three can show an arrow on one edge and none on another. The "unrelated" pick is made once per entity and viewport size, so it is right for the set that was open when the entity was entered.


## Deviations

- `Layout.pos` holds each piece's top-left box (`x, y, w, h`, plus `col, row, cols, rows`), not its centre: pieces grow downward from their cell, so an underestimated text height never pushes a piece up into its neighbour.
- The `at` mapping reads `y` against a fixed 14-row board (the example board) rather than the packed board height, which depends on the pieces being placed.
- `entities:check` checks overlaps with each item's authored `h`, or one row when `h` is unset, since heights are measured at runtime.
- The drawer state lives on `ix.drawer` and opens with `setDrawer()` (in `lifecycle.ts`), which re-renders by hand; the Esc handler is in `components/field/input.ts`, not `Field.tsx`.
- `gx, gz` are stored on each node in `Field.tsx`; the neighbour lookup recomputes the column count from `OBJECTS.length`.
- Facts drawer rows come from `lib/data/entities.ts` (`facts`, `links` on `FieldObject`); `source` is the creator under its `creatorRole` label.
- **Traces are switched off** (2026-11-01). `TRACES_ENABLED = false` in `components/field/notes.ts` hides the `traces` drawer tab and the `+ leave a trace` control described above, until traces are specified ([backlog.md](../backlog.md)). Acceptance criterion 2 holds for the remaining controls.

## Round 2

Built 2026-11-01; it answers the entity-view items from the 2026-10-31 feedback session ([backlog.md](../backlog.md)). The bullets under each letter are the original proposal; the "Shipped" paragraph under it says what was built and wins. The DDR for it is still to write: DDR-0003, superseding the parts of [DDR-0002](../decisions/ddr/0002-entity-view-fixed-frame-and-board.md) it changes (accepted records are never edited).

### Feedback covered

| # | Feedback | Before | Proposed |
| --- | --- | --- | --- |
| A | Entering should be radial, not just to the right | Entry frame is the board's top-left; packing runs right and down (`placement.ts`) | Board centred on the entry frame; pieces packed in rings outward; opening unfolds from the centre |
| B | Traversing between entities is not great | Collapse to card, camera flies across the field, dive again (`lifecycle.ts`, `navigation.ts`) | Seamless switch in place, plus a cue that the entity changed |
| C | Zoom in and out in an entity | None; pinch is swallowed (`input.ts`) | The view as a table: zoom 0.4 to 2x around the pointer, overview at minimum, pan in every direction |
| D | Text as a floating component people can see | Title, meta, paragraphs are board pieces and pan away | Entity template of registered piece kinds; text on a floating layer that stays in view |
| E | Specify traces | Code only: `FieldNote` in `types.ts`, in-memory, no spec | Disabled behind a flag; spec moves to the backlog |

Out of scope here (other backlog areas): sound control, floor, thumbnail angle, track layering, entity types, authoring.

### A. Radial entry

- **Board shape.** The board extends on all four sides of the entry frame. Coordinates become centred: the entry frame is cols -5..6, rows -2..3 (wide); `col`/`row` may be negative. Default board: 36 x 18 cols/rows (one and a half screens each way).
- **Default packing.** Title, meta, hero stay in the entry frame. Remaining pieces are placed by ring: candidate cells sorted by distance from the centre, nearest first, with the angle stepped by the golden angle so consecutive pieces land on different sides. Deterministic, no `rand`.
- **Opening.** The existing clip-path expand stays. Inside it, pieces fade and move 12 px outward from the centre, staggered by distance from the centre (about 40 ms per ring, capped at 400 ms total). Reduced motion: fade only.
- **Authored layouts.** `layout.version` goes to 2 (centred coordinates). A v1 layout is read by shifting it so its `entry` cell becomes the centre. `entities:check` accepts both.
- **Narrow.** Unchanged: 4-column vertical stack. Radial only applies at >= 760 px.

### B. Traversal between entities

Decided direction: seamless. The reader is suddenly in the new entity, and a cue says the entity changed. Which cue is open: [EXP-0003](../../research/experiments/0003-seamless-entity-switch/README.md) compares four.

- **Switch in place.** Releasing an edge pull past COMMIT replaces the board in place. No collapse, no camera flight, no dive.
- **Field stays consistent.** At the switch the camera moves to the neighbour's card behind the interior, so exiting afterwards drops you at the right place in the field.
- **Cue candidates.** Frame only (ref number and title stamp change), hairline sweep in the pull direction, cut with flash and sound, slide as baseline. The other exits (related items, "somewhere unrelated") use the same cue without a direction.
- **Reduced motion.** Frame-only cue.

#### B. Shipped (slide)

Built 2026-11-01. A map transition (path drawn between the two entities, 1.4 s) was tried first the same day and dropped after feedback: not snappy, and the path's direction did not match the pull. What replaced it:

- **Peek.** Each neighbour has a preview waiting off its side, with no background, so it reads as more of the same table: its lead picture where placement puts it with no authored layout (col 2, row 2) and its title where the text overlay sits. While you pull an edge, the preview sits against the board's edge: it shows exactly as far as the board is pulled past that edge, and the text overlay moves with the board.
- **Release.** Past COMMIT the preview finishes covering the view in 180 ms (ease-out) while the board and its text slide out the other way by the same amount, edge labels hidden; then `navigation.switchTo` swaps the entity in place under it and the preview fades off the real board in 100 ms. With a trackpad, the momentum phase (wheel deltas shrinking three times running) counts as letting go, and momentum left after the slide starts is swallowed until the wheel stream pauses 120 ms. Before COMMIT the board springs back and the preview with it.
- **Without a pull.** Alt+arrow and the neighbour labels slide from that side. Related, a passing walk and anything marked `↓` slide up from the bottom; "somewhere unrelated" (`⤳`) fades the preview in. Reduced motion: a 100 ms fade.
- The camera is put at the new card at the switch, so leaving lands in the right place. Input is ignored during the slide. The field's friction detour does not apply to moves made from inside an entity.
- The preview keeps covering after the swap until the new board is rendered and panned to its opening place, and an entity entered by a slide skips the radial unfold, so the switch has no blank or flashed frame.
- Known gap: the preview approximates the opening view; an authored layout or a video lead differs, which the 100 ms fade covers.

### C. Zoom (the table)

Decided. The flat view is a table: information and media laid out, the reader zooms in and out and moves in every direction. Tested with A in [EXP-0002](../../research/experiments/0002-entity-view-as-table/README.md).

- **Input.** Pinch (two pointers, Safari gesture, ctrl-wheel) and `+` / `-` / `0` keys. Range 0.4 to 2x, anchored on the pointer (keys: viewport centre). Pan limits scale with zoom.
- **Overview.** At the minimum the whole board fits the viewport: a map of the entity. Clicking a piece there zooms back to 1x centred on it.
- **Exit.** Pinching out past the overview (the whole entity in view) leaves to the field. Esc and the close control still leave too.
- **Exit feedback.** Past the overview the pinch rubber-bands, and the exit plays backwards as you pinch, so you see where you are going before you commit:
  - the board keeps shrinking toward its card's place in the field, and the clip-path closes toward the card's rect (the opening expand, reversed);
  - the field fades in behind and the blur lifts;
  - a hairline frame traces the card's outline, and the header label reads `release to leave` once past COMMIT (same 0.55 rule and wording as edge pulls).
- **Release.** Past COMMIT: finishes into the card in the field. Before COMMIT: springs back to the overview. Reduced motion: no scaling, field fade and label only.
- **Text.** The floating reading column (D) does not scale; it stays readable at any zoom.

#### A. Shipped (radial entry)

Built 2026-11-01, for unauthored boards only (no `layout.items` with `col`/`row` and no `layout.entry`); authored layouts keep the v1 top-left behaviour, and `layout.version` 2 (centred coordinates) is not built. The hero is placed at the centre and the view opens centred on it. Every other board piece takes the free spot (one empty cell around it) that scores lowest on distance from the centre, weighted up to 1.5x by how far its direction is from its preferred angle (stepped by the golden angle per piece); vertical distance is stretched by the viewport aspect so rings fill a wide screen. The board is then shifted so column and row 1 stay as margin, and is only as big as its pieces (a small board sits centred in the viewport). Opening: each piece fades in from 12 px nearer the centre, delayed 40 ms per ring of four modules (capped at 400 ms), replayed on every entity open; reduced motion keeps the fade only. The slide's preview places the hero centred to match.

#### C. Shipped (zoom, edges as walls)

Built 2026-11-01, after EXP-0003 found edge-pull switching janky:

- **Edges are walls.** The board stops hard at its edges: no stretch past them, no spring back, and a glide stops there. It never leaves the entity. Neighbours are reached by their edge labels, Alt+arrow, the menu's related list and "somewhere unrelated" (all still use the slide). Peeks no longer show.
- **Zoom.** Pinch (two pointers), trackpad pinch (ctrl-wheel), Safari gestures zoom about the pointer; `+` / `-` step by 1.25x about the viewport centre and `0` returns to 1x, eased. Range: the overview (whole board fits, never above 1x or below 0.15x) to 2x. A board smaller than the viewport at the current zoom is held centred. The text overlay does not scale.
- **Overview click.** Fully zoomed out, clicking a piece zooms to 1x centred on it.
- Each entity opens at 1x. Not built yet: pinching out past the overview to leave (the exit feedback above).

### D. Floating text, as part of an entity template

Decided direction: the floating text belongs to an entity template. Only text for now, but the view must take any number of content types. Tested in [EXP-0004](../../research/experiments/0004-entity-template-pieces/README.md).

- **Piece registry.** Each content type is a piece kind in its own file under `interior/pieces/`: `{ kind, layer, measure, render }`, registered like media renderers are in `apps/web/lib/media/registry.ts`. View, placement and gestures never branch on kind.
- **Two layers.** `board` pieces sit on the table (pan and zoom with it). `float` pieces sit in the floating layer, which stays in view and does not scale with zoom.
- **Template.** Per entity type, an ordered list of pieces and their sources (e.g. title, meta, `text` from `description`). Entities without a type use a default template. This is the base the entity-types backlog item builds on (generic properties plus type-specific ones such as architect or client).
- **Floating layer, first version.** One column on the right, as in the reference image: title (blue), meta, paragraphs (red), scrolling on its own when long, about 320 px wide, slight parallax (0.08) with the pan, no background panel. A control collapses it to the title.
- **Narrow.** The floating layer becomes the first block of the vertical stack.
- **Authoring.** `title`, `meta`, `p:<n>` refs in `layout.items` are ignored (warning in `entities:check`); the template places text.

#### D. Shipped (step 1)

Built 2026-11-01 in `components/field/interior/pieces/`. Where it differs from the bullets above:

- A kind is `{ kind, layer, build, render }`. `build(ctx, source)` returns that kind's pieces for the open entity, each with its own `tall(w)` (the "measure"), because one kind can yield several pieces (paragraphs, images). `ctx` carries the entity, viewport width, narrow flag, hero media index and live media index, computed once in `layout.ts`.
- Kinds: `title`, `meta`, `para` (float); `media` (stills), `video` (the live slot) (board). `pieces/index.ts` imports each kind file, which registers it. `DEFAULT_TEMPLATE` in `pieces/template.ts`; `TEMPLATES` by entity type is empty until entities carry a type.
- Board order is hero first, then the other board pieces in template order, so a live video that is not the hero now sits after the stills instead of at its `media[]` position.
- Revised the same day after feedback: two layers. The board holds media only (pictures, video). Over it, fixed, sits the text overlay bottom-left (40 px in, 28 px up, 420 px wide), with no background and no parallax. At rest it is capped at 34% of the viewport height; when the text is longer (estimated from each piece's `tall`), its bottom fades out and clicking the fade opens it to full height (top 56 px), scrolling. "less ×" or Esc closes it. It hides while the drawer is open.
- Removed the generated `plate` piece on 2026-11-05: an entity with no media now shows no board, only its text. The generated line art was noise, not information.
- No footer bar and no header row. A top-left button (`≡` plus the entity number) opens a popup that holds the drawer tabs, the walk control, "somewhere unrelated", "leave a trace" (when traces are on) and close. Esc peels back one layer at a time: menu, drawer, expanded text, then leaves (`escInterior` in `lifecycle.ts`). A press outside the menu dismisses it.
- The board does not keep clear of the overlay: media may sit under the text.
- Placement: the title and meta slots are gone; the hero settles at (col 2, row 2). The entry frame is only reserved from packing when `layout.entry` is authored, so an unauthored board fills the first screen beside the hero. Narrow: float pieces lead the stack, all 4 wide.
- Scroll feel is tunable in one place, `components/field/scroll.ts` (wheel speed, share of trackpad momentum kept, drag glide, fling limit, field walk and turn speed), saved per browser in `localStorage` (`amorf.scroll`). The menu's "scroll feel" row opens sliders. Defaults reduce inertia from the earlier fixed values: drag glide 240 to 140 ms, fling limit 4 to 2.5 px/ms, trackpad momentum kept at 35%. Key presses keep a fixed 240 ms glide.
- Not done yet: the throwaway `quote` kind from EXP-0004's method (step 4 there).

### E. Traces

Decided: off for now, specify later ([backlog.md](../backlog.md), "Specify traces"). `TRACES_ENABLED = false` in `apps/web/components/field/notes.ts` hides the compose control, the traces drawer tab, marks on cards and the HUD count. Walks are a separate feature and stay on. The spec questions (what a trace is, what it holds, where it is stored, who sees it) move to the backlog item.

### Research and portfolio

This round is run as research, then told as the `entity-view` case study ([research/portfolio/README.md](../../research/portfolio/README.md)). EXP-0001 (round 1) and EXP-0002 to EXP-0004 carry `case_study: entity-view`. Each experiment is set to `publish: true` when its outcome is in and you want it shown. The DDR written at the end cites them in `evidence`.

### Plan of action

Each step builds, type-checks and is checked in the browser by you before the next starts.

| Step | What | Experiment | Main files |
| --- | --- | --- | --- |
| 1 | Piece registry and default template; text moves to the floating layer | EXP-0004 | `interior/pieces/` (new), `layout.ts`, `view.tsx`, `placement.ts` |
| 2 | Centred board, ring packing, opening from the centre | EXP-0002 | `placement.ts`, `physics.ts`, `paint.ts`, `entities:check` |
| 3 | Zoom and overview | EXP-0002 | `input.ts`, `state.ts`, `physics.ts`, `paint.ts` |
| 4 | Seamless switch as a slide that follows the edge pull (shipped 2026-11-01, see B. Shipped) | EXP-0003 | `lifecycle.ts`, `physics.ts`, `navigation.ts`, `frame.tsx` |
| 5 | Reader sessions for EXP-0002 and EXP-0003; fill in outcomes | all | `research/experiments/` |
| 6 | DDR-0003 superseding the changed parts of DDR-0002; case study draft (`portfolio-compile`) | all | `docs/decisions/ddr/`, `research/portfolio/` |

Step 1 comes first because the registry is the structure the rest builds on, and removing text from the board simplifies packing for step 2.

### Still open

1. **Moving between entities.** EXP-0003 (done 2026-11-01) found the edge-pull switch janky: it restricts free movement inside an entity, depends on scroll inertia, and is not intuitive. The slide stays as the best variant so far. Open: whether edges stop being doors, and what transitional feature replaces or supports the slide.

#### Mixed placement (2026-11-03)
Pieces listed in `layout.items` with `col` and `row` are pinned and never move. Every other piece packs radially (same golden-angle rings as the unauthored board) around the hero, or around the middle of the pinned pieces when the hero is itself pinned or `(2, 2)` is taken, inside `board.cols` (default 24). With `layout.entry` authored the unpinned pieces keep first-fit packing instead. The board still opens at its top-left (or the entry frame); only a fully unauthored board opens on the hero with the unfold. This is what a CMS relies on: pin one piece and the rest still arrange themselves.

#### URL routes (2026-11-03)
The address bar follows the view: `/` field, `/entities/<id>` an open entity, `/plan`, `/walks/<name>`, plus `?q=` for the search text. Entering an entity, sliding to a neighbour and leaving each push a history entry; flying from one entity to another through the field logs only the entities (`routeHold`), not the field in between. Back and forward replay the view through the normal lifecycle (`flyTo`, `leaveToward`, `collapse`), and `routeGoal` keeps the sync from overwriting a back step while its animation runs. A cold load of `/entities/<id>` goes straight inside with the camera already at that card (`switchTo`), so leaving lands on it in the field. Camera position and board position are not in the URL. EXP-0005 listed URL routing as out of scope; this supersedes that for the stage-1 plan.

#### Walk minimap (2026-11-05, experiment)
While a walk exists, the left walk list (`renderTraceRail`) is replaced by a small wordless map in the bottom-left: the walked route as one line in the walk colour, visited entities as their own thumbnails (a solid square when an entity has none), unvisited ones as faint ticks, and the visitor as a point with a facing cone. It is a live copy of the plan view's drawing, centred on the visitor and wrapping with the field; it shares the route and colours with `plan.ts` and the route path with `ui/plan.tsx`, and `paintMap()` in `components/field/map.ts` repaints it from `frame()`. Clicking it opens the plan. It is hidden inside a space and while an entity or any overlay is open, and `syncUrl` keeps `map` in the address like `spaces`. On by default; `?map=0` brings back the walk list. Tested in [EXP-0011](../../research/experiments/0011-walk-plan-drawn-by-walking/README.md).

#### Ground (2026-11-05, experiment)
The field has a 3D ground, on by default; `?gl=0` leaves the CSS-only field untouched. It is a canvas behind the cards (`data-role="ground"` in `ui/stage.tsx`, pointer-events none) on which `paintWorld()` in `components/field/world.ts` draws the world from `frame()`: one three.js `WebGPURenderer` (WebGPU, or its WebGL 2 backend; `?gl=webgl2` forces it, and the canvas's `data-backend` says which runs), one scene, one camera. The ground (`ground.ts`) is the world's first object, a plane with a TSL node material. three comes in by dynamic `import("three/webgpu")`, so it is out of the eager bundle and never fetched under `?gl=0` ([ADR-0019](../decisions/adr/0019-three-js-for-the-field-ground-in-a-flagged-spike.md), [EXP-0013](../../research/experiments/0013-scene-core-on-webgpu/README.md)). The camera maths is in `ground-math.ts` and reproduces the CSS projection: vertical fov `2 atan((H/2) / P)` with `P = 900`, the principal point lowered so the horizon sits at the stage's 46% perspective origin, the eye `P` behind `f.cam` on the yaw line (the frame turns about `f.cam`, not about the eye), yaw as `rotation.y = -yaw`. It was checked against the exact CSS card chain with a Node script (0 px error over random poses at 1440x900 and 390x844); rerun such a check if `perspective`, its origin or the card transform changes. The camera's `coordinateSystem` is set to the renderer's before `fitCamera`, so the depth range fits the backend's clip space. The plane never moves: the torus is wrapped by offsetting the texture (a TSL uniform) by the eye position modulo a period that divides `TILE` (`TILE / 20`). The texture is drawn to a canvas in the field's tokens (`--field-line`, `--field-ink`), mipmapped and anisotropic, and its alpha fades with view depth into the background.

With the ground on, every card stands on it (`groundPinned()`): the vertical scatter is dropped and `frame()` sets `dy = groundY(H) - height / 2` (`groundY` = `EYE_HEIGHT - 0.04 H`: the plane lies `EYE_HEIGHT` = 480 units under the eye, a constant in `ground-math.ts` to tune), so the bottom edge sits on the plane, and the card turns about its own centre (`transform-origin: 0 0`) instead of the default box centre, which swung it off its anchor as it turned. Card heights are read from layout and cached for a second. The ground is hidden inside a space (cards there keep the space's own placement) and fades out as an entity opens; `syncUrl` keeps `gl` in the address. Route lines (`tracks.ts`) follow the same placement: each foot is the card's anchor on the plane, moved by the same `wearPull()` as the card, so the pin has no length (not drawn) and the route lies on the ground between the feet. The route is clipped in 3D against a plane 60 units in front of the eye (`clipNear`) so it runs off the screen edge instead of stopping mid-floor, fades by distance band instead of being culled, and takes the shortest wrapped route per step (`unwrapRoute`); a Node check puts feet and route endpoints on the card's bottom-edge pixel within 1 px. Limits: a worn card stands on a different spot of the grid while its wear changes (the pull moves it along the line of sight on purpose), and there is no contact shadow or occlusion yet (step 2, cards as planes). Tested in [EXP-0012](../../research/experiments/0012-webgl-ground-against-css-void/README.md).
