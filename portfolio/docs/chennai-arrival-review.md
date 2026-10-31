# Chennai arrival craft review · 31 October 2026

The opening now uses the real parked vehicle transform throughout the camera,
character and departure systems. It remains an original architectural
interpretation; this review does not establish photorealism or the requested
whole-experience visual score above 9/10.

## Changes

- Central station has modeled open arcades, recessed verandahs, projecting square
  corner towers, paired tower openings, clock faces and profiled roofs. Brick UVs
  use a consistent physical scale. The model is 39,958 desktop / 24,134 phone
  triangles in 14 draws before scene batching. Historic photographs from the
  [Chennai Corporation](https://chennaicorporation.gov.in/gcc/about-GCC/about-chennai/chennai-that-was-madras/)
  informed its recognizable features; no photograph is used as a rendering asset.
- A curved stone apron joins the rectangular square to the actual footway.
  The old parked position lay outside the square at local z≈50.6, exposing sand.
  A dropped driveway now crosses the raised walk and meets the asphalt surface.
  Road construction and vehicle support share the 0.04m deck height.
  The square ends before the curved street; its former transverse curb could
  intersect a rear tire after the merge. Flush stone headers bridge the inner
  edge, with overlapping block joints. Chassis height, pitch and roll follow
  all three wheel supports. An independent dense check of 24,003 actual tire
  vertex rays across the full departure found no support holes and a maximum
  surface discrepancy of 1.788cm. Rotated tire bounding boxes were excluded
  from this measurement because their fictitious corners overstate penetration.
- Shaded frontage wings frame the square, with approach-facing corner bays,
  timber shutters and recessed porticos. These are authored scenery, not a
  surveyed claim about the station's surroundings. They reuse the existing
  original street module: 24,768 triangles / 9 draws before scene batching.
- Six open branching shade trees replace opaque capsule hedges. Their crowns
  contain individual ridged leaves and light gaps: 75,456 triangles desktop /
  19,296 phone, two draws before scene batching. This adds geometry for a visible
  improvement in foliage; it is not a free performance optimization.
- The camera reaches a medium view before Ram's two-metre arrival walk. The
  walking phase derives from distance, with planted stance feet and a settled
  reduced-motion pose. Clothing profiles use bounded smooth interpolation and
  independent cap normals. The relaxed standing pose replaces the straight
  mannequin stance. The character is an interpretation, not a scanned likeness.
- The auto parks at the actual tangent of its pull-out, giving a three-quarter
  presentation without rotating it independently during departure. The outside
  character and seated driver exchange at the same boarding boundary.
- Three original baked cloud formations replace one repeated silhouette. Their
  borders are transparent and their alpha shapes distinct and deterministic.
  The smaller maps together use fewer texels/density samples than the old map.
  There is no runtime full-screen ray march.
- Original studio light cards provide reflection lighting to the desktop loader's
  paint and metal. The environment is baked once and released on exit; phones
  retain the cheaper lighting path.

## Phone rendering budget

Paired actual 390×844 WebGL captures before/after the phone viewing-distance
change show the following primary-pass submissions. This comparison held the
scene and authored pose constant; it is not an FPS benchmark.

| Pose | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Opening sky | 546,540 | 355,448 | 35.0% |
| Under bridge | 781,450 | 380,910 | 51.3% |
| Boarding seat | 1,282,320 | 442,208 | 65.5% |
| Departure | 1,051,460 | 404,052 | 61.6% |

All six reading views and the final ascent remained in frame. Most corresponding
images differ by less than 0.15 mean absolute channel value on a 0–255 scale;
the under-bridge frame differs by 1.68. These pixel comparisons are corroboration,
not a substitute for visual inspection. The full paired submission report is
`verification/phone-distance-comparison.json`.

At this arrival pass, Madurai's phone reading pose submitted about 1.12 million
primary triangles. The later [Madurai revision](madurai-review.md) reduces that
to about 777,450 while adding nine-register gateways and crest ornament. Draw
submissions rise from 234 to 302; this is not evidence of an FPS gain. Hardware-GPU
performance remains unverified.

## Remaining art work

The station is more legible, the auto is grounded and the walk is visible.
The square still needs stronger surface variation and a more deliberate urban
composition. The figure, vehicle upholstery and boarding choreography remain
simpler than the reference. The sky needs a stronger directional light/cloud
composition. Other temple and sculpture views still require independent visual
refinement; the local poet v6 acceptance does not establish an overall 9/10.

The supplied reference MP4 was absent from its original Downloads path during
this pass. Existing extracted reference contact sheets were available for
comparison; this pass does not claim a fresh viewing of the full recording.
