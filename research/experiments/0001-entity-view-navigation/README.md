---
id: EXP-0001
title: Entity view navigation and authored placement, pattern research
date: 2026-10-29
status: done
question: How should an author place content in the entity view, where do tools live, and how does a reader move from one entity to the next?
hypothesis: A fixed grid with spans, one fixed place for tools, and edge pull to a neighbour serve authors and readers better than a free canvas, a sampler or exit-only edges.
method: Desk research of authoring tools (Readymag, Cargo, Semplice, Payload, canvas JSON formats), annotation interfaces (Hypothesis, Are.na) and museum collection navigation (Cooper Hewitt, First Monday study, CCA, Instagram Stories, PhotoSwipe), read for pattern, not copied.
materials: [12-column-grid, entity-json-layout]
tools: [web-search]
outcome: Fixed grid with spans for placement, tools in one right-hand drawer opened from a fixed bar, edge pull to a neighbour for navigation. Built and recorded in DDR-0002; open questions and the defaults built are listed in docs/design/entity-view.md.
decisions: [DDR-0002]
tags: [entity-view, navigation, layout, grid]
media: []
publish: false
case_study: null
updated: 2026-10-31
last_verified: 2026-10-31
---

# EXP-0001: Entity view navigation and authored placement

## Hypothesis

Authors need a placement model that stays editorial on every screen; readers pulling at an edge expect more, not out. A fixed grid, a single place for tools and neighbour navigation should answer both.

## Method

Desk research, reconstructed on 2026-10-31 from the research notes of the entity view design page. Each source was read for the pattern it shows, not copied. Where a search returned nothing useful, that is said below.

## Observations

Read for pattern, not copied. Where a search returned nothing useful, that is said.

### Authorable layouts
- Readymag is a free-position canvas with optional snap to grid and guides; cost is that every breakpoint needs separate work and non-designers break pages. https://tympanus.net/codrops/2025/10/02/how-readymags-free-layout-model-drives-unconventional-web-design/ , https://help.readymag.com/hc/en-us/articles/360018140512-Blocks
- Cargo offers a freeform canvas plus five gallery modes (grid, columnized, justify, freeform, slideshow); the freedom makes ordinary pages harder. https://docs.cargo.site/galleries , https://www.techradar.com/pro/software-services/cargo
- Semplice: column grid, drag and resize on grid, each breakpoint edited separately; column order and hiding are per breakpoint. https://www.semplice.com/responsive , https://www.semplice.com/features
- MDN: the 12-column pattern keeps the same 12 tracks at every breakpoint and changes only how many tracks an item spans; named areas are good for prototyping. https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts
- Payload blocks field: layout stored as an ordered array of typed blocks; the front end maps `blockType` to a renderer; the website template uses a per-column `size` select mapped to a span. https://payloadcms.com/docs/fields/blocks
- Canvas JSON: Excalidraw elements and JSON Canvas nodes carry `id, type, x, y, width, height`; tldraw keeps `x, y` on the record and `w, h` in `props`, plus a schema version for migrations. https://docs.excalidraw.com/docs/codebase/json-schema , https://dev.to/benriemer/json-canvas-how-to-build-interoperable-infinite-canvas-apps-with-an-open-format-1187 , https://tldraw.dev/sdk-features/store

### Annotation and connection UIs
- Hypothesis: sidebar behind an edge tab, cards linked both ways to the page, a "bucket bar" showing where annotations sit, an eye toggle for uninterrupted reading. https://web.hypothes.is/help/overview-of-the-hypothesis-system/ , https://web.hypothes.is/blog/everything-you-can-do-with-the-hypothesis-lms-app-as-of-october-2026/
- Are.na: the block page lists its connections in a fixed right-hand column ("your connections", "all connections"), with a "Connect" action on the block. https://help.are.na/docs/getting-started/blocks
- Genius, Readwise, Kinopio: searches returned no usable UI detail (Kinopio only a canvas converter gist). Not relied on.

### Collections and edge navigation
- Cooper Hewitt chose open-ended links from an object page (people, tags, exhibitions) over sequential prev/next. https://mw2015.museumsandtheweb.com/paper/reconsidering-searching-and-browsing-on-the-cooper-hewitts-collections-website/
- First Monday study of eight museum sites: object pages are mostly images with almost no navigation elements, which is the gap the entity view closes. https://firstmonday.org/ojs/index.php/fm/article/download/6984/6090
- CCA object pages: metadata (extent, scope note, reference number) as plain labelled fields; the result gave no single-item layout. https://www.cca.qc.ca/en/search/details/collection/object/380477
- Instagram Stories: horizontal swipe moves between accounts (the next container), tap moves within one; down or an X exits. Keep key content away from the tap edges. https://dev.to/dev48v/i-rebuilt-instagram-stories-segmented-progress-bars-4bil , https://www.flinque.com/blog/instagram-stories-navigation-explained/
- PhotoSwipe: arrow keys move between items, Esc closes, vertical drag closes; all optional; a close control is kept because the corner is hard to reach. https://photoswipe.com/options/
- Rijksmuseum, MoMA, e-flux, Wallpaper*: no usable layout detail found; not relied on.

### What this means here
- Fixed grid with spans (MDN, Semplice, Payload `size`) beats free canvas for a CMS user: snapping keeps it looking edited, and narrow screens have a rule. Canvas JSON is used only for its shape (`x, y, w` per item, a `version`).
- Tools belong in one fixed place, reached by an edge tab (Hypothesis) and listed in a fixed column (Are.na), not inside the content.
- Edge pull to another container is the Stories pattern; Esc plus a visible control to exit is the PhotoSwipe pattern.

## Outcome

The result is the design summarised in [DDR-0002](../../../docs/decisions/ddr/0002-entity-view-fixed-frame-and-board.md) and specified in [docs/design/entity-view.md](../../../docs/design/entity-view.md): a fixed frame over an authored board on a 12-column square grid, tools in a right drawer, and edge pull to a neighbouring entity.

## Next

Not yet tried: a direct slide between entity views instead of a camera flight through the field, and per-user testing of the edge-pull gesture on touch devices. Either would be a new experiment and, if adopted, a new DDR that supersedes DDR-0002 in part.
