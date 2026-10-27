# Coastal and limb revision — 24 October 2026

The [26 October asset and rendering review](poet-assets-review.md) supersedes the
checkpoint counts and verification status below.

Three agent workstreams implemented the coastal geometry, implemented the poet's
limbs, and independently reviewed the resulting desktop/studio/phone captures.
Main combined their changes and corrected a striped mineral-shading experiment
after inspecting close-ups. No downloaded model or texture is included.

## Geometry and materials

`poet-limbs.js` replaces separate elbow spheres, palms, finger tubes and manuscript
plates with continuous arm fields and fused hand/manuscript fields. Fine hand
fields overlap the arm ends inside the wrists; the whole assembly is a rendering
mesh rather than a watertight fabrication model. The three extended fingers
remain distinct on both LODs, verified by front-facing silhouette raycasts.

The complete figure is 125,764 desktop / 76,561 phone triangles in one draw mesh,
within the existing separate 130k / 80k limits. The new limbs contribute
19,254 / 11,510 triangles. Mineral lighting relief uses filtered, nonperiodic
value noise on desktop; a rejected sinusoidal version created visible stripes.
The phone shader omits that normal perturbation.

`coastal-rock.js` replaces the two flattened sphere islands with original joined
granite shelves, irregular channel-facing shorelines and wet/dry surfaces.
Existing building transforms remain. Support regions follow the memorial's
upper foundation, lower pavilion and stairs, and the statue's podium.
Broken, tapered foam ribbons follow the same shoreline at sea height -1.4.
Two opacity uniforms animate the wash; they do not add moving geometry.

Each island uses three draws before world batching. Together, rock and foam
geometry totals 17,884 desktop / 5,968 phone triangles. This is a geometry/draw
budget, not a frame-rate measurement.

## Verification

65 Vitest tests, oxlint and the production build pass. New regressions exercise
the three-finger silhouette, finite/bounded rock LODs, smaller phone geometry,
and actual downward ray intersections at building support points.

Fresh studio captures include front, both angles, side, face, raised hand and
manuscript. Current 1440×900 desktop and 390×844 phone ending captures recorded
zero exceptions/console errors and no horizontal overflow. The captures are
under the workspace's `review-sculpture/`, using the reproducible review script.
Software WebGL does not establish hardware performance or normal-motion FPS.

The full native interaction run reproduced the earlier game focus-return
failure. The close lifecycle now keeps the world paused through the fade,
releases background inert state before the next frame, then hides the game,
restores focus to its explicit initiating button and resumes the world.
The subsequent desktop and phone native runs each passed all 16 checks, including
game focus return, with zero recorded errors and no horizontal overflow. Those
runs used reduced motion; they do not establish normal-motion frame rate.

## Independent visual findings

The reviewer accepted distinct raised fingers, more continuous elbow shafts,
an open island channel, supported foundations in the inspected angles and a
readable phone close approach. The striped shader artifact is absent from the
current studio images.

Remaining failures include abrupt/faceted wrist narrowing, blocky thumb contact,
a manuscript that reads as a solid bar, the cylindrical robe/chest silhouette,
generic facial forms and broad smooth rock slopes. Foam patches still resemble
detached pale scallops rather than aerated wash. The phone establishing view
crops the statue island's left edge and fine hand detail remains too small to
judge there. The inspected sculpture fidelity remains around 6/10.

The portfolio's above-9/10 objective remains active and unmet.


## 25 October structural follow-up

A new `poet-body.js` replaces the single full-height robe shell with an authored
chest, asymmetric draped leg masses, rear and side drapes, and closed cloth
ribbons. An independent geometry review caught and corrected a rear seam gap
and a smooth-normal failure on a thin phone cloth edge. A welded-edge regression
now checks closure on both body LODs. The complete figure now contains 126,959 desktop / 66,220 phone triangles in
one draw, within the unchanged 130k / 80k limits. The body contributes
32,624 / 20,120 triangles. Earlier counts above refer to the 24 October checkpoint.

The shoreline wash now uses an original, code-generated eight-pattern alpha
atlas: 512×128 RGBA on desktop and 256×64 on phones, shared between islands.
Mipmapped masks fade outer edges and patch ends while retaining rock contact.
No downloaded texture or custom wash shader was added. Current GPU/visual
results are recorded with the follow-up captures.


The head follow-up recesses the eyes inside deeper almond-shaped sockets,
adds a shallow front hairline, narrows and flattens the upper beard, and reduces
the regular beard displacement. A stronger diagonal-noise experiment was
rejected after actual face captures. Stone course offsets are now seeded per
row and seams are less prominent. The original 112/72 sampling grids remain.

Final source checks: all 66 Vitest tests, oxlint and the production build pass.
The studio, 1440×900 desktop ending, and 390×844 phone ending captures each
record zero exceptions/console errors and no horizontal overflow. These are
actual software WebGL renders; they do not prove hardware FPS. The app still
requires a proper normal-motion performance and cinematic timing review.

Independent reviewers confirm that the recessed eyes read more clearly, the
profile beard depth improves, body joins remain connected, the island channel
stays open, and desktop foam is softer. They still see a stylized sage: the tall
smooth hair mass, heavy eye sockets, straight lower eyelid planes, rounded beard,
flat torso and deep repeating garment folds remain likeness failures. Phone
rocks remain too dark/smooth and the foam follows the polygonal outline too
closely. Before the last eye refinement the inspected statue was around 6/10
and this scene's presentation around 6.5/10; those are local visual judgments,
not a whole-site or performance rating. No evidence supports the requested
above-9/10 completion claim.
