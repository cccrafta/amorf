---
id: STU-0003
title: What makes a navigable digital environment a place and not a void
date: 2026-11-04
status: running
parts: [field, space, journey]
question: What do architecture, perception theory, spatial archives and games use to make a moving visitor feel they are in a place, and a threshold felt rather than a fade?
sources:
  - "Gordon Cullen, Townscape (1961)"
  - "Kevin Lynch, The Image of the City (1960)"
  - "James J. Gibson, The Ecological Approach to Visual Perception (1979)"
  - "H. A. Sedgwick, J. J. Gibson's Ground Theory of Space Perception, i-Perception 12(3) (2021)"
  - "E. Bruce Goldstein, The Ecology of J. J. Gibson's Perception, Leonardo 14(3) (1981)"
  - "Fumihiko Maki, Japanese city spaces and the concept of oku, Japan Architect 265 (1979)"
  - "Ji Cheng, Yuan Ye (c. 1631)"
  - "Stavroulaki and Peponis, The spatial construction of seeing at Castelvecchio, SSS4 (2003)"
  - "Christopher Alexander et al., A Pattern Language (1977), patterns 112 and 127"
  - "Yi-Fu Tuan, Space and Place (1977)"
  - "Bernard Tschumi, The Manhattan Transcripts (1976-81)"
  - "Michael Benedikt, To take hold of space: isovists and isovist fields (1979)"
  - "Juhani Pallasmaa, The Eyes of the Skin (1996)"
  - "Steven Holl, Questions of Perception (1994)"
  - "Peter Zumthor, Atmospheres (2006)"
  - "Bolt and Negroponte, Spatial Data Management System / Dataland, MIT (1977-79)"
  - "Lippman et al., Aspen Movie Map, MIT (1978-81)"
  - "Muriel Cooper et al., Information Landscapes, MIT VLW (1994)"
  - "Bederson and Hollan, Pad++ (1994)"
  - "Robertson et al., Data Mountain, Microsoft Research (1998)"
  - "Mitchell Whitelaw, Generous Interfaces for Digital Cultural Collections, DHQ 9.1 (2015)"
  - "Tilton and Wexler, Photogrammar (2020)"
  - "Google Arts & Culture, Curator Table (2017) and t-SNE Map (2018)"
  - "Snavely et al., Photo Tourism / Photosynth (2006-08)"
  - "Cooper Hewitt online collection (2012)"
  - "Aby Warburg, Bilderatlas Mnemosyne (1925-29)"
  - "André Malraux, Le Musée imaginaire (1947-54)"
  - "Frances Yates, The Art of Memory (1966), on Camillo's theatre"
  - "Sir John Soane's Museum (1792-1837); Ole Worm, Museum Wormianum (1655)"
  - "Henry Jenkins, Game Design as Narrative Architecture (2004)"
  - "Christopher Totten, An Architectural Approach to Level Design (2014)"
  - "thatgamecompany, Journey (2012)"
  - "First-Person Walkers: four design themes (2016)"
  - "Fullbright, Gone Home (2013)"
  - "Jonathan Blow, The Witness (2016)"
  - "Ed Key and David Kanaga, Proteus (2013)"
  - "The Chinese Room, Everybody's Gone to the Rapture (2015)"
  - "Cardboard Computer, Kentucky Route Zero (2013-20)"
  - "StikiPixels, Occupy White Walls (2020)"
  - "Bruno Simon, portfolio (2025); Active Theory; Lusion"
  - "Apple, Principles of spatial design, WWDC23"
  - "Bos et al., Cybersickness and desktop simulations (c. 2008)"
deductions:
  - "A place needs a ground: entities stand on a textured, receding ground and occlude one another."
  - "Position must mean something; placement by id hash carries no information."
  - "Each space needs a landmark visible from afar and an edge."
  - "Conceal, then reveal: a space is never shown whole on arrival; the next is glimpsed through an opening."
  - "A threshold is compression then release across several channels over a distance, not a fade."
  - "Pace is designed: slow, fixed movement, with a way back."
  - "The journey can be drawn on the ground of the space itself."
raises: [EXP-0006]
tags: [promenade-architecturale, wayfinding, threshold, spatial-interface, level-design]
media: []
publish: false
case_study: null
updated: 2026-11-05
last_verified: 2026-11-05
---

# STU-0003: What makes a navigable digital environment a place and not a void

## Question

The first round of [EXP-0006](../../experiments/0006-thresholds-between-spaces/README.md) turned a curation into a walkable space and it failed. The designer's verdict was "ugly, not good enough spatially". It read as the same black void with fewer flat cards facing the viewer, a faint fog tint, and a fade that felt like loading. The field is a large part of amorf, so the question is wider than one prototype: what do other disciplines use to make a moving visitor feel they are *somewhere*, and a crossing felt? It serves the [field](../../theory/ontology/field.md), [space](../../theory/ontology/space.md) and [journey](../../theory/ontology/journey.md), and extends [STU-0001](../0001-promenade-architecturale/README.md).

## Sources

First pass on 2026-11-04, three parallel desk searches: architectural and perceptual theory, digital and historical precedents, games and the spatial web. **Most notes below come from search snippets and secondary write-ups.** Treat their quotes as unverified until checked against the source.

Read in full on 2026-11-05, and the notes for them rewritten:

- **Gibson.** The 1979 book: chapter 5 (the ambient optic array), chapter 8 (affordances) and chapter 11 (the occluding edge). Not read: chapters 7 and 9. The 1950 book is borrow-only, so his 1950 claims come through Sedgwick (2021, read about 90%), and the three books are summarised by Goldstein (1981, read about 80%). Wording quoted via Sedgwick needs checking against his paper before it is quoted elsewhere.
- **Cullen.** The introduction of *The Concise Townscape* (pp. 7-19) in full. The named devices are known from secondary sources only.
- **Stavroulaki and Peponis (2003)**, pp. 66.1-66.14 in full, with Rab's ACSA paper on Castelvecchio's thresholds alongside.

Partly read: Whitelaw (2015). Still to read: Robertson on Data Mountain, Totten.

Files in this folder:

- `notes/`: the working notes behind this page, kept as gathered. Three desk searches (`search-*.md`) and three full readings (`reading-gibson.md`, `reading-cullen.md`, `reading-castelvecchio.md`). This page wins any disagreement with them.
- `sources/`: local copies of the texts read in full (Gibson 1979 excerpts, Goldstein 1981, Cullen preview, Stavroulaki and Peponis 2003). They are copyrighted, so the folder is gitignored and exists only on the machine that fetched them; the links in Notes are the public way back to each.

## Notes

What the sources say, grouped by strand. My reading is kept apart in italics.

### Architecture and perception

- **Gibson, ground theory (1950, 1979).** Read in full; see Sources for the extent.
  - There is no perception of space without a continuous background surface (1950, p. 6, via Sedgwick). Objects on their own do not make visual space. In 1979: "The ground is quite literally the basis of the behavior of land animals" (ch. 8).
  - The texture gradient measures as well as recedes. Equal amounts of texture mean equal extent, so two objects that cover the same number of texture units at their base are the same size, with no distance estimate needed (1950, pp. 138-141; Goldstein).
  - Contact comes first. An object's distance is given by where its base meets the ground (1950, pp. 77 and 178). A floating object is ambiguous in size and distance.
  - Eye height is the scale. Everything standing on the ground is cut by the horizon at eye height, so the horizon gives relative size without distance. The horizon ratio itself is Sedgwick's (1973), building on Gibson.
  - Occlusion is reversible. Moving, an edge deletes the surface behind it on one side and accretes it on the other, and moving back undoes this exactly (1979, ch. 5). The same texture seen on both sides of an edge tells you the ground continues behind it.
  - "To go from one place to another involves the opening up of the vista ahead and closing in of the vista behind" (1979, ch. 11).
  - A bare plain is "a desolate environment indeed": the earth affords standing and walking, and "the furniture of the earth affords all the rest" (1979, ch. 5).
  - Moving straight ahead, texture flows outward from the point you head for, the focus of expansion, and flow is fastest just below the viewer (1947, p. 192; Goldstein).
  ([Goldstein](https://classes.matthewjbrown.net/teaching-files/ccc/goldstein-gibson.pdf), [Sedgwick](https://pmc.ncbi.nlm.nih.gov/articles/PMC8334293/))
- **Cullen, *Townscape* (1961), serial vision.** Read pp. 7-19 in full.
  - A walk is revealed "in a series of jerks or revelations". It is a sequence of an existing view and an emerging view (p. 9).
  - Cullen assumes the walker moves at a uniform speed. The revelation is a change in what is hidden and shown at a turn, not a change of pace or a blend between pictures (p. 9).
  - The straight road is monotonous because its view is "soon digested" (p. 9).
  - Positing a HERE creates a THERE, and "you cannot have one without the other" (p. 10). The urban scene is a drama of "exposures and enclosures, of constraint and relief".
  - At Rashtrapati Bhawan, "the building is withheld" on the approach.
  - Named devices, known from secondary sources only: narrows, deflection, closure, anticipation, the maw (p. 52), punctuation, pinpointing and truncation.
  ([preview](https://api.pageplace.de/preview/DT0400.9781136020902_A23833734/preview-9781136020902_A23833734.pdf))
- **Lynch, *The Image of the City* (1960).** A legible place has paths, edges, districts, nodes and landmarks. ([chapter](https://www.taylorfrancis.com/chapters/edit/10.4324/9780203094235-16/image-environment-city-image-elements-kevin-lynch))
- **Maki, *oku* (1979).** The innermost core of a Japanese space is reached through layers, like an onion; depth is the number of passages, not distance. ([secondary](https://aliceblogs.ch/the-concept-of-japanese-space-and-the-nature-of-the-teahouse-oku/))
- **Ji Cheng, *Yuan Ye* (c. 1631).** Views are linked in sequence, alternately hidden and leaked, and the whole is never seen at the start. Moon gates and lattice windows frame the next space before you enter it. ([Jones](https://www.fus.edu/intervalla-files/vol5/2_jones.pdf))
- **Scarpa, Castelvecchio (1957-64)**, read by Gianna Stavroulaki and John Peponis (2003). Read in full.
  - Scarpa moved the entrance to a corner, so the rooms form one linear sequence (66.12).
  - The statues form a "field of gazes". Of 19 statues, 12 face toward the axis. Their gazes cross the route and meet at empty points, so the statues relate to one another, not only to the visitor (66.3, 66.13).
  - The frontal view is rationed. At the threshold of the second room the visitor gets an overview with no frontal view of any statue. The Cangrande is seen face-on once.
  - Paintings hang near door edges, so they are seen far off on entering and close up on leaving. Easels face away, so their backs are seen first.
  - The floor floats: it stops short of the old walls, and strips with converging edges show depth (66.11).
  - The paper's thresholds are about what becomes visible, not about compression and release.
  - On surface: Rab documents one threshold in detail, a cascade of Prun stone. A paving joint at every crossing is not in either source.
  ([paper](https://www.spacesyntax.net/symposia-archive/SSS4/fullpapers/66Stavroulaki-Peponis.pdf))
- **Alexander, Entrance Transition (pattern 112).** A transition is "marked with a change of light, sound, direction, surface, level ... above all a change of view". Intimacy Gradient (127) orders a space from public to private. ([112](https://www.patternlanguageindex.com/patterns/entrance-transition))
- **Tuan, *Space and Place* (1977).** Undifferentiated space becomes place as we come to know it and give it value; "place is pause". ([secondary](https://readingandwalking.ca/2019/02/02/20-yi-fu-tuan-space-and-place-the-perspective-of-experience/))
- **Tschumi, *The Manhattan Transcripts* (1976-81)**, with Halprin's Motation and Thiel's notation. Space, movement and event are notated separately and superimposed. ([MoMA](https://www.moma.org/collection/works/19))
- **Benedikt, isovists (1979); Hillier and Hanson (1984).** An isovist is everything visible from one point. Depth in space syntax is the number of spaces passed through. ([paper](https://www.semanticscholar.org/paper/To-Take-Hold-of-Space:-Isovists-and-Isovist-Fields-Benedikt/36184babf449e1524af4d8eaf71e56dcf05bc659))
- **Pallasmaa (1996).** Deep shadow makes depth ambiguous and invites peripheral vision and touch. **Holl (1994):** architecture is experienced as partial views joining foreground, middle ground and distance. **Zumthor (2006):** atmosphere comes from material, sound, temperature and light.

*Reading: the theory agrees on four things the prototype lacked. A ground to stand on, which entities touch (Gibson). An enclosure around the viewer, because a here is what makes a there (Cullen). Partial concealment, so the next thing is glimpsed, not shown (Ji Cheng, Holl, Maki, Cullen's withheld building). And a threshold that changes several channels over a distance (Alexander). The fade changed one channel, opacity, in no distance at all.*

*Read in full, Gibson and Cullen both say why the fade failed. Cullen's walker moves at a steady speed and the revelation comes from geometry: something stops hiding something else. Gibson's occlusion is the same event seen from perception, and it is reversible. A cross-fade is neither; nothing hides anything.*

*Castelvecchio's lesson is less about the threshold than about the objects. The statues are placed to look at each other across the route, and the visitor walks through their relations. That is position with meaning (deduction 2) made by the curator, which is what the table is.*

*Scarpa's floor stopping short of the old walls is the manifesto's "honest joinery" made literal: new and old meet at a visible gap. The one documented threshold (Prun stone) is a change of surface.*

### Spatial archives and collections

- **Dataland, MIT Architecture Machine Group (1977-79).** Items sat as pictures on a flat zoomable field, grouped by coloured backgrounds. Bolt: "Dataland is not a map of data. It is the data." ([page](https://mprove.de/visionreality/text/3.1.7_sdms.html))
- **Aspen Movie Map (1978-81).** Streets filmed every ten feet; the viewer chooses a direction at each junction. ([MIT](https://www.media.mit.edu/articles/aspen-movie-map/))
- **Pad++ (1994).** Every object has a position and a scale and redraws differently at different scales: semantic zooming. ([paper](http://www.cs.columbia.edu/graphics/courses/csw4170/resources/bedersonHollanUIST94.pdf))
- **Data Mountain (1998).** Thumbnails placed freely on a tilted, textured plane with fixed landmarks, built to use spatial memory. A UBC lecture names the failure it avoids "desert fog": a space with no navigation cues. ([paper](https://www.microsoft.com/en-us/research/wp-content/uploads/1998/01/p153-robertson.pdf), [slides](https://www.cs.ubc.ca/~tmm/courses/533-09/slides/nav.pdf))
- **Whitelaw, *Generous Interfaces* (2015).** Show the whole collection on arrival, open detail inside the overview, and let tiles cycle through their contents. ([DHQ](https://dhq.digitalhumanities.org/vol/9/1/000205/000205.html))
- **Photogrammar (2020).** Map, timeline and image views stay linked, so place and time stay as the orientation frame. **Curator Table / t-SNE Map (2017-18):** works placed in 3D by visual similarity, so near means alike. **Photosynth (2006-08):** a cross-fade between photos taken from neighbouring positions reads as movement, because the two views share a space.
- **Warburg, *Mnemosyne* (1925-29).** Photographs pinned to black panels, meaning made by juxtaposition. The 2020 reconstruction lit only the panels in a dark room. ([Kunstkritikk](https://kunstkritikk.com/mnemosyne-lost/))
- **Malraux, *Le Musée imaginaire* (1947-54).** Photographed laying reproductions out on his floor, seen from above. **Camillo's memory theatre** (Yates 1966): the visitor stands at the centre of a tiered theatre, facing images in fixed places. **Soane's Museum:** hinged panels open onto further layers; sightlines run down between floors; coloured toplight and mirrors order the rooms.

*Reading: the black void with floating posters is "desert fog" by name. Every working precedent fixes something: a ground, a landmark, a background, a street. Every one also gives position a meaning (desk logic, similarity, place and time, juxtaposition). amorf's field places entities by a hash of their id, so position means nothing; that alone may explain why it feels empty.*

*Malraux on his floor is the table: the plan view is a legitimate way to curate, not a lesser one. Warburg shows a dark room works only when what is lit is composed.*

*Semantic zoom answers part of the thumbnail question: approaching an entity could change what it shows, not only its size.*

### Games and the spatial web

- **Jenkins (2004).** Spatial stories are evoked, enacted, embedded or emergent. ([PDF](https://paas.org.pl/wp-content/uploads/2012/12/09.-Henry-Jenkins-Game-Design-As-Narrative-Architecture.pdf))
- **Totten (2014).** Compression and release, prospect and refuge; uses Castelvecchio as a level-design case. A distant landmark that draws the player on is the "weenie", a Disney term. ([notes](https://www.corentin.xyz/book/architectural-level-design.html), [Level Design Book](https://book.leveldesignbook.com/process/blockout/wayfinding))
- **Journey (2012).** Early wide environments were boring because progress was unreadable. The team added dunes, trails left in the sand and a mountain visible from the start. ([GDC write-up](https://journey-archive.fandom.com/wiki/User_blog:JAlbor/GDC_2013:_Designing_Journey_with_Jenova_Chen))
- **First-person walkers** (Gone Home, Dear Esther, Proteus, The Stanley Parable). Movement is slow and fixed in speed. Slowness becomes tedious when doubling back. ([study](https://www.researchgate.net/publication/307546773_First-Person_Walkers_Understanding_the_Walker_Experience_through_Four_Design_Themes))
- **The Witness (2016):** a central mountain visible from everywhere. **Gone Home (2013):** light, not interface, marks where to look next. **Proteus (2013):** every element has its own sound, so you hear things before you see them. **Everybody's Gone to the Rapture (2015):** drifting light and sound lead the visitor on.
- **Kentucky Route Zero (2013-20).** Scenes staged like theatre, with cutaway buildings and parallax; thresholds are camera moves and changes of staging. ([GamesRadar](https://www.gamesradar.com/the-making-of-kentucky-route-zero/))
- **Occupy White Walls (2020).** Players build galleries; placing the reception desk sets where visitors arrive.
- **Bruno Simon (2025), Active Theory, Lusion.** Worlds authored in Blender and rendered in WebGL. Active Theory renders scenes offscreen and composites them, so one camera move crosses between worlds. ([Codrops](https://tympanus.net/codrops/2026/02/23/composite-rendering-the-brilliance-behind-inspiring-webgl-transitions/))
- **Apple, Principles of spatial design (2023).** Keep depth subtle, keep text flat, give immersive scenes a ground under the viewer. ([WWDC](https://developer.apple.com/videos/play/wwdc2023/10072/))
- **Bos et al. (c. 2008).** Field of view and navigation style both affect cybersickness on desktop. Fixed field of view and no head-bob are the safe defaults.
- **CSS 3D against WebGL.** CSS 3D transforms have no lighting, no shadows and no depth buffer, so overlapping planes sort unreliably (tutorial-grade source). Contact shadows, haze, directional light and an authored ground need WebGL. Text and accessibility can stay in the DOM over it.

*Reading: games name the same moves as the architects (compression and release, landmark, lure) and add pace: a fixed, slow speed carries the temporal experience. Journey's trail in the sand is a journey drawn on the ground, which amorf already records but draws only as a line overlay.*

*The rendering note is a hard constraint, not a taste: the field is DOM and CSS 3D today, and the cues every strand asks for (ground, shadow, light, haze, occlusion) are the ones that medium cannot draw.*

## Deductions

**Held on 2026-11-05:** 1, 2, 3, 4, 5, 8 and 9, copied into the field, space and journey hubs. Later the same day, after the full readings, 11, 12 and 13 were held too (field and space hubs); the owner left the choice to me. The others (6, 7, 10) stay candidates. Each is traceable to a note above:

1. **A place needs a ground.** Entities should stand on a textured ground that recedes, and occlude one another (Gibson, Data Mountain, Apple). The void is the absence of ground.
2. **Position must mean something.** Placement by id hash carries no information; precedents place by desk logic, similarity, place and time, or juxtaposition (Dataland, Curator Table, Photogrammar, Warburg).
3. **Each space needs a landmark and an edge.** One thing visible from far off, and a bound (Lynch, Journey, The Witness).
4. **Conceal, then reveal.** Never show a space whole on arrival; glimpse the next through an opening (Cullen, Ji Cheng, Maki, Holl, Totten).
5. **A threshold is compression then release, across several channels, over a distance.** Light, sound, surface, direction and view change in a short passage; a fade is not a threshold (Alexander, Totten, Kentucky Route Zero; Cullen's "constraint and relief"; Scarpa for the change of surface at one threshold). Castelvecchio does not support the compression part; its thresholds are about visibility.
6. **Entities angle to the route, not to the screen** (Scarpa, Choisy in STU-0001). Castelvecchio sharpens this: entities face each other across the route, and a face-on view is given once (see 13).
7. **Approach changes what an entity shows**, not only its size (Pad++, Whitelaw).
8. **Pace is designed.** Fixed, slow movement with a way to skip back (first-person walkers).
9. **The journey can be drawn on the ground**, as a trace in the space itself (Journey).
10. **The ground, shadow, light and haze these moves need cannot be drawn in DOM and CSS 3D**; they need WebGL under a DOM text layer (games and spatial web strand). This is a technology choice and would need an ADR.

Candidates added on 2026-11-05 from the full readings:

11. **Reveal by occlusion at a steady pace, never by blending.** What appears is uncovered by nearer things as the visitor moves, and moving back covers it again exactly (Cullen p. 9, Gibson 1979 ch. 5 and 11). This is the mechanism behind 4 and 5.
12. **Every entity touches the ground, and the camera stays at one eye height.** A base on the ground or a cast shadow gives distance and size; a fixed eye height makes the horizon a scale (Gibson 1950, Sedgwick). A bare ground is itself a void, so the space needs its furniture (Gibson 1979 ch. 5).
13. **Entities relate to each other, not only to the visitor.** Arranged so their faces meet across the route, they form a field the visitor walks through; the face-on view is earned once (Castelvecchio, 66.3 and 66.13). On the table, this is what the curator's arrangement could carry into the space.

Deductions 1, 2, 4, 5 and 11 bear directly on why round 1 of EXP-0006 failed.

## Next

- Read Data Mountain and Totten in full before building again.
- Check the 1950 wording quoted via Sedgwick against his paper before quoting it elsewhere.
- Decide on deduction 10 (WebGL) before a second round of EXP-0006; it changes what can be built.
- Revise EXP-0006 for round 2 on the held deductions, or open a new experiment if the question changes.
