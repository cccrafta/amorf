# Desk search: games and the spatial web

Gathered for [STU-0003](../README.md). Search 2026-11-04, readings 2026-11-05.
Extent: search snippets and secondary write-ups.

These are working notes from a model-assisted reading pass, kept as gathered. The study README holds the checked notes and wins any disagreement. Check quotes against the source before quoting them elsewhere.

---

**Annotated list**

1. **"Game Design as Narrative Architecture"**, Henry Jenkins, 2004. Spatial stories are evoked, enacted, embedded or emergent. For amorf: a curated space should embed its story in the layout, so that moving through it enacts the curation, and nothing needs a caption. https://paas.org.pl/wp-content/uploads/2012/12/09.-Henry-Jenkins-Game-Design-As-Narrative-Architecture.pdf (found via search, summary only, not opened). Don Carson on environmental storytelling: not verified.

2. **An Architectural Approach to Level Design**, Christopher Totten, 2014 (2nd ed. 2019). It covers compression and release, prospect-refuge, and Scarpa's Castelvecchio, whose openings between galleries tempt you on by hiding what lies beside them. For amorf: put a low, narrow, dim entry before each space and open into height and light, with the next entity glimpsed through an opening. https://www.corentin.xyz/book/architectural-level-design.html (reading notes). "Lures" as a Totten term: not verified. The Disney "weenie" (a distant landmark) is the standard term. https://book.leveldesignbook.com/process/blockout/wayfinding

3. **Journey**, thatgamecompany, 2012. Early big environments felt boring because progress was hard to measure, so the team added dunes and sand trails and a mountain visible from the start. For amorf: give every space one far landmark and a ground that records the visitor's passage, which fits the journeys feature. https://journey-archive.fandom.com/wiki/User_blog:JAlbor/GDC_2013:_Designing_Journey_with_Jenova_Chen (fan write-up of the GDC talk, not the talk itself)

4. **First-Person Walkers study**, 2016, covering Gone Home, Dear Esther, Proteus and The Stanley Parable. In all of them movement speed is fixed and slow. For amorf: cap the speed and keep acceleration smooth, so the pace itself carries the temporal experience. https://www.researchgate.net/publication/307546773_First-Person_Walkers_Understanding_the_Walker_Experience_through_Four_Design_Themes. Reviews of Dear Esther and Rapture also call the slow pace tedious when you double back, so offer a way to skip ahead.

5. **Gone Home**, Fullbright, 2013. Steve Gaynor's GDC 2015 talk covers level design, with light used to mark the path and rooms that change when you return. For amorf: grey-box the flow first, and put light, not UI, where the visitor should look next. https://gdcvault.com/play/1022112 (talk not watched; details come from secondary summaries)

6. **The Witness**, Jonathan Blow, 2016. A central mountain is visible from everywhere on the island, and the vistas are crossed without music. For amorf: one fixed, visible landmark keeps orientation steady while the visitor moves freely. https://en.wikipedia.org/wiki/The_Witness_(2016_video_game)

7. **Proteus**, Ed Key and David Kanaga, 2013. Every visual element has its own sound, so the mix depends on proximity. For amorf: position each entity's sound in the space, so that walking toward something makes it audible before it is visible. https://www.gamedeveloper.com/audio/the-sound-and-music-of-proteus---an-academic-case-study (found via search, not opened)

8. **Everybody's Gone to the Rapture**, The Chinese Room, 2015. Drifting lights and wind-carried sound lead you on, and the slow walking pace is deliberate. For amorf: use sound or light drift as a lure instead of an arrow. https://www.gamespot.com/reviews/everybodys-gone-to-the-rapture-review/1900-6416215/. Keogh criticised telling guide orbs apart from trigger orbs, so the two roles need distinct looks.

9. **Kentucky Route Zero**, Cardboard Computer, 2013 to 2020. Scenes are staged like theatre, with cutaway buildings, parallax and camera moves, and many liminal places such as caves and gas stations. For amorf: do the threshold as a camera move and a change in staging, not a fade. https://www.gamesradar.com/the-making-of-kentucky-route-zero/

10. **Occupy White Walls**, StikiPixels, 2020. Players build and curate galleries, and where the reception desk goes sets where visitors start. For amorf: the table-to-space conversion should include choosing an arrival point. https://www.gameshub.com/news/features/occupy-white-walls-is-democratising-art-with-video-games-build-your-own-gallery-20702/. Whether it is still running: not verified.

11. **Bruno Simon's portfolio (Folio 2025)**, 2025. The whole world is built in Blender with Three.js and Rapier physics, and the author avoided HTML UI to keep it immersive. For amorf: author the spaces in Blender and use WebGL, with grass, weather and day and night cycles doing the work of making it a place. https://www.awwwards.com/brunos-portfolio-case-study.html

12. **Active Theory and Lusion**. Active Theory renders each scene to an offscreen target and composites the scenes for transitions between worlds. Lusion's site prerenders offline and drives a real-time camera from the exported path. For amorf: one canvas holding the field and the spaces gives you a continuous camera move across a threshold. https://tympanus.net/codrops/2026/02/23/composite-rendering-the-brilliance-behind-inspiring-webgl-transitions/ and https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html

13. **visionOS "Principles of spatial design"**, Apple, WWDC23. Use subtle depth, keep text flat, and give immersive scenes a ground plane under the viewer. For amorf: show the ground and the viewer's eye height in the first frame. https://developer.apple.com/videos/play/wwdc2023/10072/. Specific distances and angles I found are third-party and unconfirmed.

14. **Cybersickness and desktop simulations**, Bos et al., c. 2008. Field of view and navigation both correlate with cybersickness on desktop. For amorf: keep the camera field of view fixed and avoid head-bob. https://www.researchgate.net/publication/224883419_Cybersickness_and_desktop_simulations_Field_of_view_effects_and_user_experience. Results not read. A 2024 ACM interview study names first-person view, field of view, bobbing and motion blur as triggers.

Not verified, so I dropped them: Myst, Tacoma, Google "Infinite", and the research on visionOS ergonomics numbers. Mozilla Hubs shut down in May 2024 and its code lives on as a community edition. https://roadtovr.com/mozilla-hubs-shutdown-web-xr/

**Cross-cutting lessons**

1. **Why floating cards in a void fail.** The depth cues are missing: no ground, no horizon, no cast shadow, no haze. Shadow offset and blur are the main cues for distance from a surface. Virtual-museum research agrees: tours with no architecture of attention read as a 3D menu. https://momaa.org/the-metaverse-museum-problem-why-virtual-galleries-fail-to-matter/ and https://arxiv.org/pdf/2310.11176
2. **A felt threshold is a change of state, not a fade.** In games and architecture it is compression then release: a narrow, dim, quiet passage that opens into height and light. The sound changes and the camera is steered through the opening. Journey, Kentucky Route Zero and Castelvecchio all do this. A cross-fade reads as loading because nothing changes spatially.
3. **Pace is the main design tool.** Walkers fix a slow speed, a far landmark gives direction, and sound or light leads the visitor on.
4. **A space needs a destination, a ground and a place to start.** Journey's mountain, The Witness's central peak and Occupy White Walls' chosen reception desk all do this.
5. **DOM/CSS 3D vs WebGL.** CSS 3D is fine for a handful of flat panels. It has no lighting, no shadows and no depth-buffer contract, so intersecting planes sort unreliably. The cues above (contact shadow, haze, light direction, an authored ground) need WebGL. Sources: https://raw.org/software/graphics/introduction-to-css-3d-transforms/ (tutorial-grade, no benchmarks). Keep DOM for text and accessibility, with WebGL under it.
