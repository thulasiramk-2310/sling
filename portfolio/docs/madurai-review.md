# Madurai craft and placement review · 1 November 2026

This pass refines the original Meenakshi Amman Temple interpretation. It does
not establish a surveyed reconstruction, photorealism, or an overall visual
score above 9/10. The independent final review rates Madurai approximately
7.3/10, with sculpture craft 6.3/10.

## Original architectural work

All four outer gateways now have nine registers. The main tower has authored
width/depth profiles, a stronger central niche hierarchy, recessed interiors,
muted polychrome figures, molded cornices and projecting foliate ornament.
Miniature shrine cells fit below the following register instead of hiding its
figures' legs. Gray granite uses physically scaled UVs without multiplying a
second brown tint over the texture.

The sala crest has closed decorated ends, molded borders, raised rosettes,
front/back foliate panels and nine turned kalashas. Its geometry has thickness;
the carvings are not drawings pasted over flat rectangles. The original stucco
texture provides aggregate, sheltered grime and restrained rain streaks only.

The [Madurai district temple page](https://madurai.nic.in/tourist-place/sri-meenakshi-sundareswarar-temple/)
and its linked South Tower photograph informed the silhouette and ornament
hierarchy. The [Tamil Nadu municipality description](https://www.tnurbantree.tn.gov.in/melur/places-of-interest/)
supports the four nine-storey outer towers. Heights and spacing in the journey
are deliberately compressed; they are not claimed as real measurements.
No open license for the district photograph was verified. It remains outside
the application and release archives, for reference only. Every rendered
surface and mesh in this revision is original code.

## Physical defects corrected

Actual raycasts found the terrain rising as much as 0.971m through the approach,
hiding the granite slabs. The ground is now graded in the compound's own basis,
below its courtyard floor and forecourt. Additional terrain columns bound the
back of the compound before the much larger horizon triangles. All 819 sampled
points across the built terrain beneath the compound/forecourt are below the
floor, with maximum terrain elevation approximately -0.075m.

The rectangular forecourt also stopped 7.6–11.3m short of the curved road. A
modeled approach now samples the actual road edge, meets its 0.04m deck height
and overlaps the instanced paving. It replaces the transverse front curb;
it does not extend a rectangular slab across the curved asphalt. Tests inspect
the rendered road/connector/slab geometry, including their overlap, rather
than only checking the placement formula.

Grading is limited to the temple parcel. The later bridge seabed remains below
-5.9m in the sampled crossing. The broad neighboring town parcel is excluded:
part of its authored extension reaches the bridge coast. That neighborhood's
unsupported extension remains an art/layout issue, rather than justification
for filling the ocean back in.

An earlier approach timing change exposed a projection defect. At progress
.700, the auto crossed near the camera plane while vehicle framing was still
active. Its projected X became 180.575 in normalized device coordinates,
producing a roughly 64,986px horizontal view offset. Raycasting proved the
resulting screen-centre ray hit the road, causing the diagonal close-up bands.

Vehicle framing now fades before extreme projected displacement or near/behind
camera crossings. Madurai's look direction leads its lateral camera movement,
keeping the main tower out of the desktop reading column. Both portrait and
desktop crossings are regression-tested, alongside existing stop composition,
camera continuity and vehicle tracking checks. The generic guard also affects
other sculpture entries/exits; these are included in the full browser route.

## Geometry budgets

Repeated figures, niche frames and foliate ornaments use explicit projected-size
LODs, updated once from the visitor camera and reused by shadow/reflection
passes. Placement, paint, pose and physical volume remain intact across changes.

- Seated reliefs: 262 desktop / 214 phone near triangles, 128 intermediate,
  54 distant. Facades share at most four instance batches.
- Open kudu frames: 644 / 172 / 68 triangles per detail level. The opening stays
  physically open at every level.
- Foliate scrolls: 240 / 80 / 24 triangles. They retain closed solids and an
  identical outer envelope; there is no billboard substitute.
- Intermediate standing guardian: 310 triangles instead of 534, with the
  original close figure retained. Jewelry smaller than a pixel is omitted only
  in the intermediate geometry.

The complete phone reading view now submits 777,450 primary triangles versus
1,115,556 in the previous accepted build, approximately 30.3% fewer. That
comparison includes the newly authored nine-register assembly, not only the LOD
change. Draw submissions rise from 234 to 302. These are geometry reductions,
not measured FPS gains. Actual browser counters and the software renderer
identity are recorded separately in the verification reports.

## Remaining craft gap

The facade still repeats three simplified guardian studies, and broad planar
surfaces remain between them. Faces, anatomy, cloth, narrative groupings and
continuous sculpted friezes need substantial further artwork. The surrounding
town, palm silhouettes and ground transitions remain simpler than the reference.
Phone detail captions now use light text with a restrained shadow, but this
visual improvement is not a claim of formal contrast certification.

The final reviewer confirmed the approach/caption collision and road magnification
are resolved. Other entries still need composition work: Nandi's entry is
ground-dominant, and the PyTorch roadside sign overlaps supporting caption text
at the elephant-entry frame on both widths. The latter is a concrete remaining
readability defect, not an accepted premium composition.

The supplied reference MP4 is absent from its original Downloads path. Existing
extracted reference sheets were available; this pass does not claim a new full
viewing of the recording. Physical-phone testing, sound quality by listening
and capable hardware-GPU performance remain unverified.

## Final verification

130 tests across 28 files, oxlint and the production build pass. The isolated
production browser passes 42 native interaction checks, 29 camera poses plus
the loader at each width, four no-JavaScript/no-WebGL fallback checks and the
measured poor-rendering handoff. Console/shader exception lists are empty.
The normal-motion sample renders 23 frames over 20.0005 seconds (1.15 FPS on
SwiftShader), so it does not meet the interactive target on this host. The
requested hardware-GPU 60 FPS remains unverified. Source/build hashes and
actual reports are bundled in `verification/`.

The subsequent skills-caption patch resolves the supporting-text/read-link
contrast defect with a stronger edge wash. The roadside sign remains in the
scene; arranging it outside the caption would further improve composition.
Six production views were checked across desktop and phone widths.
