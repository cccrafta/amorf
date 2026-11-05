# Reading: Gibson's ground theory

Gathered for [STU-0003](../README.md). Search 2026-11-04, readings 2026-11-05.
Extent: Gibson 1979 chapters 5, 8 and 11 in full; 1950 via Sedgwick 2021; Goldstein 1981.

These are working notes from a model-assisted reading pass, kept as gathered. The study README holds the checked notes and wins any disagreement. Check quotes against the source before quoting them elsewhere.

---

**Sources and how much I read**
1. goldstein-gibson.pdf: E. Bruce Goldstein, "The Ecology of J. J. Gibson's Perception", Leonardo 14(3), 1981, pp. 191-195. It is a review of Gibson, not Gibson himself. It is a scanned PDF, but a text layer extracted with pdftotext. I read about 80% in full; the rest is critique. It is useful as a summary of all three Gibson books, with page cites into them.
2. Gibson 1950: NOT freely readable. archive.org "perceptionofvisu0000gibs" is borrow-only (DRM, OCR text private). I did not circumvent that. Substitute: Sedgwick 2021, "J. J. Gibson's Ground Theory of Space Perception" (i-Perception 12(3), open access, PMC8334293). I read about 90% (the last ~26k characters, probably references, were skipped). All 1950 and 1947 wording below is Sedgwick quoting Gibson. The fetch tool partly reconstructed those quotes, so check wording against the paper before putting it in quotation marks.
3. Gibson 1979: read directly from the Classic Edition excerpt (44 pp.: ch. 5 "The Ambient Optic Array", ch. 11 "The Discovery of the Occluding Edge"), plus ch. 8 "Affordances" from a Brown CS137 course reading. Not read: ch. 7 (horizon, texture) and ch. 9 (experiments). The optic-flow material comes from Goldstein and from Niehorster 2021 and Warren 2009 summaries, not from the 1979 text.

**Gibson's claims relevant to the field**
- Ground is the basis of space: "literally no such thing as a perception of space without the perception of a continuous background surface" (1950, p. 6, via Sedgwick). Also "an array of objects by themselves does not make up visual space" (1947, pp. 185-6). The 1979 ch. 8 says "The ground is quite literally the basis of the behavior of land animals. And it is also the basis of their visual perception".
- Texture gradient: density, deformation and skew (1950, pp. 138-141). Equal amounts of texture mean equal extent. Two bricks that cover the same number of texture units at their base are the same size, with no distance estimate needed (Goldstein). Gibson held that gradients are better than classic "depth cues" because they are exact geometry, while atmospheric perspective depends on the weather.
- Contact comes first: "objects tend to be in contact with the ground" (1950, p. 77). An object's distance is "given by the optical contact of its base with the background" (p. 178). Floating objects are ambiguous. Moving the head breaks the illusion. Fixed one-eyed viewing is "a rare and unnatural kind of vision" (1979, p. 159).
- Horizon: the optical texture's density rises to infinity and sizes vanish at the horizon (1979, ch. 5, Fig. 5.1). Horizon ratio is Sedgwick 1973, not Gibson. For anything standing on the ground, the part below the horizon equals eye height, so the horizon sets relative scale without knowing distance. Gibson only noted that the horizon "cuts equally sized objects in the same proportions" (Goldstein, citing 1979, p. 178; Goldstein's citation, I did not see the passage).
- Occlusion (1979, ch. 5): hidden and unhidden surfaces swap as the observer moves, which Gibson calls the "principle of reversible occlusion". A covering edge "deletes from the array" and an uncovering edge "accretes to it". Only the surface being covered is disrupted, not the one doing the covering. Information that a ground continues behind an object is the texture being deleted at a contour. Combined with "A surface always 'bends under' an occluding edge", the point is that the same texture must be seen on both sides.
- Clutter: "the earth as such affords only standing and walking; the furniture of the earth affords all the rest". Gibson's own example of a bare plain: "a desolate environment indeed" (1979, ch. 5).
- Optic flow (Goldstein): moving straight ahead, texture flows outward everywhere except the point you are heading for, the focus of expansion. Steering means keeping it on the target. Flow and invariants specify the layout and the locomotion at once. Motion perspective is a gradient of flow speed, greatest below the observer and zero at the horizon (1947, p. 192).
- Vistas: "To go from one place to another involves the opening up of the vista ahead and closing in of the vista behind" (1979, ch. 11). This is the closest thing to a wayfinding principle for a scroll-walk.
- Affordances: a horizontal, flat, extended, rigid surface "affords support", so it is walk-on-able (ch. 8).

**Implications for a rendered environment**
- Ground: continuous (no seams), regular texture with a density gradient out to a visible horizon. Irregular texture degrades slant judgments (Gillam, via Sedgwick). Texture must be dense enough for several units to span each entity's base.
- Every entity needs visible ground contact (base on the ground, or a cast shadow). Without it, size and distance read as ambiguous.
- Eye height is the scale: pick one fixed camera height and keep entities at consistent real-world heights. The horizon then cuts all of them at the same fraction. Do not change the camera height or tilt arbitrarily.
- Occlusion: nearer entities should progressively cover and uncover farther ones as you step, and reversing the scroll must exactly undo it. Do not fade or pop entities. Occlusion needs lateral parallax, so a purely centred forward track gives it only to objects off the axis. Place entities so some are partly hidden at each stop.
- Legible flow: smooth, continuous forward motion over textured ground, with a stable focus of expansion on the destination. Turning sideways should be a continuous turn, not a cut.

**Corrections to the snippet summary**
- "Distance judged mainly from the ground" is true, but it is more specific. Gibson's claim is that no space is perceived without a continuous surface, and distance comes from where an object touches it.
- "Texture gets finer as it recedes" is incomplete. The key claim is that equal texture units mean equal extent and size. Scale stays constant, so the gradient is a measuring ruler rather than a recession effect.
- "Things hide and reveal each other as you move" is incomplete. The point is reversibility plus deletion and accretion at the edge, which also specify the continuous ground behind.
- Missing from the snippets: contact and horizon ratio (Sedgwick), eye height as scale, and the warning that a bare plain is itself a "desolate environment", so clutter matters.
- Sedgwick says Gibson's own terms were the "traditional way" and the "classical formulation", not "air theory". Goldstein uses "air theories".
