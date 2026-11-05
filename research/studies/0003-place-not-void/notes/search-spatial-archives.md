# Desk search: spatial archives and collections

Gathered for [STU-0003](../README.md). Search 2026-11-04, readings 2026-11-05.
Extent: search snippets and secondary write-ups; Whitelaw read in part.

These are working notes from a model-assisted reading pass, kept as gathered. The study README holds the checked notes and wins any disagreement. Check quotes against the source before quoting them elsewhere.

---

**Annotated list (14)**

1. **Dataland / Spatial Data Management System**, Bolt and Negroponte, MIT Architecture Machine Group, 1977-79. A flat zoomable field where items sat as pictures (letters, maps, phone) grouped on distinct colour backgrounds. Bolt's line is "Dataland is not a map of data. It is the data." *Move:* group by background colour and place, not by borders or labels. Place does the indexing, as on a desk. https://mprove.de/visionreality/text/3.1.7_sdms.html (the quote comes from a secondary source).

2. **Aspen Movie Map**, Lippman, Naimark, Mohl et al., MIT, 1978-81. Filmed every street at 10-foot intervals, and the viewer picks a direction at each intersection. *Move:* movement is stepwise and tied to real places, so a path is a sequence of decisions at junctions. This suits "journeys". The page says nothing about how transitions or orientation worked. https://www.media.mit.edu/articles/aspen-movie-map/

3. **Information Landscapes**, Muriel Cooper with Small, Ishizaki and Strausfeld, MIT Visible Language Workshop, TED5 1994. Text and data laid out as navigable 3D typographic space. *Move:* the content is the architecture (type is the surface), and scale changes keep context. Found via search and not opened. http://inventinginteractive.com/2010/02/01/information-landscapes/

4. **Pad / Pad++**, Perlin and Fox (1993); Bederson and Hollan (1994). An infinite plane where every object has x, y and a scale. Objects redraw differently at different scales ("semantic zooming"). *Move:* depth as scale. Zooming in swaps the rendering (poster, then detail, then full piece), not just its size. http://www.cs.columbia.edu/graphics/courses/csw4170/resources/bedersonHollanUIST94.pdf

5. **Data Mountain**, Robertson et al., Microsoft Research, 1998. Thumbnails placed freely on a tilted plane with passive landmarks, built to use spatial memory. *Move:* give the ground a texture and a slope, with fixed landmarks, so placement is memorable. The UBC lecture notes name "multiscale desert fog" (no navigation cues) as the failure mode. https://www.microsoft.com/en-us/research/wp-content/uploads/1998/01/p153-robertson.pdf and https://www.cs.ubc.ca/~tmm/courses/533-09/slides/nav.pdf

6. **Generous Interfaces** (Whitelaw, DHQ 2015) and his Manly Images, Australian Prints and Printmaking, and Discover the Queenslander. Tiled overviews of a whole collection, with detail opening inside the overview. *Move:* the whole collection is visible on arrival, and each tile slowly cycles through its contents. I read the article (the last ~9k characters were unread). https://dhq.digitalhumanities.org/vol/9/1/000205/000205.html

7. **Photogrammar**, Tilton and Wexler (Yale), now Richmond, rebuilt 2020. About 170k FSA photographs shown in linked map, timeline and image views that update together. *Move:* keep one persistent frame (place and time) as the orientation device across every view. https://arxiv.org/html/2009.02242v1 (found, not opened).

8. **Curator Table** (Diagne and Doury, 2017) and **t-SNE Map** (Diagne, Barradeau and Doury, 2018), Google Arts & Culture. Artworks are laid out in 3D by visual similarity, using no metadata. *Move:* position carries meaning, so near means similar. The Curator Table page does not explain the camera or the grouping, so that part is unverified. https://experiments.withgoogle.com/curator-table

9. **Photosynth / Photo Tourism**, Agueera y Arcas, Snavely et al., 2006-08. Photos are placed at their real camera positions in a 3D model, and you move between them. *Move:* a cross-fade between neighbouring images that share a view feels like moving through space, not like loading. Found, not opened. https://en.wikipedia.org/wiki/Photosynth

10. **Cooper Hewitt collections site**, Chan and Cope, 2012. Persistent URLs for everything, with browsing by colour, by decade and at random. *Move:* give several non-search ways in, and make the data open. Colour browsing became one of the most popular functions. https://labs.cooperhewitt.org/2012/online-collection-alpha/

11. **Bilderatlas Mnemosyne**, Warburg, 1925-29. Photos clipped to black-cloth panels, with meaning made by juxtaposition. Gombrich found it too diffusely structured to publish. The 2020 HKW reconstruction lit only the panels in a dark room. *Move:* the panel is the unit of composition, and a dark room works only when what is lit is relational and composed. https://kunstkritikk.com/mnemosyne-lost/

12. **Le Musee imaginaire**, Malraux, 1947-54. Photographs spread on his salon floor, seen from above and arranged non-hierarchically (Jarnoux photo, Paris Match, 1954, per Grasskamp). *Move:* the table (a plan view) is a legitimate curation mode, with the dimension shifted from 3D to 2D. https://iucat.iu.edu/iub/17415749

13. **Camillo's Theatre of Memory / method of loci**, Yates 1966. A tiered amphitheatre in which the visitor stands in the centre and looks out and up at images placed in fixed loci. *Move:* an architecture of fixed positions that you return to. It was never built, and is known only from descriptions. https://monoskop.org/images/b/be/Yates_Frances_A_The_Art_of_Memory.pdf

14. **Sir John Soane's Museum** (Soane, 1792-1837), with **Wunderkammer** (Ole Worm, 1655). The Picture Room has hinged panels that open to reveal further layers and a sightline down into the Monk's Parlour. The Breakfast Room uses coloured toplight and over 100 mirrors. Worm's cabinet uses the ceiling, walls and drawers as separate zones. *Move:* hidden layers, vertical sightlines and light as the ordering device. Secondary sources only. https://19.bbk.ac.uk/article/id/4705/ and https://www.cabinet.ox.ac.uk/museum-wormianum-1655

**Not found / not verified:** Searches for contemporary "credibly good" spatial portfolio or archive sites returned only gimmick-end 3D portfolios (Bruno Simon style) and template pitches. I could not verify Are.na or Cosmos as spatial. I did not find Local Projects' case study for the Cleveland ArtLens Wall (a 40-foot touch wall of the on-view collection), so it is not in the list. The Cooper Hewitt Immersion Room (Local Projects) was found but dropped because it is a physical room.

**Cross-cutting lessons**

1. **A void with floating cards fails because nothing is fixed.** Dataland, Data Mountain and the Movie Map all give the user something stable: a coloured or textured ground, landmarks, or real streets. A black void with posters is "multiscale desert fog" by definition.
2. **Position must mean something.** Dataland (desk logic), Curator Table (similarity), Photogrammar (place and time), Warburg (juxtaposition) and Camillo (fixed loci) all assign meaning to where an item sits. Arbitrary depth placement carries no information.
3. **Depth should change what you see, not just how big it is.** Pad++ semantic zoom and Whitelaw's overview-to-detail both change the rendering with distance, so approaching an entity reveals more of it.
4. **Orientation needs a persistent frame and an overview.** Whitelaw, Photogrammar and Pad++ keep the overview present while you move into detail. Dark rooms only work when what is lit is composed (Warburg).
5. **Transitions should be movement, not loading.** Photosynth and the Movie Map move between real neighbouring views at spatial intervals. A fade between two unrelated states reads as a swap.
