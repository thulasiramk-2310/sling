# Original sculpture assets and coastal rendering — 26 October 2026

The Thiruvalluvar figure loads original Blender-finished GLBs, with separate
desktop and phone geometry. This iteration narrows and offsets the waist, replaces
the two cylindrical lower drapes with one wrapped garment, restores unequal curved
folds around its knee, shortens the broad hair cap and reshapes the beard into a
tapered carved mass. The solid pedestal, recessed openings, continuous hands and
scroll-controlled close approach remain. This is a stylized study; realistic
likeness and the portfolio's above-9/10 visual target remain unmet.

## Assets and loading

| Shipped asset | Triangles | Bytes |
| --- | ---: | ---: |
| `public/models/poet-carving.glb` | 109,450 | 1,978,680 |
| `public/models/poet-carving-low.glb` | 54,724 | 993,320 |

`public/models/poet-provenance.json` records tool settings, hashes and the source
geometry chain. The procedural source contains 121,824 / 63,109 triangles. Current
source hashes match the exported candidates and runtime fallback. The earlier
material-refactor byte-equivalence proof is explicitly historical; it does not
describe the revised body/head geometry. Both prior and current asset hashes are
recorded separately.

The `poet-figure` manifest entry preserves the authored origin and reuses the
original granite shader. Successful loading avoids constructing the procedural
figure. Missing files, unavailable/null manifests and individual load failures
construct the fallback. Existing landmark centering and scaling remain covered
by tests. Models are ready before the loading screen releases the world.

Geometry was authored in this repository. District photographs informed the
study; they are not bundled textures. Blender 4.5.9 LTS performed voxel union at
0.025 m, restrained smoothing and bounded decimation, with 60-degree normal
creases. Both outputs passed finite/winding/collapse checks and Blender's
closed-manifold check. Finger-gap raycasts inspect 18 shaft heights, and compare
against the source. An earlier candidate passed a fingertip-only check but
bridged the shafts; it was rejected. The shipped candidates preserve all tested
gaps, with a minimum sampled width around 0.142 m. The current Blender outputs
also pass closure and winding gates. Head changes preserve the original scale:
the revised finished figure is about 28.02 m tall above its authored foot origin.

Actual studio review rejected a smooth round beard candidate. Its replacement
has a flatter tapered outline and visible unequal locks. A second body candidate
removed the separate pipes but lost too much fold relief; broad curved gathers
were restored on the shared wrap and front fall. Granite course contrast is lower,
especially across the face. These are local improvements, not a realistic-likeness
or whole-portfolio quality approval.

Reproduce candidates from inside `portfolio/` with a working Blender 4.5+ binary:

```sh
node scripts/export-poet.mjs --out-dir /tmp/ram-poet-build
blender --background --factory-startup --threads 4 --python scripts/finish-poet.py -- --input /tmp/ram-poet-build/poet-source.glb --output /tmp/ram-poet-build/poet-finished.glb --voxel .025 --triangles 110000
blender --background --factory-startup --threads 2 --python scripts/finish-poet.py -- --input /tmp/ram-poet-build/poet-source-low.glb --output /tmp/ram-poet-build/poet-finished-low.glb --voxel .025 --triangles 55000
node scripts/export-poet.mjs --verify /tmp/ram-poet-build/poet-finished.glb --reference /tmp/ram-poet-build/poet-source.glb
node scripts/export-poet.mjs --verify /tmp/ram-poet-build/poet-finished-low.glb --reference /tmp/ram-poet-build/poet-source-low.glb --low
```

The system Blender on the review machine lacked a SYCL library. The verified
runs used an isolated official 4.5.9 LTS build, with its published SHA-256 checked.
The executable is a development tool and is not bundled in the source ZIP.
Candidates still require close-up visual review before replacing shipped assets.

## Rendering corrections

The final dawn has a cool coastal atmosphere and a raking warm sun. Its direction
now illuminates the monument's front, rather than leaving it entirely dependent
on fill. Fog, image-based light and fill are restrained during this finale.
Earlier timeline keys remain outside that palette treatment.

The sky is painted before its environment map is baked, including first render
and explicit camera seeks. The previous ordering could bake white or the previous
destination's sky. Browser checks compare the actual bake input with the current
destination on every reviewed desktop pose.

The sky uses a world-space view direction and far-depth background projection,
so the water reflection's oblique clip plane cannot cut a circular boundary
through it. Lower sky and fog colors agree in the renderer's output space.
The final ascent also retains distant water inside its far plane. A small bottom
fade supports travel controls; contact color follows the contact interface's
visibility rather than the later chapter-stage boundary.

A separate angular dark patch on the final ocean was isolated with same-camera
shadow, reflection, AO and bloom comparisons. It survived disabling shadows,
reflections or bloom, and disappeared with AO disabled. The opaque ocean had been
hidden from AO's normal/depth pass, exposing submerged terrain to its composite.
Water now writes that depth; its reflection callback skips override-material
passes. Actual post-fix captures retain AO without the angular patch.

The frame meter now counts visible multi-second stalls and excludes hidden-tab
pauses. A recorded software-WebGL run contained an 8.9-second interval while the
old meter retained about 33 FPS and left all effects enabled. After correction,
the measured rate fell below one frame/second and AO switched off. This proves
the adaptation responds; it is not a hardware FPS or overall performance result.
`scripts/review-motion.mjs` reproduces the normal-motion cadence probe.

## Verification and remaining work

91 Vitest tests, oxlint and the production build pass at this checkpoint. Actual
1440×900 and 390×844 captures cover the opening, bridge, introduction, all six
destinations and the final ascent. The configured desktop/phone GLBs returned
HTTP 200 and were accepted by the model loader. Current first-frame environment
inputs match the destination; inspected captures report zero shader/console
errors and no horizontal overflow.

Final native interaction validation passed all 32 checks across desktop and phone,
including sequential scroll stops, reading holds, project interactions, focus
return, language, game controls and actual WebGL context loss. These native runs
use reduced motion and low render quality to test input; separate static desktop
captures cover the full effect stack. They do not establish normal-motion timing
or hardware FPS. Contact contrast was independently accepted at both ending
transitions and both widths.

A shared browser renderer crashed when starting the phone capture after the
desktop route. A fresh browser completed all phone poses. One subsequent native
desktop run failed its final-stop assertion; fresh desktop and phone runs then
passed all 16 checks each without navigation-source changes. The harness now
writes per-step scroll/stop/frame state on any recurrence. The earlier assertion's
cause remains unconfirmed; the rerun does not establish that all timing flakiness
is resolved.

Likeness, cloth construction, manuscript shape, phone water detail and wider scene
composition still need work. The earlier inspected ending was around 6.5–7/10;
the current local revisions do not establish the requested above-9/10 standard.
Independent review accepts the current model as a local improvement on both
widths: the wrapped robe, compact beard and platform contact are readable. The
actual camera lighting still flattens its cloth relief; brows, eyes and hair
remain simplified. No new obvious clipping or disconnected joins were found in
those reviewed views.

Rendering diagnostics also found excessive distant detail: the desktop opening
submits about 6.83 million estimated primary-pass triangles and 22.58 million
across renderer passes. Far Madurai guardian instances alone contribute about
3.23 million primary triangles despite approximately 2.4-pixel figure height.
Global palms and terrace bulls added further avoidable work. Palms now use 90 m
spatial bins with independently computed bounds. Exact transform/color
fingerprints preserve all 260 desktop / 90 phone placements. Guardians retain
their three original poses, colors and placements, with original near/mid meshes
and a 138-triangle far silhouette. Selection uses projected CSS height, with
hysteresis and one explicit update from the main camera before any render passes.
Terrace bulls preserve all 119 transforms; small roof ornaments use original
268/112-triangle proxies at a distance. Hero Nandi remains unchanged.

The first guardian partition experiment reduced geometry but raised draw calls
sharply. It was revised to facade × pose, capped at 12 meshes per four-sided
gateway. Counts, colors, transforms, LOD transitions, hysteresis, batch preservation
and actual palm frustum culling have regression coverage. These geometry/counter
observations are not measured hardware frame rates. Further scene-budget and
art-direction work remains necessary.

| Reviewed pose | Primary triangles before → after | Renderer calls before → after |
| --- | ---: | ---: |
| Desktop opening | 6,825,926 → 2,246,098 (−67.1%) | 1,848 → 2,329 |
| Desktop Madurai | 4,658,412 → 1,971,532 (−57.7%) | 1,144 → 1,375 |
| Phone opening | 479,094 → 439,094 (−8.3%) | 148 → 190 |
| Phone Madurai | 1,356,660 → 1,212,660 (−10.6%) | 204 → 229 |

Final facade grouping reduces the first experiment's excessive calls (2,935 at
desktop opening; 1,944 at Madurai), but calls remain above baseline. The tradeoff
is therefore explicit: much less desktop triangle submission, more draw calls,
and no demonstrated hardware frame-rate gain. The phone temple budget remains
too high. Full-route final reports are `desktop-journey-final-results.json` and
`phone-journey-final-results.json` in the workspace's `review-sculpture/` folder.

The supplied checkout has no Git metadata. Delivery remains the source ZIP and
verified patch; no commit or push is claimed.
